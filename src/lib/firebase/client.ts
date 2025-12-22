import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getClientEnv } from '../env';

let cachedApp: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp;

  const clientEnv = getClientEnv();
  if (!clientEnv) return null;

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

export function getClientAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export { getFirebaseApp as firebaseApp };
