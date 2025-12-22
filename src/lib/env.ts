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
  const missing = CLIENT_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      'Firebase client não configurado. Defina as variáveis NEXT_PUBLIC_FIREBASE_* para habilitar login do admin.',
      `Variáveis faltando: ${missing.join(', ')}`
    );
    return null;
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
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
