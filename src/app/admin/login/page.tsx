"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <main>
      <div className="container">
        <Card title="Login do administrador" subtitle="Use suas credenciais Firebase (futuro).">
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
            <Button type="submit" fullWidth>
              Entrar
            </Button>
            <p className="footer-note">
              Nesta etapa o login é um placeholder. A integração com Firebase Authentication será adicionada na próxima
              fase.
            </p>
          </form>
        </Card>

        {showToast ? <Toast type="info" message="Placeholder: autenticação será implementada." /> : null}
      </div>
    </main>
  );
}
