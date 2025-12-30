import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getCompanyFolder } from '@/lib/firebase/adminFolders';
import type { ServiceOrder } from '@/types/os';
import { mapOsDoc } from './helpers';

type Params = { params: { folderId: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { companyId } = await getAdminFromRequest();
    const { folderId } = params;

    const folder = await getCompanyFolder(folderId, companyId);
    if (!folder) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    const snapshot = await folder.docRef.collection('os').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(mapOsDoc);

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar O.S.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await getAdminFromRequest();
    const { folderId } = params;
    const body = await request.json();

    const osCode = typeof body?.osCode === 'string' ? body.osCode.trim() : '';
    const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';
    const machineName = typeof body?.machineName === 'string' ? body.machineName.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!osCode || !tag || !machineName || !description) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    const folder = await getCompanyFolder(folderId, admin.companyId);
    if (!folder) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    const now = Date.now();
    const docRef = await folder.docRef.collection('os').add({
      osCode,
      tag,
      machineName,
      description,
      createdByRole: 'ADMIN',
      createdByUserId: admin.token.uid || null,
      isExternal: false,
      createdAt: now,
      updatedAt: now,
    });

    const order: ServiceOrder = {
      id: docRef.id,
      osCode,
      tag,
      machineName,
      description,
      createdByRole: 'ADMIN',
      createdByUserId: admin.token.uid || null,
      isExternal: false,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar O.S.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
