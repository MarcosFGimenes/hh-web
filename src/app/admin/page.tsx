"use client";

import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminDashboardPlaceholder() {
  const { user, signOut } = useAdminAuth();

  return (
    <main>
      <div className="container">
        <Card
          title="Área do administrador"
          subtitle="Placeholder para gerenciamento de pastas, O.S e links privados."
          action={
            <Link href="/admin/pastas">
              <Button variant="secondary" type="button">
                Gerenciar pastas
              </Button>
            </Link>
          }
        >
          <p className="footer-note">
            Em etapas futuras, esta página permitirá criar pastas de serviço, cadastrar O.S, gerar links privados e
            acompanhar lançamentos dos terceiros.
          </p>
          <div className="list">
            <Link href="/admin/pastas" className="list-item" style={{ textDecoration: 'none' }}>
              Gerenciar pastas e links privados
            </Link>
          </div>
          {user ? (
            <div className="list">
              <div className="list-item">Administrador autenticado: {user.email}</div>
              <Button variant="ghost" type="button" onClick={signOut}>
                Sair
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
