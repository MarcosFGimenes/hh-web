import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import type { Maintainer } from '@/types/maintainer';

type Params = { params: { folderId: string } };

const collectionRef = (folderId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('maintainers');

function mapMaintainer(doc: FirebaseFirestore.QueryDocumentSnapshot): Maintainer {
  const data = doc.data() as Omit<Maintainer, 'id'>;
  return { id: doc.id, ...data };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const linkKey = url.searchParams.get('k') || '';
    const { folderId } = params;

    const folder = await verifyLinkKey(folderId, linkKey);
    if (!folder) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 401 });
    }

    let userRole: 'ADMIN' | 'THIRD' = 'THIRD';
    try {
      await getAdminFromRequest();
      userRole = 'ADMIN';
    } catch {
      // continua como THIRD
    }

    const snapshot = await collectionRef(folder.id).orderBy('createdAt', 'desc').get();
    const maintainers = snapshot.docs.map(mapMaintainer);

    return NextResponse.json({
      folder: {
        id: folder.id,
        name: folder.name,
        updatedAt: folder.updatedAt,
      },
      maintainers,
      userRole,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar mantenedores.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
