import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAdminEnv, getClientEnv } from '../env';

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const adminEnv = getAdminEnv();

  const app =
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

  cachedApp = app;
  return app;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminBucket() {
  return getStorage(getAdminApp()).bucket(getClientEnv().storageBucket);
}

export { getAdminApp };
