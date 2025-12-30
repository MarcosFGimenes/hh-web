import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Folder } from '@/types/folder';

export const dynamic = 'force-dynamic';

const COLLECTION = 'folders';
const noStoreHeaders = { 'Cache-Control': 'no-store' };

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

    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    const folders = snapshot.docs.map(mapFolder);

    return NextResponse.json({ folders }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar pastas.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
  }
}

export async function POST(request: Request) {
  try {
    await getAdminFromRequest();

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const company = typeof body?.company === 'string' ? body.company.trim() : '';
    const rawHourRate = body?.hourRate;
    const rawHourRate50 = body?.hourRate50;
    const rawHourRate100 = body?.hourRate100;
    const rawNormalHours = body?.normalHoursPerDay;
    const rawSignatures: Array<{ name?: string; role?: string }> = Array.isArray(body?.signatures)
      ? body.signatures
      : [];
    let hourRate: number | null = null;
    let hourRate50: number | null = null;
    let hourRate100: number | null = null;
    let normalHoursPerDay: number | null = null;
    const signatures = rawSignatures
      .map((entry) => ({
        name: typeof entry?.name === 'string' ? entry.name.trim() : '',
        role: typeof entry?.role === 'string' ? entry.role.trim() : '',
      }))
      .filter((entry) => entry.name && entry.role);

    if (rawHourRate !== undefined && rawHourRate !== null && rawHourRate !== '') {
      const parsed = typeof rawHourRate === 'number' ? rawHourRate : Number(rawHourRate);
      if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'Valor da hora homem inválido.' }, { status: 400, headers: noStoreHeaders });
      }
      hourRate = parsed;
    }

    if (rawHourRate50 !== undefined && rawHourRate50 !== null && rawHourRate50 !== '') {
      const parsed = typeof rawHourRate50 === 'number' ? rawHourRate50 : Number(rawHourRate50);
      if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'Valor da hora 50% inválido.' }, { status: 400, headers: noStoreHeaders });
      }
      hourRate50 = parsed;
    }

    if (rawHourRate100 !== undefined && rawHourRate100 !== null && rawHourRate100 !== '') {
      const parsed = typeof rawHourRate100 === 'number' ? rawHourRate100 : Number(rawHourRate100);
      if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'Valor da hora 100% inválido.' }, { status: 400, headers: noStoreHeaders });
      }
      hourRate100 = parsed;
    }

    if (rawNormalHours !== undefined && rawNormalHours !== null && rawNormalHours !== '') {
      const parsed = typeof rawNormalHours === 'number' ? rawNormalHours : Number(rawNormalHours);
      if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'Horas normais por dia inválidas.' }, { status: 400, headers: noStoreHeaders });
      }
      normalHoursPerDay = parsed;
    }

    if (signatures.length === 0) {
      return NextResponse.json(
        { error: 'Informe ao menos uma assinatura com nome e cargo.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    if (
      !name ||
      !company ||
      hourRate === null ||
      hourRate50 === null ||
      hourRate100 === null ||
      normalHoursPerDay === null
    ) {
      return NextResponse.json(
        {
          error: 'Nome da pasta, empresa responsável, horas normais por dia e valores de hora normal/50%/100% são obrigatórios.',
        },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const linkKey = crypto.randomBytes(24).toString('hex');
    const linkKeyHash = crypto.createHash('sha256').update(linkKey).digest('hex');
    const now = Date.now();

    const adminDb = getAdminDb();
    const docRef = await adminDb.collection(COLLECTION).add({
      name,
      company,
      status: 'backlog',
      hourRate,
      hourRate50,
      hourRate100,
      normalHoursPerDay,
      signatures,
      linkKeyHash,
      createdAt: now,
      updatedAt: now,
    });

    const folder: Folder = {
      id: docRef.id,
      name,
      company,
      status: 'backlog',
      hourRate,
      hourRate50,
      hourRate100,
      normalHoursPerDay,
      signatures,
      linkKeyHash,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ folder, linkKey }, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar pasta.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
  }
}
