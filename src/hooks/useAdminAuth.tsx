"use client";

import {
  User,
  type Auth,
  getIdToken,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getClientAuth } from '@/lib/firebase/client';

type AdminAuthContextValue = {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      setConfigError(
        'Login do admin indisponível: verifique as variáveis NEXT_PUBLIC_FIREBASE_* (API key, Auth domain, Project ID, Storage bucket, Messaging sender ID e App ID).'
      );
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await getIdToken(firebaseUser, true);
        setIdToken(token);
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getClientAuth();
    if (!auth) {
      const message =
        'Login do admin indisponível: verifique as variáveis NEXT_PUBLIC_FIREBASE_* (API key, Auth domain, Project ID, Storage bucket, Messaging sender ID e App ID).';
      setConfigError(message);
      throw new Error(message);
    }
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
    setLoading(false);
  };

  const signOut = async () => {
    const auth = getClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await firebaseSignOut(auth);
    setLoading(false);
  };

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      loading,
      idToken,
      configError,
      signIn,
      signOut,
    }),
    [user, loading, idToken, configError]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider.');
  }
  return context;
}
