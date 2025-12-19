import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { adminDb } from '@/lib/firebase/admin';
import type { Service } from '@/types/service';
import type { Employee } from '@/types/employee';

type Params = { params: { folderId: string; date: string; employeeId: string } };

const isValidDateParam = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const employeeRef = (folderId: string, date: string, employeeId: string) =>
  adminDb.collection('folders').doc(folderId).collection('days').doc(date).collection('employees').doc(employeeId);

const servicesRef = (folderId: string, date: string, employeeId: string) =>
  employeeRef(folderId, date, employeeId).collection('services');

const parseTime = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const computeServiceMinutes = (t1In: string, t1Out: string, t2In: string, t2Out: string) => {
  const p1 = parseTime(t1In);
  const p2 = parseTime(t1Out);
  const p3 = parseTime(t2In);
  const p4 = parseTime(t2Out);

  if (p1 === null || p2 === null || p1 > p2) throw new Error('Horário inválido no primeiro período.');
  if ((t2In || t2Out) && (p3 === null || p4 === null || p3 > p4)) {
    throw new Error('Horário inválido no segundo período.');
  }

  const first = p2 - p1;
  const second = p3 !== null && p4 !== null ? p4 - p3 : 0;
  const total = first + second;

  if (total <= 0) throw new Error('Total do serviço precisa ser maior que zero.');
  return total;
};

const mapService = (doc: FirebaseFirestore.QueryDocumentSnapshot): Service => {
  const data = doc.data() as Omit<Service, 'id'>;
  return { id: doc.id, ...data };
};

const getEmployee = async (folderId: string, date: string, employeeId: string) => {
  const snapshot = await employeeRef(folderId, date, employeeId).get();
  if (!snapshot.exists) return null;
  return snapshot.data() as Omit<Employee, 'id'>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, date, employeeId } = params;

    if (!isValidDateParam(date)) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const snapshot = await servicesRef(folder.id, date, employeeId).orderBy('createdAt', 'desc').get();
    const services = snapshot.docs.map(mapService);

    return NextResponse.json({ services });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar serviços.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, date, employeeId } = params;

    if (!isValidDateParam(date)) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const body = await request.json();
    const osId = typeof body?.osId === 'string' ? body.osId.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const t1In = typeof body?.t1In === 'string' ? body.t1In : '';
    const t1Out = typeof body?.t1Out === 'string' ? body.t1Out : '';
    const t2In = typeof body?.t2In === 'string' ? body.t2In : '';
    const t2Out = typeof body?.t2Out === 'string' ? body.t2Out : '';

    if (!osId || !description) {
      return NextResponse.json({ error: 'O.S e descrição são obrigatórias.' }, { status: 400 });
    }

    const employeeData = await getEmployee(folder.id, date, employeeId);
    if (!employeeData) {
      return NextResponse.json({ error: 'Funcionário não encontrado.' }, { status: 404 });
    }
    if (employeeData.totalMinutes === null || employeeData.totalMinutes <= 0) {
      return NextResponse.json({ error: 'Defina o horário total do funcionário antes de lançar serviços.' }, { status: 400 });
    }

    const totalMinutes = computeServiceMinutes(t1In, t1Out, t2In, t2Out);

    const existing = await servicesRef(folder.id, date, employeeId).get();
    const currentSum = existing.docs.reduce((acc, doc) => acc + (doc.data().totalMinutes || 0), 0);

    if (currentSum + totalMinutes > employeeData.totalMinutes) {
      return NextResponse.json({ error: 'Soma dos serviços excede o horário total do funcionário.' }, { status: 400 });
    }

    const now = Date.now();
    const docRef = await servicesRef(folder.id, date, employeeId).add({
      osId,
      description,
      t1In,
      t1Out,
      t2In,
      t2Out,
      totalMinutes,
      createdAt: now,
      updatedAt: now,
    });

    const service: Service = {
      id: docRef.id,
      osId,
      description,
      t1In,
      t1Out,
      t2In,
      t2Out,
      totalMinutes,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar serviço.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
