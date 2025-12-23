import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import type { Maintainer } from '@/types/maintainer';

type Params = { params: { folderId: string; maintainerId: string } };

const collectionRef = (folderId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('maintainers');

const osCollectionRef = (folderId: string, maintainerId: string) =>
  collectionRef(folderId).doc(maintainerId).collection('os');

async function ensureAdmin() {
  try {
    await getAdminFromRequest();
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, maintainerId } = params;

    const isAdmin = await ensureAdmin();
    let targetFolderId = folderId;

    if (!isAdmin) {
      const folder = await verifyLinkKey(folderId, linkKey);
      if (!folder) {
        return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
      }
      targetFolderId = folder.id;
    } else {
      const folderSnapshot = await getAdminDb().collection('folders').doc(folderId).get();
      if (!folderSnapshot.exists) {
        return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
      }
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Nome do mantenedor é obrigatório.' }, { status: 400 });
    }

    const docRef = collectionRef(targetFolderId).doc(maintainerId);
    await docRef.update({ name, updatedAt: Date.now() });
    const snapshot = await docRef.get();
    const maintainer = { id: snapshot.id, ...(snapshot.data() as Omit<Maintainer, 'id'>) };

    return NextResponse.json({ maintainer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar mantenedor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, maintainerId } = params;

    const isAdmin = await ensureAdmin();
    let targetFolderId = folderId;

    if (!isAdmin) {
      const folder = await verifyLinkKey(folderId, linkKey);
      if (!folder) {
        return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
      }
      targetFolderId = folder.id;
    } else {
      const folderSnapshot = await getAdminDb().collection('folders').doc(folderId).get();
      if (!folderSnapshot.exists) {
        return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
      }
    }

    const db = getAdminDb();
    const maintainerRef = collectionRef(targetFolderId).doc(maintainerId);
    const osRef = osCollectionRef(targetFolderId, maintainerId);
    const osSnapshot = await osRef.get();

    const batch = db.batch();
    osSnapshot.forEach((doc) => batch.delete(doc.ref));
    batch.delete(maintainerRef);
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir mantenedor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
