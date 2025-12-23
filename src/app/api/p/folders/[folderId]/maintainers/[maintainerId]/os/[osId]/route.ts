import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { validateShiftPair, normalizeTime } from '@/lib/time/base';

type Params = { params: { folderId: string; maintainerId: string; osId: string } };

const osDocRef = (folderId: string, maintainerId: string, osId: string) =>
  getAdminDb()
    .collection('folders')
    .doc(folderId)
    .collection('maintainers')
    .doc(maintainerId)
    .collection('os')
    .doc(osId);

export async function PATCH(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const date = url.searchParams.get('date') || '';
    const { folderId, maintainerId, osId } = params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data do apontamento é obrigatória.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const body = await request.json();
    const field = typeof body?.field === 'string' ? body.field : '';
    const value = typeof body?.value === 'string' ? body.value : '';

    if (!['startTime', 'endTime'].includes(field)) {
      return NextResponse.json({ error: 'Campo inválido para atualização.' }, { status: 400 });
    }

    const normalizedValue = normalizeTime(value);
    if (!normalizedValue) {
      return NextResponse.json({ error: 'Horário é obrigatório.' }, { status: 400 });
    }

    const docRef = osDocRef(folder.id, maintainerId, osId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'O.S. não encontrada.' }, { status: 404 });
    }

    const maintainerDoc = await getAdminDb()
      .collection('folders')
      .doc(folder.id)
      .collection('maintainers')
      .doc(maintainerId)
      .get();
    const maintainerDate = (maintainerDoc.data()?.date as string | undefined) || '';
    if (date && maintainerDate && maintainerDate !== date) {
      return NextResponse.json({ error: 'Apontamento não pertence a esta data.' }, { status: 403 });
    }

    const data = snapshot.data() || {};
    const nextStart = field === 'startTime' ? normalizedValue : (data.startTime as string | undefined | null) || '';
    const nextEnd = field === 'endTime' ? normalizedValue : (data.endTime as string | undefined | null) || '';

    const validation = validateShiftPair(nextStart, nextEnd);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message || 'Horário inválido.' }, { status: 400 });
    }

    await docRef.update({ [field]: normalizedValue, updatedAt: Date.now() });
    const updated = await docRef.get();
    return NextResponse.json({ os: { id: updated.id, ...(updated.data() || {}) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar horário da O.S.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
