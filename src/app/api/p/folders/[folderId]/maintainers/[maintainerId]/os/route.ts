import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { normalizeTime, validateShiftPair } from '@/lib/time/base';
import type { MaintainerOs } from '@/types/maintainerOs';

type Params = { params: { folderId: string; maintainerId: string } };

const maintainerRef = (folderId: string, maintainerId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('maintainers').doc(maintainerId);

const osCollectionRef = (folderId: string, maintainerId: string) =>
  maintainerRef(folderId, maintainerId).collection('os');

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
    const osNumber = typeof body?.osNumber === 'string' ? body.osNumber.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const startTimeRaw = typeof body?.startTime === 'string' ? body.startTime.trim() : '';
    const endTimeRaw = typeof body?.endTime === 'string' ? body.endTime.trim() : '';
    const startTime = normalizeTime(startTimeRaw);
    const endTime = normalizeTime(endTimeRaw);

    if (!osNumber || !description) {
      return NextResponse.json({ error: 'Número da O.S. e descrição são obrigatórios.' }, { status: 400 });
    }

    if ((startTime && !endTime) || (!startTime && endTime)) {
      return NextResponse.json({ error: 'Informe entrada e saída para registrar o horário da O.S.' }, { status: 400 });
    }

    const ref = maintainerRef(folder.id, maintainerId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Mantenedor não encontrado.' }, { status: 404 });
    }

    if (startTime && endTime) {
      const validation = validateShiftPair(startTime, endTime);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.message || 'Horário da O.S. inválido.' }, { status: 400 });
      }

      const existingOs = await osCollectionRef(folder.id, maintainerId).get();
      const hasOverlap = existingOs.docs.some((doc) => {
        const data = doc.data() as MaintainerOs;
        if (!data.startTime || !data.endTime) return false;
        return startTime < data.endTime && data.startTime < endTime;
      });
      if (hasOverlap) {
        return NextResponse.json({ error: 'Horários de O.S. não podem se sobrepor para o mesmo mantenedor.' }, { status: 400 });
      }
    }

    const now = Date.now();
    const osRef = await osCollectionRef(folder.id, maintainerId).add({
      maintainerId,
      osNumber,
      description,
      startTime: startTime || null,
      endTime: endTime || null,
      createdAt: now,
      updatedAt: now,
    });

    const os: MaintainerOs = {
      id: osRef.id,
      maintainerId,
      osNumber,
      description,
      startTime: startTime || null,
      endTime: endTime || null,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ os }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao adicionar O.S.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
