"use client";

import { AdminAuthProvider } from '@/hooks/useAdminAuth';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
