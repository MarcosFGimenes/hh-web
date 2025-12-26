import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOs } from '@/types/maintainerOs';
import type { MaintainerOsLog } from '@/types/maintainerOsLog';

type Params = { params: { folderId: string } };

const collectionRef = (folderId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('maintainers');

const osCollectionRef = (folderId: string, maintainerId: string) =>
  collectionRef(folderId).doc(maintainerId).collection('os');

const osLogsCollectionRef = (folderId: string, maintainerId: string) =>
  collectionRef(folderId).doc(maintainerId).collection('osLogs');

function mapMaintainer(doc: FirebaseFirestore.QueryDocumentSnapshot): Maintainer {
  const data = doc.data() as Omit<Maintainer, 'id'>;
  const createdAt = (data as { createdAt?: number }).createdAt || Date.now();
  const date =
    (data as { date?: string }).date ||
    new Date(createdAt).toISOString().slice(0, 10);
  const base: Maintainer = { id: doc.id, ...data, date, createdAt };

  if (!base.shifts || base.shifts.length === 0) {
    const hasLegacyShift = base.startTime && base.endTime;
    base.shifts = hasLegacyShift ? [{ id: `${doc.id}-legacy`, startTime: base.startTime!, endTime: base.endTime! }] : [];
  }

  return base;
}

function mapOs(doc: FirebaseFirestore.QueryDocumentSnapshot): MaintainerOs {
  const data = doc.data() as Omit<MaintainerOs, 'id'>;
  return { id: doc.id, ...data };
}

function mapOsLog(doc: FirebaseFirestore.QueryDocumentSnapshot): MaintainerOsLog {
  const data = doc.data() as Omit<MaintainerOsLog, 'id'>;
  return { id: doc.id, ...data };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId } = params;
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    let userRole: 'ADMIN' | 'THIRD' = 'THIRD';
    try {
      await getAdminFromRequest();
      userRole = 'ADMIN';
    } catch {
      // continua como THIRD
    }

    const snapshot = await collectionRef(folder.id).orderBy('createdAt', 'desc').get();
    const maintainers = await Promise.all(
      snapshot.docs
        .map(mapMaintainer)
        .filter((item) => item.date === date)
        .map(async (base) => {
          const osSnapshot = await osCollectionRef(folder.id, base.id).orderBy('createdAt', 'desc').get();
          const os = osSnapshot.docs.map(mapOs);
          const osLogsSnapshot = await osLogsCollectionRef(folder.id, base.id).where('date', '==', date).get();
          const osLogs = osLogsSnapshot.docs.map(mapOsLog);
          return { ...base, os, osLogs };
        })
    );

    return NextResponse.json({
      folder: {
        id: folder.id,
        name: folder.name,
        updatedAt: folder.updatedAt,
        foCode: folder.foCode ?? null,
        foEmission: folder.foEmission ?? null,
        foRevision: folder.foRevision ?? null,
        foNumber: folder.foNumber ?? null,
      },
      maintainers,
      userRole,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar mantenedores.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId } = params;

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const date = typeof body?.date === 'string' ? body.date : '';
    if (!name) {
      return NextResponse.json({ error: 'Nome do mantenedor é obrigatório.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data do apontamento é obrigatória.' }, { status: 400 });
    }

    const now = Date.now();
    const docRef = await collectionRef(folder.id).add({
      name,
      date,
      startTime: null,
      endTime: null,
      extraMinutes: null,
      createdAt: now,
      updatedAt: now,
    });

    const maintainer: Maintainer = {
      id: docRef.id,
      name,
      date,
      startTime: null,
      endTime: null,
      extraMinutes: null,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ maintainer }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao adicionar mantenedor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
