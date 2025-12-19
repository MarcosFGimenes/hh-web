"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type AdminGuardProps = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const redirect = encodeURIComponent(pathname || '/admin');
      router.replace(`/admin/login?redirect=${redirect}`);
    }
  }, [loading, user, router, pathname]);

  if (!user) {
    return (
      <main>
        <div className="container">
          <p className="footer-note">Redirecionando para login...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
