import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getClientEnv } from '../env';

let cachedApp: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;

  const clientEnv = getClientEnv();

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          apiKey: clientEnv.apiKey,
          authDomain: clientEnv.authDomain,
          projectId: clientEnv.projectId,
          storageBucket: clientEnv.storageBucket,
          messagingSenderId: clientEnv.messagingSenderId,
          appId: clientEnv.appId,
        });

  cachedApp = app;
  return app;
}

export function getClientAuth() {
  return getAuth(getFirebaseApp());
}

export { getFirebaseApp as firebaseApp };
