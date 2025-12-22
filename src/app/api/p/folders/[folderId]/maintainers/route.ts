import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOs } from '@/types/maintainerOs';

type Params = { params: { folderId: string } };

const collectionRef = (folderId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('maintainers');

const osCollectionRef = (folderId: string, maintainerId: string) =>
  collectionRef(folderId).doc(maintainerId).collection('os');

function mapMaintainer(doc: FirebaseFirestore.QueryDocumentSnapshot): Maintainer {
  const data = doc.data() as Omit<Maintainer, 'id'>;
  return { id: doc.id, ...data };
}

function mapOs(doc: FirebaseFirestore.QueryDocumentSnapshot): MaintainerOs {
  const data = doc.data() as Omit<MaintainerOs, 'id'>;
  return { id: doc.id, ...data };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId } = params;

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
      snapshot.docs.map(async (maintainerDoc) => {
        const base = mapMaintainer(maintainerDoc);
        const osSnapshot = await osCollectionRef(folder.id, base.id).orderBy('createdAt', 'desc').get();
        const os = osSnapshot.docs.map(mapOs);
        return { ...base, os };
      })
    );

    return NextResponse.json({
      folder: {
        id: folder.id,
        name: folder.name,
        updatedAt: folder.updatedAt,
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

    try {
      await getAdminFromRequest();
    } catch {
      return NextResponse.json({ error: 'Apenas administradores podem adicionar mantenedores.' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Nome do mantenedor é obrigatório.' }, { status: 400 });
    }

    const now = Date.now();
    const docRef = await collectionRef(folder.id).add({
      name,
      startTime: null,
      endTime: null,
      extraMinutes: null,
      createdAt: now,
      updatedAt: now,
    });

    const maintainer: Maintainer = {
      id: docRef.id,
      name,
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
