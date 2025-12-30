import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getCompanyFolder } from '@/lib/firebase/adminFolders';
import type { Folder } from '@/types/folder';

const COLLECTION = 'folders';

export async function PATCH(
  request: Request,
  { params }: { params: { folderId: string } }
) {
  const { folderId } = params;

  try {
    const { companyId } = await getAdminFromRequest();

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
        return NextResponse.json({ error: 'Informe ao menos uma assinatura com nome e cargo.' }, { status: 400 });
      }
      updates.signatures = sanitized;
    }

    if (body?.rotateLinkKey) {
      linkKey = crypto.randomBytes(24).toString('hex');
      updates.linkKeyHash = crypto.createHash('sha256').update(linkKey).digest('hex');
    }

    if (typeof body?.statusColumn === 'string') {
      const status = body.statusColumn.trim();
      if (!['entrada', 'andamento', 'concluido'].includes(status)) {
        return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
      }
      updates.statusColumn = status as Folder['statusColumn'];
    }

    if (body?.position !== undefined) {
      const parsed = typeof body.position === 'number' ? body.position : Number(body.position);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json({ error: 'Posição inválida.' }, { status: 400 });
      }
      updates.position = parsed;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'Nenhuma atualização enviada.' }, { status: 400 });
    }

    updates.updatedAt = Date.now();

    const folder = await getCompanyFolder(folderId, companyId);
    if (!folder) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }
    const docRef = folder.docRef;
    await docRef.update(updates);

    const snapshot = await docRef.get();
    const data = snapshot.data() as Omit<Folder, 'id'> | undefined;

    if (!data) {
      return NextResponse.json({ error: 'Pasta não encontrada após atualização.' }, { status: 404 });
    }

    return NextResponse.json({
      folder: { id: snapshot.id, ...data },
      linkKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar pasta.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { folderId: string } }
) {
  const { folderId } = params;

  try {
    const { companyId } = await getAdminFromRequest();

    const folder = await getCompanyFolder(folderId, companyId);
    if (!folder) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    await folder.docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir pasta.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
