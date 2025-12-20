import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import type { ServiceOrder } from '@/types/os';
import { mapOsDoc, osCollectionRef } from '../helpers';

type Params = { params: { folderId: string } };

type IncomingOrder = {
  osCode?: unknown;
  tag?: unknown;
  machineName?: unknown;
  description?: unknown;
};

const sanitizeOrder = (order: IncomingOrder) => ({
  osCode: typeof order.osCode === 'string' ? order.osCode.trim() : '',
  tag: typeof order.tag === 'string' ? order.tag.trim() : '',
  machineName: typeof order.machineName === 'string' ? order.machineName.trim() : '',
  description: typeof order.description === 'string' ? order.description.trim() : '',
});

export async function POST(request: Request, { params }: Params) {
  try {
    await getAdminFromRequest();
    const { folderId } = params;

    const body = await request.json();
    const incomingOrders = Array.isArray(body?.orders) ? (body.orders as IncomingOrder[]) : [];

    if (!incomingOrders.length) {
      return NextResponse.json({ error: 'Envie pelo menos uma O.S. para importar.' }, { status: 400 });
    }

    const sanitized = incomingOrders.map(sanitizeOrder);
    const hasInvalid = sanitized.some(
      (order) => !order.osCode || !order.tag || !order.machineName || !order.description
    );

    if (hasInvalid) {
      return NextResponse.json(
        { error: 'Preencha código, TAG, equipamento e descrição em todas as linhas antes de importar.' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const batch = osCollectionRef(folderId).firestore.batch();
    const collection = osCollectionRef(folderId);
    const created: ServiceOrder[] = [];

    sanitized.forEach((order) => {
      const docRef = collection.doc();
      batch.set(docRef, { ...order, createdAt: now, updatedAt: now });
      created.push({ id: docRef.id, ...order, createdAt: now, updatedAt: now });
    });

    await batch.commit();

    const snapshot = await osCollectionRef(folderId).orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(mapOsDoc);

    return NextResponse.json({ imported: created, orders }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao importar O.S.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
