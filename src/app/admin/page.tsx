"use client";

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminDashboardPlaceholder() {
  const { user, signOut } = useAdminAuth();

  return (
    <main>
      <div className="container">
        <Card
          title="Área do administrador"
          subtitle="Placeholder para gerenciamento de pastas, O.S e links privados."
          action={<Button variant="secondary">Nova pasta</Button>}
        >
          <p className="footer-note">
            Em etapas futuras, esta página permitirá criar pastas de serviço, cadastrar O.S, gerar links privados e
            acompanhar lançamentos dos terceiros.
          </p>
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
