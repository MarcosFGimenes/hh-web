import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { adminDb } from '@/lib/firebase/admin';
import type { Service } from '@/types/service';
import type { Employee } from '@/types/employee';

type Params = { params: { folderId: string; date: string; employeeId: string; serviceId: string } };

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

const getEmployee = async (folderId: string, date: string, employeeId: string) => {
  const snapshot = await employeeRef(folderId, date, employeeId).get();
  if (!snapshot.exists) return null;
  return snapshot.data() as Omit<Employee, 'id'>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, date, employeeId, serviceId } = params;

    if (!isValidDateParam(date)) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Partial<Service> = {};

    if (typeof body?.osId === 'string' && body.osId.trim()) updates.osId = body.osId.trim();
    if (typeof body?.description === 'string' && body.description.trim()) updates.description = body.description.trim();
    if (typeof body?.t1In === 'string') updates.t1In = body.t1In;
    if (typeof body?.t1Out === 'string') updates.t1Out = body.t1Out;
    if (typeof body?.t2In === 'string') updates.t2In = body.t2In;
    if (typeof body?.t2Out === 'string') updates.t2Out = body.t2Out;

    const needsRecalc = 't1In' in updates || 't1Out' in updates || 't2In' in updates || 't2Out' in updates;

    const ref = servicesRef(folder.id, date, employeeId).doc(serviceId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 });
    }

    const currentData = snapshot.data() as Omit<Service, 'id'>;
    const merged = { ...currentData, ...updates };

    if (!merged.osId || !merged.description) {
      return NextResponse.json({ error: 'O.S e descrição são obrigatórias.' }, { status: 400 });
    }

    const employeeData = await getEmployee(folder.id, date, employeeId);
    if (!employeeData) {
      return NextResponse.json({ error: 'Funcionário não encontrado.' }, { status: 404 });
    }
    if (employeeData.totalMinutes === null || employeeData.totalMinutes <= 0) {
      return NextResponse.json({ error: 'Defina o horário total do funcionário antes de atualizar serviços.' }, { status: 400 });
    }

    const newTotal = needsRecalc
      ? computeServiceMinutes(merged.t1In, merged.t1Out, merged.t2In, merged.t2Out)
      : merged.totalMinutes;

    const existing = await servicesRef(folder.id, date, employeeId).get();
    const currentSum = existing.docs.reduce((acc, doc) => {
      const data = doc.data() as Omit<Service, 'id'>;
      return doc.id === serviceId ? acc : acc + (data.totalMinutes || 0);
    }, 0);

    if (currentSum + newTotal > employeeData.totalMinutes) {
      return NextResponse.json({ error: 'Soma dos serviços excede o horário total do funcionário.' }, { status: 400 });
    }

    updates.totalMinutes = newTotal;
    updates.updatedAt = Date.now();

    await ref.update(updates);
    const updatedData = (await ref.get()).data() as Omit<Service, 'id'>;
    return NextResponse.json({ service: { id: serviceId, ...updatedData } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar serviço.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, date, employeeId, serviceId } = params;

    if (!isValidDateParam(date)) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const ref = servicesRef(folder.id, date, employeeId).doc(serviceId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir serviço.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
