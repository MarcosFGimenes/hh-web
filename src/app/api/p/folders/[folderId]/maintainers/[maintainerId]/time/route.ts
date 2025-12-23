import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { validateShiftPair, normalizeTime } from '@/lib/time/base';

type Params = { params: { folderId: string; maintainerId: string } };

const maintainerRef = (folderId: string, maintainerId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('maintainers').doc(maintainerId);

export async function POST(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const date = url.searchParams.get('date') || '';
    const { folderId, maintainerId } = params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data do apontamento é obrigatória.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const body = await request.json();
    const startRaw = typeof body?.startTime === 'string' ? body.startTime : '';
    const endRaw = typeof body?.endTime === 'string' ? body.endTime : '';
    const startTime = normalizeTime(startRaw);
    const endTime = normalizeTime(endRaw);

    const validation = validateShiftPair(startTime, endTime);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message || 'Horário inválido.' }, { status: 400 });
    }

    const ref = maintainerRef(folder.id, maintainerId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Mantenedor não encontrado.' }, { status: 404 });
    }

    const maintainerDate = (snapshot.data()?.date as string | undefined) || '';
    if (date && maintainerDate && maintainerDate !== date) {
      return NextResponse.json({ error: 'Apontamento não pertence a esta data.' }, { status: 403 });
    }

    const shiftId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const existingShifts = Array.isArray(snapshot.data()?.shifts)
      ? (snapshot.data()?.shifts as { id: string; startTime: string; endTime: string; createdAt?: number }[])
      : [];

    const updatedShifts = [...existingShifts, { id: shiftId, startTime, endTime, createdAt: Date.now() }];

    await ref.update({
      startTime,
      endTime,
      shifts: updatedShifts,
      updatedAt: Date.now(),
      date: maintainerDate || date,
    });
    const updated = await ref.get();
    return NextResponse.json({ maintainer: { id: updated.id, ...(updated.data() || {}) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar horário do mantenedor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
