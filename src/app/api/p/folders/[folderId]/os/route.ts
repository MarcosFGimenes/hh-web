import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import type { ServiceOrder } from '@/types/os';

type Params = { params: { folderId: string } };

const collectionRef = (folderId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('os');

function mapOrder(doc: FirebaseFirestore.QueryDocumentSnapshot): ServiceOrder {
  const data = doc.data() as Omit<ServiceOrder, 'id'>;
  return { id: doc.id, ...data };
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
