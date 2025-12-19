import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { adminDb } from '@/lib/firebase/admin';
import type { ServiceOrder } from '@/types/os';

type Params = { params: { folderId: string } };

const collectionRef = (folderId: string) => adminDb.collection('folders').doc(folderId).collection('os');

function mapOs(doc: FirebaseFirestore.QueryDocumentSnapshot): ServiceOrder {
  const data = doc.data() as Omit<ServiceOrder, 'id'>;
  return { id: doc.id, ...data };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    await getAdminFromRequest();
    const { folderId } = params;

    const snapshot = await collectionRef(folderId).orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(mapOs);

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar O.S.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await getAdminFromRequest();
    const { folderId } = params;
    const body = await request.json();

    const osCode = typeof body?.osCode === 'string' ? body.osCode.trim() : '';
    const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';
    const machineName = typeof body?.machineName === 'string' ? body.machineName.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!osCode || !tag || !machineName || !description) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    const now = Date.now();
    const docRef = await collectionRef(folderId).add({
      osCode,
      tag,
      machineName,
      description,
      createdAt: now,
      updatedAt: now,
    });

    const order: ServiceOrder = {
      id: docRef.id,
      osCode,
      tag,
      machineName,
      description,
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
