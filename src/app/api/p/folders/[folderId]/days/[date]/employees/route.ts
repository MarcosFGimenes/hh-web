import { NextResponse } from 'next/server';
import { verifyLinkKey } from '@/lib/linkAccess/verifyLinkKey';
import { adminDb } from '@/lib/firebase/admin';
import type { Employee } from '@/types/employee';

type Params = { params: { folderId: string; date: string } };

const isValidDateParam = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const collectionRef = (folderId: string, date: string) =>
  adminDb.collection('folders').doc(folderId).collection('days').doc(date).collection('employees');

function mapEmployee(doc: FirebaseFirestore.QueryDocumentSnapshot): Employee {
  const data = doc.data() as Omit<Employee, 'id'>;
  return { id: doc.id, ...data };
}

export async function GET(request: Request, { params }: Params) {
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

    const snapshot = await collectionRef(folder.id, date).orderBy('createdAt', 'desc').get();
    const employees = snapshot.docs.map(mapEmployee);

    return NextResponse.json({ employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar funcionários.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const totalMinutes =
      typeof body?.totalMinutes === 'number' && Number.isFinite(body.totalMinutes) && body.totalMinutes >= 0
        ? body.totalMinutes
        : null;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const now = Date.now();
    const docRef = await collectionRef(folder.id, date).add({
      name,
      totalMinutes,
      createdAt: now,
      updatedAt: now,
    });

    const employee: Employee = {
      id: docRef.id,
      name,
      totalMinutes,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar funcionário.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
