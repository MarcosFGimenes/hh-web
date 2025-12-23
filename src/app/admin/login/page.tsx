"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export const dynamic = 'force-dynamic';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, configError } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  if (user) {
    const redirect = searchParams.get('redirect') || '/admin';
    router.replace(redirect);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailValid) {
      setError('Informe um e-mail válido para continuar.');
      return;
    }
    if (!password.trim()) {
      setError('Informe sua senha para continuar.');
      return;
    }
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

  const formDisabled = submitting || Boolean(configError);

  return (
    <main className="auth-main auth-main-immersive">
      <div className="auth-grid auth-grid-balanced">
        <div className="auth-hero auth-hero-modern">
          <div className="auth-hero-badge">Portal do PCM</div>
          <h1>Login do administrador</h1>
          <p className="auth-hero-text">
            Acesse o painel para gerenciar pastas, acompanhar lançamentos do terceiro e garantir visibilidade total das
            operações.
          </p>
          <div className="auth-hero-bullets">
            <div className="bullet-item">
              <span className="bullet-icon" aria-hidden>
                🔗
              </span>
              <div>
                <p className="bullet-title">Links privados por pasta</p>
                <p className="bullet-text">Compartilhe acessos seguros para manteredores externos.</p>
              </div>
            </div>
            <div className="bullet-item">
              <span className="bullet-icon" aria-hidden>
                🕑
              </span>
              <div>
                <p className="bullet-title">Histórico e controle</p>
                <p className="bullet-text">Auditoria centralizada de acessos e alterações.</p>
              </div>
            </div>
            <div className="bullet-item">
              <span className="bullet-icon" aria-hidden>
                📋
              </span>
              <div>
                <p className="bullet-title">Lançamentos unificados</p>
                <p className="bullet-text">Visualize O.S., TAGs e mantenedores em um só lugar.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-panel-modern">
          <Card title="Acesse sua conta" subtitle="Use suas credenciais corporativas para continuar.">
            <form className="stack login-form" onSubmit={handleSubmit} noValidate>
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={formDisabled}
                icon="✉️"
                className="ui-input-lg"
                aria-invalid={Boolean(error)}
              />
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={formDisabled}
                icon="🔒"
                className="ui-input-lg"
                aria-invalid={Boolean(error)}
                rightSlot={
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                }
              />

              <div className="login-options">
                <label className="remember-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={formDisabled}
                  />
                  <span>Lembrar-me</span>
                </label>
                <button type="button" className="link-button" aria-label="Esqueci minha senha (ação futura)">
                  Esqueci minha senha
                </button>
              </div>

              <Button type="submit" fullWidth isLoading={submitting} disabled={formDisabled} loadingText="Entrando...">
                Entrar
              </Button>

              {error ? (
                <div role="alert" className="login-error">
                  {error}
                </div>
              ) : null}
              {configError ? (
                <p className="footer-note" style={{ color: '#b91c1c', fontWeight: 600 }}>
                  {configError}
                </p>
              ) : null}
            </form>
          </Card>

          {error ? <Toast type="error" message={error} /> : null}
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-main">
          <div className="container">
            <p className="footer-note">Carregando login...</p>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
