import { getAdminDb } from '@/lib/firebase/admin';
import type { ServiceOrder } from '@/types/os';

export const osCollectionRef = (folderId: string) =>
  getAdminDb().collection('folders').doc(folderId).collection('os');

export const mapOsDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot): ServiceOrder => {
  const data = doc.data() as Omit<ServiceOrder, 'id'>;
  return {
    id: doc.id,
    osCode: data.osCode || '',
    tag: data.tag || '',
    machineName: data.machineName || '',
    description: data.description || '',
    createdByRole: data.createdByRole || 'ADMIN',
    createdByUserId: data.createdByUserId ?? null,
    isExternal: Boolean((data as { isExternal?: boolean }).isExternal),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};
