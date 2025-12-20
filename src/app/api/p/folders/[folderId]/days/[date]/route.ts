import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';

type Params = { params: { folderId: string; date: string } };

const isValidDateParam = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const dayDocRef = (folderId: string, date: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('days').doc(date);

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId, date } = params;

    if (!isValidDateParam(date)) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    const snapshot = await dayDocRef(folder.id, date).get();
    const data = snapshot.data() || {};

    return NextResponse.json({
      signatureUrl: data.signatureUrl || null,
      signatureName: data.signatureName || null,
      signedAt: data.signedAt || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar assinatura.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
