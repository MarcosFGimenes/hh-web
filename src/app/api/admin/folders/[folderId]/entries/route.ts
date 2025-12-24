import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/getAdminToken';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Employee } from '@/types/employee';
import type { Service } from '@/types/service';
import type { ServiceOrder } from '@/types/os';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOsLog } from '@/types/maintainerOsLog';
import { parseTimeToMinutes } from '@/lib/time/base';

type Params = { params: { folderId: string } };

const folderRef = (folderId: string) => getAdminDb().collection('folders').doc(folderId);

type Interval = { startTime: string; endTime: string };

type EntryService = Service & {
  osCode: string;
  tag: string;
  machineName: string;
  intervals?: Interval[];
};

type EntryEmployee = Employee & {
  services: EntryService[];
  shifts?: Array<{ id: string; startTime: string; endTime: string }>;
};

type EntryDay = {
  date: string;
  signatureName: string | null;
  signatureUrl: string | null;
  signedAt: number | null;
  employees: EntryEmployee[];
};

const mapOs = (doc: FirebaseFirestore.QueryDocumentSnapshot): ServiceOrder => {
  const data = doc.data() as Omit<ServiceOrder, 'id'>;
  return { id: doc.id, ...data };
};

const mapMaintainer = (doc: FirebaseFirestore.QueryDocumentSnapshot): Maintainer => {
  const data = doc.data() as Omit<Maintainer, 'id'>;
  const createdAt = (data as { createdAt?: number }).createdAt || Date.now();
  const date = (data as { date?: string }).date || new Date(createdAt).toISOString().slice(0, 10);
  const base: Maintainer = { id: doc.id, ...data, date, createdAt };

  if (!base.shifts || base.shifts.length === 0) {
    const hasLegacyShift = base.startTime && base.endTime;
    base.shifts = hasLegacyShift ? [{ id: `${doc.id}-legacy`, startTime: base.startTime!, endTime: base.endTime! }] : [];
  }

  return base;
};

const mapOsLog = (doc: FirebaseFirestore.QueryDocumentSnapshot): MaintainerOsLog => {
  const data = doc.data() as Omit<MaintainerOsLog, 'id'>;
  return { id: doc.id, ...data };
};

const toIntervalsFromService = (service: Service): Interval[] => {
  const intervals: Interval[] = [];
  if (service.t1In && service.t1Out) {
    intervals.push({ startTime: service.t1In, endTime: service.t1Out });
  }
  if (service.t2In && service.t2Out) {
    intervals.push({ startTime: service.t2In, endTime: service.t2Out });
  }
  return intervals;
};

const computeIntervalsMinutes = (intervals: Interval[]) =>
  intervals.reduce((total, interval) => {
    const start = parseTimeToMinutes(interval.startTime);
    const end = parseTimeToMinutes(interval.endTime);
    if (start === null || end === null || end <= start) return total;
    return total + (end - start);
  }, 0);

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

    const entriesByDate = new Map<string, EntryDay>();

    const entriesFromDays = await Promise.all(
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
                const intervals = toIntervalsFromService(serviceData as Service);
                return {
                  id: serviceDoc.id,
                  ...serviceData,
                  osCode: os?.osCode || '',
                  tag: os?.tag || '',
                  machineName: os?.machineName || '',
                  intervals,
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

    entriesFromDays.forEach((entry) => {
      entriesByDate.set(entry.date, entry);
    });

    const maintainersSnapshot = await folderRef(folderId).collection('maintainers').get();
    const maintainers = await Promise.all(
      maintainersSnapshot.docs.map(async (maintainerDoc) => {
        const maintainer = mapMaintainer(maintainerDoc);
        const logsSnapshot = await maintainerDoc.ref.collection('osLogs').where('date', '==', maintainer.date).get();
        const logs = logsSnapshot.docs.map(mapOsLog);
        return { maintainer, logs };
      })
    );

    maintainers.forEach(({ maintainer, logs }) => {
      const entry = entriesByDate.get(maintainer.date) || {
        date: maintainer.date,
        signatureName: null,
        signatureUrl: null,
        signedAt: null,
        employees: [],
      };

      const logsByOs = logs.reduce<Record<string, MaintainerOsLog[]>>((acc, log) => {
        acc[log.osId] = [...(acc[log.osId] || []), log];
        return acc;
      }, {});

      const services = Object.entries(logsByOs).map(([osId, osLogs]) => {
        const os = osMap.get(osId);
        const sortedIntervals = osLogs
          .slice()
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((log) => ({ startTime: log.startTime, endTime: log.endTime }));
        const totalMinutes = sortedIntervals.length ? computeIntervalsMinutes(sortedIntervals) : 0;
        return {
          id: `${maintainer.id}-${osId}`,
          osId,
          description: os?.description || '',
          t1In: sortedIntervals[0]?.startTime || '',
          t1Out: sortedIntervals[0]?.endTime || '',
          t2In: sortedIntervals[1]?.startTime || '',
          t2Out: sortedIntervals[1]?.endTime || '',
          totalMinutes,
          createdAt: maintainer.createdAt,
          updatedAt: maintainer.updatedAt,
          osCode: os?.osCode || '',
          tag: os?.tag || '',
          machineName: os?.machineName || '',
          intervals: sortedIntervals,
        };
      });

      const totalMinutes = services.length ? services.reduce((sum, service) => sum + (service.totalMinutes || 0), 0) : null;

      entry.employees.push({
        id: maintainer.id,
        name: maintainer.name,
        totalMinutes,
        createdAt: maintainer.createdAt,
        updatedAt: maintainer.updatedAt,
        services,
        shifts: (maintainer.shifts || []).map((shift) => ({
          id: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
        })),
      });

      entriesByDate.set(entry.date, entry);
    });

    const entries = Array.from(entriesByDate.values()).sort((a, b) => b.date.localeCompare(a.date));

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
