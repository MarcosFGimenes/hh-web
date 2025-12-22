type ClientEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type AdminEnv = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const requireEnv = (key: string, hint?: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Env ${key} é obrigatório${hint ? `: ${hint}` : ''}`);
  }
  return value;
};

const CLIENT_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

export const getClientEnv = (): ClientEnv | null => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const missing = CLIENT_KEYS.filter((key) => {
    switch (key) {
      case 'NEXT_PUBLIC_FIREBASE_API_KEY':
        return !apiKey;
      case 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN':
        return !authDomain;
      case 'NEXT_PUBLIC_FIREBASE_PROJECT_ID':
        return !projectId;
      case 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET':
        return !storageBucket;
      case 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID':
        return !messagingSenderId;
      case 'NEXT_PUBLIC_FIREBASE_APP_ID':
        return !appId;
      default:
        return true;
    }
  });

  if (missing.length > 0) {
    console.error(
      'Firebase client não configurado. Defina as variáveis NEXT_PUBLIC_FIREBASE_* para habilitar login do admin.',
      `Variáveis faltando: ${missing.join(', ')}`
    );
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
};

export const getAdminEnv = (): AdminEnv => {
  const projectId = requireEnv('FIREBASE_ADMIN_PROJECT_ID', 'ID do projeto Firebase');
  const clientEmail = requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL', 'E-mail do serviço');
  const privateKeyRaw = requireEnv('FIREBASE_ADMIN_PRIVATE_KEY', 'chave privada do serviço');
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};
