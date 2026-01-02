import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const COLLECTION = 'adminKanbanLayouts';
const noStoreHeaders = { 'Cache-Control': 'no-store' };

type LayoutPayload = {
  backlog: string[];
  progress: string[];
  done: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function sanitizeLayout(input: unknown): LayoutPayload | null {
  const obj = input as Partial<LayoutPayload> | null;
  if (!obj || typeof obj !== 'object') return null;

  const backlog = isStringArray(obj.backlog) ? obj.backlog : null;
  const progress = isStringArray(obj.progress) ? obj.progress : null;
  const done = isStringArray(obj.done) ? obj.done : null;

  if (!backlog || !progress || !done) return null;

  const trim = (ids: string[]) => ids.map((id) => id.trim()).filter(Boolean);
  const next: LayoutPayload = {
    backlog: trim(backlog),
    progress: trim(progress),
    done: trim(done),
  };

  const MAX_IDS = 5000;
  if (next.backlog.length + next.progress.length + next.done.length > MAX_IDS) return null;

  return next;
}

export async function GET() {
  try {
    const admin = await getAdminFromRequest();

    const docRef = getAdminDb().collection(COLLECTION).doc(admin.uid);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ layout: null }, { headers: noStoreHeaders });
    }

    const data = snapshot.data() as { layout?: LayoutPayload; updatedAt?: number } | undefined;
    if (!data?.layout) {
      return NextResponse.json({ layout: null }, { headers: noStoreHeaders });
    }

    return NextResponse.json(
      { layout: data.layout, updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : null },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar layout do kanban.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getAdminFromRequest();

    const body = await request.json();
    const layout = sanitizeLayout(body?.layout ?? body);
    if (!layout) {
      return NextResponse.json(
        { error: 'Layout inválido. Esperado: { backlog: string[], progress: string[], done: string[] }.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const updatedAt = Date.now();
    await getAdminDb()
      .collection(COLLECTION)
      .doc(admin.uid)
      .set({ layout, updatedAt }, { merge: true });

    return NextResponse.json({ ok: true, updatedAt }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar layout do kanban.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
  }
}

