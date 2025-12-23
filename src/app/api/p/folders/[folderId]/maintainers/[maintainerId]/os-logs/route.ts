import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { isValidTimeHHMM, normalizeTime, parseTimeToMinutes } from '@/lib/time/base';
import type { MaintainerOsLog } from '@/types/maintainerOsLog';

type Params = { params: { folderId: string; maintainerId: string } };

const maintainerRef = (folderId: string, maintainerId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('maintainers').doc(maintainerId);

const osLogsCollectionRef = (folderId: string, maintainerId: string) =>
  maintainerRef(folderId, maintainerId).collection('osLogs');

const osCollectionRef = (folderId: string) => getAdminDb().collection('folders').doc(folderId).collection('os');

type Interval = { startTime: string; endTime: string };

const normalizeInterval = (interval: Interval): { interval?: Interval; error?: string } => {
  const startTime = normalizeTime(interval.startTime);
  const endTime = normalizeTime(interval.endTime);

  if (!startTime || !endTime) {
    return { error: 'Horários são obrigatórios (HH:MM).' };
  }

  if (!isValidTimeHHMM(startTime) || !isValidTimeHHMM(endTime)) {
    return { error: 'Horário inválido. Use HH:MM.' };
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
    return { error: 'Entrada deve ser menor que saída.' };
  }

  return { interval: { startTime, endTime } };
};

const hasOverlap = (a: Interval, b: Interval) => {
  const aStart = parseTimeToMinutes(a.startTime) ?? 0;
  const aEnd = parseTimeToMinutes(a.endTime) ?? 0;
  const bStart = parseTimeToMinutes(b.startTime) ?? 0;
  const bEnd = parseTimeToMinutes(b.endTime) ?? 0;
  return aStart < bEnd && aEnd > bStart;
};

const isInsideAvailability = (interval: Interval, shifts: Array<{ startTime: string; endTime: string }>) => {
  if (!shifts.length) return true;
  const start = parseTimeToMinutes(interval.startTime);
  const end = parseTimeToMinutes(interval.endTime);
  if (start === null || end === null) return false;
  return shifts.some((shift) => {
    const shiftStart = parseTimeToMinutes(shift.startTime);
    const shiftEnd = parseTimeToMinutes(shift.endTime);
    if (shiftStart === null || shiftEnd === null) return false;
    return start >= shiftStart && end <= shiftEnd;
  });
};

export async function POST(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, maintainerId } = params;
    const body = await request.json();

    const osId = typeof body?.osId === 'string' ? body.osId.trim() : '';
    const date = typeof body?.date === 'string' ? body.date : '';
    const intervalsInput = Array.isArray(body?.intervals) ? body.intervals : [];

    if (!osId) {
      return NextResponse.json({ error: 'O.S. é obrigatória.' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data do apontamento é obrigatória.' }, { status: 400 });
    }

    if (!intervalsInput.length) {
      return NextResponse.json({ error: 'Informe ao menos um intervalo.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const maintainerSnapshot = await maintainerRef(folder.id, maintainerId).get();
    if (!maintainerSnapshot.exists) {
      return NextResponse.json({ error: 'Mantenedor não encontrado.' }, { status: 404 });
    }

    const maintainerData = maintainerSnapshot.data() || {};
    const maintainerDate = (maintainerData.date as string | undefined) || '';
    if (maintainerDate && maintainerDate !== date) {
      return NextResponse.json({ error: 'Apontamento não pertence a esta data.' }, { status: 403 });
    }

    const osSnapshot = await osCollectionRef(folder.id).doc(osId).get();
    if (!osSnapshot.exists) {
      return NextResponse.json({ error: 'O.S. não encontrada nesta pasta.' }, { status: 404 });
    }

    const normalizedIntervals: Interval[] = [];
    for (const item of intervalsInput) {
      const { interval, error } = normalizeInterval({
        startTime: typeof item?.startTime === 'string' ? item.startTime : '',
        endTime: typeof item?.endTime === 'string' ? item.endTime : '',
      });
      if (error || !interval) {
        return NextResponse.json({ error }, { status: 400 });
      }
      normalizedIntervals.push(interval);
    }

    const existingSnapshot = await osLogsCollectionRef(folder.id, maintainerId).where('date', '==', date).get();
    const existing = existingSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as Omit<MaintainerOsLog, 'id'>) }) as MaintainerOsLog
    );

    for (let i = 0; i < normalizedIntervals.length; i += 1) {
      const current = normalizedIntervals[i];

      for (let j = i + 1; j < normalizedIntervals.length; j += 1) {
        if (hasOverlap(current, normalizedIntervals[j])) {
          return NextResponse.json(
            { error: 'Conflito de horário: esse período já está sendo usado em outra O.S.' },
            { status: 409 }
          );
        }
      }

      for (const existingInterval of existing) {
        if (
          hasOverlap(current, { startTime: existingInterval.startTime, endTime: existingInterval.endTime })
        ) {
          return NextResponse.json(
            { error: 'Conflito de horário: esse período já está sendo usado em outra O.S.' },
            { status: 409 }
          );
        }
      }
    }

    const shifts: Array<{ startTime: string; endTime: string }> = Array.isArray(maintainerData.shifts)
      ? (maintainerData.shifts as Array<{ startTime: string; endTime: string }>)
      : [];

    if (!shifts.length && maintainerData.startTime && maintainerData.endTime) {
      shifts.push({ startTime: maintainerData.startTime as string, endTime: maintainerData.endTime as string });
    }

    for (const interval of normalizedIntervals) {
      if (!isInsideAvailability(interval, shifts)) {
        return NextResponse.json(
          { error: 'Horário fora da disponibilidade definida para este mantenedor.' },
          { status: 400 }
        );
      }
    }

    const now = Date.now();
    const created: MaintainerOsLog[] = [];

    for (const interval of normalizedIntervals) {
      const docRef = await osLogsCollectionRef(folder.id, maintainerId).add({
        maintainerId,
        osId,
        date,
        startTime: interval.startTime,
        endTime: interval.endTime,
        createdByRole: 'THIRD',
        createdAt: now,
        updatedAt: now,
      });
      created.push({
        id: docRef.id,
        maintainerId,
        osId,
        date,
        startTime: interval.startTime,
        endTime: interval.endTime,
        createdByRole: 'THIRD',
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ logs: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao lançar horário da O.S.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
