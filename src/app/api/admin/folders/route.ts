import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { adminDb } from '@/lib/firebase/admin';
import type { Folder } from '@/types/folder';

const COLLECTION = 'folders';

function mapFolder(doc: FirebaseFirestore.QueryDocumentSnapshot): Folder {
  const data = doc.data() as Omit<Folder, 'id'>;

  return {
    id: doc.id,
    ...data,
  };
}

export async function GET() {
  try {
    await getAdminFromRequest();

    const snapshot = await adminDb.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    const folders = snapshot.docs.map(mapFolder);

    return NextResponse.json({ folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar pastas.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await getAdminFromRequest();

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Nome da pasta é obrigatório.' }, { status: 400 });
    }

    const linkKey = crypto.randomBytes(24).toString('hex');
    const linkKeyHash = crypto.createHash('sha256').update(linkKey).digest('hex');
    const now = Date.now();

    const docRef = await adminDb.collection(COLLECTION).add({
      name,
      linkKeyHash,
      createdAt: now,
      updatedAt: now,
    });

    const folder: Folder = {
      id: docRef.id,
      name,
      linkKeyHash,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ folder, linkKey }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar pasta.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
