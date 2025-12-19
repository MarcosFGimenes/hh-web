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

export const getClientEnv = (): ClientEnv => ({
  apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'configure em .env.local'),
  authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
});

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
