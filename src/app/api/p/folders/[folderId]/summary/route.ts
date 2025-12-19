import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';

type Params = { params: { folderId: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';

    const folder = await verifyLinkKey(params.folderId, linkKey);

    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    return NextResponse.json({
      folder: {
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao validar link.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
