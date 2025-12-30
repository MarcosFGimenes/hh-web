import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getAdminDb } from '@/lib/firebase/admin';

type LayoutUpdate = {
  id: string;
  statusColumn: 'entrada' | 'andamento' | 'concluido';
  position: number;
};

const COLLECTION = 'folders';

export async function PATCH(request: Request) {
  try {
    const { companyId } = await getAdminFromRequest();
    const body = await request.json();
    const updates: LayoutUpdate[] = Array.isArray(body?.updates) ? body.updates : [];

    if (!updates.length) {
      return NextResponse.json({ error: 'Nenhuma atualização enviada.' }, { status: 400 });
    }

    const sanitized = updates.map((entry) => ({
      id: typeof entry?.id === 'string' ? entry.id : '',
      statusColumn: entry?.statusColumn,
      position: typeof entry?.position === 'number' ? entry.position : Number(entry?.position),
    }));

    if (
      sanitized.some(
        (entry) =>
          !entry.id ||
          !['entrada', 'andamento', 'concluido'].includes(entry.statusColumn) ||
          !Number.isFinite(entry.position) ||
          entry.position < 0
      )
    ) {
      return NextResponse.json({ error: 'Atualização de layout inválida.' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const docRefs = sanitized.map((entry) => adminDb.collection(COLLECTION).doc(entry.id));
    const snapshots = await adminDb.getAll(...docRefs);

    const missing = snapshots.some((snapshot) => !snapshot.exists);
    if (missing) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    const unauthorized = snapshots.some((snapshot) => {
      const data = snapshot.data() as { companyId?: string | null } | undefined;
      return data?.companyId && data.companyId !== companyId;
    });

    if (unauthorized) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    const now = Date.now();
    const batch = adminDb.batch();

    sanitized.forEach((entry, index) => {
      const snapshot = snapshots[index];
      const data = snapshot.data() as { companyId?: string | null } | undefined;
      if (!data?.companyId) {
        batch.update(docRefs[index], { companyId });
      }
      batch.update(docRefs[index], {
        statusColumn: entry.statusColumn,
        position: entry.position,
        updatedAt: now,
      });
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar layout.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

