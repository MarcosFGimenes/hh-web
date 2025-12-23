import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import type { ServiceOrder } from '@/types/os';

type Params = { params: { folderId: string } };

const collectionRef = (folderId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('os');

function mapOrder(doc: FirebaseFirestore.QueryDocumentSnapshot): ServiceOrder {
  const data = doc.data() as Omit<ServiceOrder, 'id'>;
  return {
    id: doc.id,
    osCode: data.osCode || '',
    tag: data.tag || '',
    machineName: data.machineName || '',
    description: data.description || '',
    createdByRole: data.createdByRole || 'ADMIN',
    createdByUserId: data.createdByUserId ?? null,
    isExternal: Boolean((data as { isExternal?: boolean }).isExternal),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';

    const folder = await verifyLinkKey(params.folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const snapshot = await collectionRef(folder.id).orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(mapOrder);

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar O.S.';
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
    const osCode = typeof body?.osCode === 'string' ? body.osCode.trim() : '';
    const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';
    const machineName = typeof body?.machineName === 'string' ? body.machineName.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!osCode) {
      return NextResponse.json({ error: 'Código da O.S. é obrigatório.' }, { status: 400 });
    }

    const existingSnapshot = await collectionRef(folder.id).where('osCode', '==', osCode).limit(1).get();
    if (!existingSnapshot.empty) {
      const existing = mapOrder(existingSnapshot.docs[0]);
      return NextResponse.json({ order: existing });
    }

    const now = Date.now();
    const docRef = await collectionRef(folder.id).add({
      osCode,
      tag,
      machineName,
      description,
      createdByRole: 'THIRD',
      createdByUserId: null,
      isExternal: true,
      createdAt: now,
      updatedAt: now,
    });

    const order: ServiceOrder = {
      id: docRef.id,
      osCode,
      tag,
      machineName,
      description,
      createdByRole: 'THIRD',
      createdByUserId: null,
      isExternal: true,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar O.S.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
