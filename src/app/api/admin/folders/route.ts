import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import type { Folder } from '@/types/folder';

const collection = adminDb.collection('folders');

const hashLink = (linkKey: string) => createHash('sha256').update(linkKey).digest('hex');

const buildFolder = (id: string, data: FirebaseFirestore.DocumentData): Folder => ({
  id,
  name: data.name,
  linkHash: data.linkHash,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export async function GET() {
  await getAdminFromRequest();
  const snapshot = await collection.orderBy('createdAt', 'desc').get();
  const folders = snapshot.docs.map((doc) => buildFolder(doc.id, doc.data()));

  return NextResponse.json({ folders });
}

export async function POST(request: Request) {
  await getAdminFromRequest();
  const body = await request.json();
  const name: string = body?.name;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome da pasta é obrigatório.' }, { status: 400 });
  }

  const now = Date.now();
  const linkKey = randomBytes(24).toString('hex');
  const linkHash = hashLink(linkKey);

  const docRef = await collection.add({
    name: name.trim(),
    linkHash,
    createdAt: now,
    updatedAt: now,
  });

  const folder: Folder = {
    id: docRef.id,
    name: name.trim(),
    linkHash,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({ folder, linkKey });
}

export async function PATCH(request: Request) {
  await getAdminFromRequest();
  const body = await request.json();
  const id: string = body?.id;
  const name: string = body?.name;

  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome da pasta é obrigatório.' }, { status: 400 });
  }

  const now = Date.now();
  await collection.doc(id).update({ name: name.trim(), updatedAt: now });

  return NextResponse.json({ ok: true, id, name: name.trim(), updatedAt: now });
}

export async function DELETE(request: Request) {
  await getAdminFromRequest();
  const body = await request.json();
  const id: string = body?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
  }

  await collection.doc(id).delete();
  return NextResponse.json({ ok: true, id });
}
