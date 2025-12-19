import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminEnv } from '../env';

const adminEnv = getAdminEnv();

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: adminEnv.projectId,
          clientEmail: adminEnv.clientEmail,
          privateKey: adminEnv.privateKey,
        }),
        projectId: adminEnv.projectId,
      });

export const adminDb = getFirestore(adminApp);
export { adminApp };
