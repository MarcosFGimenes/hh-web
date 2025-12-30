import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Folder } from '@/types/folder';

export const dynamic = 'force-dynamic';

const COLLECTION = 'folders';
const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function PATCH(
  request: Request,
  { params }: { params: { folderId: string } }
) {
  const { folderId } = params;

  try {
    await getAdminFromRequest();

    const body = await request.json();
    const updates: Partial<Folder> = {};
    let linkKey: string | undefined;

    if (typeof body?.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body?.company === 'string' && body.company.trim()) {
      updates.company = body.company.trim();
    }

    if (Array.isArray(body?.signatures)) {
      const sanitized = body.signatures
        .map((entry: { name?: string; role?: string }) => ({
          name: typeof entry?.name === 'string' ? entry.name.trim() : '',
          role: typeof entry?.role === 'string' ? entry.role.trim() : '',
        }))
        .filter((entry: { name: string; role: string }) => entry.name && entry.role);
      if (!sanitized.length) {
      return NextResponse.json(
        { error: 'Informe ao menos uma assinatura com nome e cargo.' },
        { status: 400, headers: noStoreHeaders }
      );
      }
      updates.signatures = sanitized;
    }

    if (body?.rotateLinkKey) {
      linkKey = crypto.randomBytes(24).toString('hex');
      updates.linkKeyHash = crypto.createHash('sha256').update(linkKey).digest('hex');
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'Nenhuma atualização enviada.' }, { status: 400, headers: noStoreHeaders });
    }

    updates.updatedAt = Date.now();

    const adminDb = getAdminDb();
    const docRef = adminDb.collection(COLLECTION).doc(folderId);
    await docRef.update(updates);

    const snapshot = await docRef.get();
    const data = snapshot.data() as Omit<Folder, 'id'> | undefined;

    if (!data) {
      return NextResponse.json({ error: 'Pasta não encontrada após atualização.' }, { status: 404, headers: noStoreHeaders });
    }

    return NextResponse.json({
      folder: { id: snapshot.id, ...data },
      linkKey,
    }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar pasta.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { folderId: string } }
) {
  const { folderId } = params;

  try {
    await getAdminFromRequest();

    const adminDb = getAdminDb();
    const docRef = adminDb.collection(COLLECTION).doc(folderId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404, headers: noStoreHeaders });
    }

    await docRef.delete();

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir pasta.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
  }
}
