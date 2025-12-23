import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Employee } from '@/types/employee';
import type { Service } from '@/types/service';
import type { ServiceOrder } from '@/types/os';

type Params = { params: { folderId: string } };

const folderRef = (folderId: string) => getAdminDb().collection('folders').doc(folderId);

const mapOs = (doc: FirebaseFirestore.QueryDocumentSnapshot): ServiceOrder => {
  const data = doc.data() as Omit<ServiceOrder, 'id'>;
  return { id: doc.id, ...data };
};

export async function GET(_request: Request, { params }: Params) {
  try {
    await getAdminFromRequest();
    const { folderId } = params;

    const folderDoc = await folderRef(folderId).get();
    if (!folderDoc.exists) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    const folderData = folderDoc.data() || {};

    const osSnapshot = await folderRef(folderId).collection('os').get();
    const osMap = new Map<string, ServiceOrder>();
    osSnapshot.docs.forEach((doc) => osMap.set(doc.id, mapOs(doc)));

    const daysSnapshot = await folderRef(folderId).collection('days').get();
    const dayDocs = [...daysSnapshot.docs].sort((a, b) => b.id.localeCompare(a.id));

    const entries = await Promise.all(
      dayDocs.map(async (dayDoc) => {
        const date = dayDoc.id;
        const dayData = dayDoc.data() || {};

        const employeesSnapshot = await dayDoc.ref.collection('employees').get();
        const employeeDocs = [...employeesSnapshot.docs].sort(
          (a, b) => ((b.data()?.createdAt as number) || 0) - ((a.data()?.createdAt as number) || 0)
        );

        const employees = await Promise.all(
          employeeDocs.map(async (employeeDoc) => {
            const employeeData = employeeDoc.data() as Omit<Employee, 'id'>;

            const servicesSnapshot = await employeeDoc.ref.collection('services').get();
            const services = [...servicesSnapshot.docs]
              .sort(
                (a, b) => ((b.data()?.createdAt as number) || 0) - ((a.data()?.createdAt as number) || 0)
              )
              .map((serviceDoc) => {
              const serviceData = serviceDoc.data() as Omit<Service, 'id'> & { osId: string };
              const os = osMap.get(serviceData.osId);
              return {
                id: serviceDoc.id,
                ...serviceData,
                osCode: os?.osCode || '',
                tag: os?.tag || '',
                machineName: os?.machineName || '',
              };
            });

            return {
              id: employeeDoc.id,
              ...employeeData,
              services,
            };
          })
        );

        return {
          date,
          signatureName: (dayData as { signatureName?: string | null }).signatureName || null,
          signatureUrl: (dayData as { signatureUrl?: string | null }).signatureUrl || null,
          signedAt: (dayData as { signedAt?: number | null }).signedAt || null,
          employees,
        };
      })
    );

    return NextResponse.json({
      folder: {
        id: folderDoc.id,
        name: (folderData as { name?: string }).name || 'Pasta sem nome',
        company: (folderData as { company?: string | null }).company || null,
      },
      entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar lançamentos.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
