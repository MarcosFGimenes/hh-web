"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const redirect = searchParams.get('redirect') || '/admin';
    router.replace(redirect);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      const redirect = searchParams.get('redirect') || '/admin';
      router.replace(redirect);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível entrar. Verifique as credenciais e tente novamente.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-main">
      <div className="auth-grid">
        <div className="auth-hero">
          <span className="chip">Acesso seguro</span>
          <h1>Portal do administrador</h1>
          <p>
            Centralize o controle de pastas de serviço, links privados e O.S em uma experiência enxuta. Entrar permite
            gerenciar o quadro de lançamentos e convidar terceiros com segurança.
          </p>

          <div className="auth-showcase">
            <Card title="Snapshot do quadro" subtitle="Visual Trello-like para organizar suas entregas.">
              <div className="kanban-preview">
                <div className="kanban-preview-column">
                  <div className="kanban-preview-title">Novas solicitações</div>
                  <div className="kanban-preview-card">Criar pasta "Linha 1"</div>
                  <div className="kanban-preview-card">Convidar fornecedor</div>
                </div>
                <div className="kanban-preview-column">
                  <div className="kanban-preview-title">Em andamento</div>
                  <div className="kanban-preview-card">Cadastrar O.S 3021</div>
                  <div className="kanban-preview-card">Revisar horas</div>
                </div>
                <div className="kanban-preview-column">
                  <div className="kanban-preview-title">Concluído</div>
                  <div className="kanban-preview-card">Novo link privado</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="auth-panel">
          <Card title="Login do administrador" subtitle="Use suas credenciais Firebase (futuro)">
            <form className="stack" onSubmit={handleSubmit}>
              <Input
                label="E-mail"
                type="email"
                placeholder="admin@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </Button>
              <p className="footer-note">
                Nesta etapa o login já usa Firebase Authentication (email/senha). Defina as variáveis de ambiente do
                Firebase para habilitar o fluxo real.
              </p>
            </form>
          </Card>

          {error ? <Toast type="error" message={error} /> : null}
        </div>
      </div>
    </main>
  );
}
