import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
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
    const date = url.searchParams.get('date') || '';
    const { folderId, maintainerId } = params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data do apontamento é obrigatória.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    try {
      await getAdminFromRequest();
    } catch {
      return NextResponse.json({ error: 'Apenas administradores podem criar O.S.' }, { status: 401 });
    }

    const body = await request.json();
    const osNumber = typeof body?.osNumber === 'string' ? body.osNumber.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!osNumber || !description) {
      return NextResponse.json({ error: 'Número da O.S. e descrição são obrigatórios.' }, { status: 400 });
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

    const now = Date.now();
    const osRef = await osCollectionRef(folder.id, maintainerId).add({
      maintainerId,
      osNumber,
      description,
      startTime: null,
      endTime: null,
      createdAt: now,
      updatedAt: now,
    });

    const os: MaintainerOs = {
      id: osRef.id,
      maintainerId,
      osNumber,
      description,
      startTime: null,
      endTime: null,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ os }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao adicionar O.S.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
