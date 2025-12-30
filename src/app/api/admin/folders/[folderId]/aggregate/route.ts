import { FieldPath } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getCompanyFolder } from '@/lib/firebase/adminFolders';
import type { Service } from '@/types/service';
import type { Employee } from '@/types/employee';
import type { ServiceOrder } from '@/types/os';

type Params = { params: { folderId: string } };

type AggregateByDay = { date: string; servicesMinutes: number };
type AggregateByEmployeeDay = {
  date: string;
  employeeId: string;
  employeeName: string;
  employeeTotalMinutes: number | null;
  servicesMinutes: number;
};
type AggregateByOs = { osId: string; osCode: string; tag: string; machineName: string; servicesMinutes: number; serviceCount: number };

const isValidDateParam = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const mapOs = (doc: FirebaseFirestore.QueryDocumentSnapshot): ServiceOrder => {
  const data = doc.data() as Omit<ServiceOrder, 'id'>;
  return { id: doc.id, ...data };
};

export async function GET(request: Request, { params }: Params) {
  try {
    const { companyId } = await getAdminFromRequest();
    const url = new URL(request.url);
    const { folderId } = params;
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';

    if (!isValidDateParam(from) || !isValidDateParam(to)) {
      return NextResponse.json({ error: 'Parâmetros from/to inválidos. Formato esperado: YYYY-MM-DD' }, { status: 400 });
    }

    const folder = await getCompanyFolder(folderId, companyId);
    if (!folder) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    const osSnapshot = await folder.docRef.collection('os').get();
    const osMap = new Map<string, ServiceOrder>();
    osSnapshot.docs.forEach((doc) => osMap.set(doc.id, mapOs(doc)));

    const daysQuery = await folder.docRef
      .collection('days')
      .where(FieldPath.documentId(), '>=', from)
      .where(FieldPath.documentId(), '<=', to)
      .get();

    const byDay: Map<string, number> = new Map();
    const byEmployeeDay: AggregateByEmployeeDay[] = [];
    const byOs: Map<string, { servicesMinutes: number; serviceCount: number }> = new Map();

    for (const dayDoc of daysQuery.docs) {
      const date = dayDoc.id;
      const employeesSnapshot = await dayDoc.ref.collection('employees').get();
      for (const employeeDoc of employeesSnapshot.docs) {
        const employeeData = employeeDoc.data() as Omit<Employee, 'id'>;
        const servicesSnapshot = await employeeDoc.ref.collection('services').get();
        let employeeServicesTotal = 0;

        servicesSnapshot.docs.forEach((serviceDoc) => {
          const service = serviceDoc.data() as Omit<Service, 'id'>;
          employeeServicesTotal += service.totalMinutes || 0;
          const currentOs = byOs.get(service.osId) || { servicesMinutes: 0, serviceCount: 0 };
          byOs.set(service.osId, {
            servicesMinutes: currentOs.servicesMinutes + (service.totalMinutes || 0),
            serviceCount: currentOs.serviceCount + 1,
          });
        });

        const entry: AggregateByEmployeeDay = {
          date,
          employeeId: employeeDoc.id,
          employeeName: employeeData.name,
          employeeTotalMinutes: employeeData.totalMinutes ?? null,
          servicesMinutes: employeeServicesTotal,
        };
        byEmployeeDay.push(entry);

        byDay.set(date, (byDay.get(date) || 0) + employeeServicesTotal);
      }
    }

    const byDayArray: AggregateByDay[] = Array.from(byDay.entries())
      .map(([date, servicesMinutes]) => ({ date, servicesMinutes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byOsArray: AggregateByOs[] = Array.from(byOs.entries()).map(([osId, aggregate]) => {
      const os = osMap.get(osId);
      return {
        osId,
        osCode: os?.osCode || '',
        tag: os?.tag || '',
        machineName: os?.machineName || '',
        servicesMinutes: aggregate.servicesMinutes,
        serviceCount: aggregate.serviceCount,
      };
    });

    return NextResponse.json({
      range: { from, to },
      byDay: byDayArray,
      byEmployeeDay,
      byOs: byOsArray,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar agregados.';
    const status = message.toLowerCase().includes('token') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
