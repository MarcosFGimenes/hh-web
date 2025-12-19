import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getClientEnv } from '../env';

const clientEnv = getClientEnv();

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: clientEnv.apiKey,
      authDomain: clientEnv.authDomain,
      projectId: clientEnv.projectId,
      storageBucket: clientEnv.storageBucket,
      messagingSenderId: clientEnv.messagingSenderId,
      appId: clientEnv.appId,
    });

export const auth = getAuth(firebaseApp);
export { firebaseApp };
