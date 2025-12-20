import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { computeServiceMinutes, type TimeSequence } from '@/lib/time/service';
import type { Service } from '@/types/service';
import type { Employee } from '@/types/employee';

type Params = { params: { folderId: string; date: string; employeeId: string } };

const isValidDateParam = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const employeeRef = (folderId: string, date: string, employeeId: string) =>
  getAdminDb()
    .collection('folders')
    .doc(folderId)
    .collection('days')
    .doc(date)
    .collection('employees')
    .doc(employeeId);

const servicesRef = (folderId: string, date: string, employeeId: string) =>
  employeeRef(folderId, date, employeeId).collection('services');

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
    const times: TimeSequence = {
      t1In: typeof body?.t1In === 'string' ? body.t1In : '',
      t1Out: typeof body?.t1Out === 'string' ? body.t1Out : '',
      t2In: typeof body?.t2In === 'string' ? body.t2In : '',
      t2Out: typeof body?.t2Out === 'string' ? body.t2Out : '',
    };

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

    const { minutes, errors, normalizedTimes } = computeServiceMinutes(times);
    if (errors.length || minutes === null) {
      return NextResponse.json({ error: errors.join(' ') || 'Horários inválidos.' }, { status: 400 });
    }

    const existing = await servicesRef(folder.id, date, employeeId).get();
    const currentSum = existing.docs.reduce((acc, doc) => acc + (doc.data().totalMinutes || 0), 0);

    if (currentSum + minutes > employeeData.totalMinutes) {
      return NextResponse.json({ error: 'Soma dos serviços excede o horário total do funcionário.' }, { status: 400 });
    }

    const now = Date.now();
    const docRef = await servicesRef(folder.id, date, employeeId).add({
      osId,
      description,
      ...normalizedTimes,
      totalMinutes: minutes,
      createdAt: now,
      updatedAt: now,
    });

    const service: Service = {
      id: docRef.id,
      osId,
      description,
      ...normalizedTimes,
      totalMinutes: minutes,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar serviço.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
