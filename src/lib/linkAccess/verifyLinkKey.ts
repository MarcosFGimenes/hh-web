import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Folder } from '@/types/folder';

export async function verifyLinkKey(folderId: string, key: string): Promise<Folder | null> {
  if (!folderId || !key) return null;

  const snapshot = await getAdminDb().collection('folders').doc(folderId).get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() as Omit<Folder, 'id'>;
  const incomingHash = crypto.createHash('sha256').update(key).digest('hex');

  if (incomingHash !== data.linkKeyHash) {
    return null;
  }

  return { id: snapshot.id, ...data };
}
