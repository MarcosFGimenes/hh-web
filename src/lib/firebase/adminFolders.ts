import type { Folder } from '@/types/folder';
import { getAdminDb } from './admin';

const COLLECTION = 'folders';

type FolderSnapshot = {
  docRef: FirebaseFirestore.DocumentReference;
  data: Folder;
};

export async function getCompanyFolder(folderId: string, companyId: string): Promise<FolderSnapshot | null> {
  const docRef = getAdminDb().collection(COLLECTION).doc(folderId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Omit<Folder, 'id'>;

  if (data.companyId && data.companyId !== companyId) {
    return null;
  }

  if (!data.companyId) {
    const now = Date.now();
    await docRef.update({ companyId, updatedAt: now });
    return {
      docRef,
      data: { id: snapshot.id, ...data, companyId, updatedAt: now },
    };
  }

  return { docRef, data: { id: snapshot.id, ...data } };
}
