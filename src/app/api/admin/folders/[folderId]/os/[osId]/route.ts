import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getCompanyFolder } from '@/lib/firebase/adminFolders';
import type { ServiceOrder } from '@/types/os';

type Params = { params: { folderId: string; osId: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { companyId } = await getAdminFromRequest();
    const { folderId, osId } = params;
    const body = await request.json();

    const updates: Partial<ServiceOrder> = {};

    if (typeof body?.osCode === 'string' && body.osCode.trim()) updates.osCode = body.osCode.trim();
    if (typeof body?.tag === 'string' && body.tag.trim()) updates.tag = body.tag.trim();
    if (typeof body?.machineName === 'string' && body.machineName.trim()) updates.machineName = body.machineName.trim();
    if (typeof body?.description === 'string' && body.description.trim()) updates.description = body.description.trim();

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'Nenhuma atualização enviada.' }, { status: 400 });
    }

    updates.updatedAt = Date.now();

    const folder = await getCompanyFolder(folderId, companyId);
    if (!folder) {
      return NextResponse.json({ error: 'O.S. não encontrada.' }, { status: 404 });
    }

    const ref = folder.docRef.collection('os').doc(osId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: 'O.S. não encontrada.' }, { status: 404 });
    }

    await ref.update(updates);
    const data = (await ref.get()).data() as Omit<ServiceOrder, 'id'>;

    return NextResponse.json({ order: { id: osId, ...data } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar O.S.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { companyId } = await getAdminFromRequest();
    const { folderId, osId } = params;

    const folder = await getCompanyFolder(folderId, companyId);
    if (!folder) {
      return NextResponse.json({ error: 'O.S. não encontrada.' }, { status: 404 });
    }

    const ref = folder.docRef.collection('os').doc(osId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'O.S. não encontrada.' }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir O.S.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
