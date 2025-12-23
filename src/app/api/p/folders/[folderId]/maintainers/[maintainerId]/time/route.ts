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
    const { folderId, maintainerId } = params;

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const body = await request.json();
    const startRaw = typeof body?.startTime === 'string' ? body.startTime : '';
    const endRaw = typeof body?.endTime === 'string' ? body.endTime : '';
    const shiftId = typeof body?.shiftId === 'string' ? body.shiftId : '';
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

    const existingShifts = Array.isArray(snapshot.data()?.shifts)
      ? (snapshot.data()?.shifts as { id: string; startTime: string; endTime: string; createdAt?: number }[])
      : [];

    const nextShiftId =
      shiftId || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`);

    const updatedShifts = existingShifts
      .filter((shift) => shift.id !== shiftId || !shiftId)
      .concat([{ id: nextShiftId, startTime, endTime, createdAt: Date.now() }]);

    const hasOverlap = updatedShifts.some((shift, index) =>
      updatedShifts.some(
        (other, otherIndex) =>
          index !== otherIndex &&
          shift.startTime < (other.endTime || '') &&
          other.startTime < (shift.endTime || '')
      )
    );

    if (hasOverlap) {
      return NextResponse.json({ error: 'Horários não podem se sobrepor para o mesmo mantenedor.' }, { status: 400 });
    }

    const sortedShifts = [...updatedShifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const primaryStart = sortedShifts[0]?.startTime ?? startTime;
    const primaryEnd = sortedShifts[sortedShifts.length - 1]?.endTime ?? endTime;

    await ref.update({ startTime: primaryStart, endTime: primaryEnd, shifts: sortedShifts, updatedAt: Date.now() });
    const updated = await ref.get();
    return NextResponse.json({ maintainer: { id: updated.id, ...(updated.data() || {}) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar horário do mantenedor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
