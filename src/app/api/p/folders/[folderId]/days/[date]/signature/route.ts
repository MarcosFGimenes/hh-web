import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { adminBucket, adminDb } from '@/lib/firebase/admin';

type Params = { params: { folderId: string; date: string } };

const isValidDateParam = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const dayDocRef = (folderId: string, date: string) =>
  adminDb.collection('folders').doc(folderId).collection('days').doc(date);

const bucketDownloadUrl = (path: string, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${adminBucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

export async function POST(request: Request, { params }: Params) {
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

    const body = await request.json();
    const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl : '';
    const signatureName = typeof body?.name === 'string' ? body.name.trim() : '';

    const matches = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/i);
    if (!matches) {
      return NextResponse.json({ error: 'Formato de imagem inválido.' }, { status: 400 });
    }

    const extension = matches[1].toLowerCase();
    const base64 = matches[2];
    const buffer = Buffer.from(base64, 'base64');

    const now = Date.now();
    const filePath = `signatures/${folder.id}/${date}/signature-${now}.${extension}`;
    const token = randomUUID();
    const file = adminBucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: `image/${extension}`,
        metadata: { firebaseStorageDownloadTokens: token },
      },
      resumable: false,
    });

    const signatureUrl = bucketDownloadUrl(filePath, token);

    await dayDocRef(folder.id, date).set(
      {
        signatureUrl,
        signatureName: signatureName || null,
        signedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({ signatureUrl, signatureName: signatureName || null, signedAt: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar assinatura.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
