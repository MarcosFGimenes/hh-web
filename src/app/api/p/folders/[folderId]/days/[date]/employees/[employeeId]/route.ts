import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Employee } from '@/types/employee';

type Params = { params: { folderId: string; date: string; employeeId: string } };

const isValidDateParam = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const docRef = (folderId: string, date: string, employeeId: string) =>
  getAdminDb()
    .collection('folders')
    .doc(folderId)
    .collection('days')
    .doc(date)
    .collection('employees')
    .doc(employeeId);

export async function PATCH(request: Request, { params }: Params) {
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
    const updates: Partial<Employee> = {};

    if (typeof body?.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body?.totalMinutes === 'number' && Number.isFinite(body.totalMinutes) && body.totalMinutes >= 0) {
      updates.totalMinutes = body.totalMinutes;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'Nenhuma atualização enviada.' }, { status: 400 });
    }

    updates.updatedAt = Date.now();

    const ref = docRef(folder.id, date, employeeId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Funcionário não encontrado.' }, { status: 404 });
    }

    await ref.update(updates);
    const data = (await ref.get()).data() as Omit<Employee, 'id'>;

    return NextResponse.json({ employee: { id: employeeId, ...data } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar funcionário.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
