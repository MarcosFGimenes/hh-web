"use client";

import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminDashboardPlaceholder() {
  const { user, signOut } = useAdminAuth();

  return (
    <main className="dashboard-main">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <p className="chip">Painel visual</p>
            <h1>Quadro do administrador</h1>
            <p className="dashboard-subtitle">
              Consolide pastas de serviço e acompanhe o fluxo como um quadro estilo Trello.
            </p>
          </div>
          <div className="dashboard-actions">
            <Link href="/admin/pastas">
              <Button variant="secondary" type="button">
                Gerenciar pastas
              </Button>
            </Link>
            {user ? (
              <Button variant="ghost" type="button" onClick={signOut}>
                Sair
              </Button>
            ) : null}
          </div>
        </header>

        <div className="kanban-board">
          <section className="kanban-column">
            <header className="kanban-column-header">
              <div>
                <p className="kanban-column-label">Entrada</p>
                <h3>Novas demandas</h3>
              </div>
              <span className="kanban-pill">2</span>
            </header>
            <div className="kanban-card">
              <p className="kanban-card-title">Solicitação de pasta</p>
              <p className="kanban-card-meta">Linha 1 — criar link privado</p>
            </div>
            <div className="kanban-card">
              <p className="kanban-card-title">Novo fornecedor</p>
              <p className="kanban-card-meta">Convidar terceirizado com acesso restrito</p>
            </div>
            <Link href="/admin/pastas" className="kanban-card kanban-card-ghost">
              <p className="kanban-card-title">Criar pasta</p>
              <p className="kanban-card-meta">Cadastrar e gerar link em segundos</p>
            </Link>
          </section>

          <section className="kanban-column">
            <header className="kanban-column-header">
              <div>
                <p className="kanban-column-label">Execução</p>
                <h3>Em andamento</h3>
              </div>
              <span className="kanban-pill">3</span>
            </header>
            <div className="kanban-card">
              <p className="kanban-card-title">Cadastro O.S</p>
              <p className="kanban-card-meta">OS 3021 — preencher descrição e horas previstas</p>
            </div>
            <div className="kanban-card">
              <p className="kanban-card-title">Revisar horas</p>
              <p className="kanban-card-meta">Validar lançamentos do terceiro</p>
            </div>
            <div className="kanban-card">
              <p className="kanban-card-title">Notificar equipe</p>
              <p className="kanban-card-meta">Compartilhar novo link privado</p>
            </div>
          </section>

          <section className="kanban-column">
            <header className="kanban-column-header">
              <div>
                <p className="kanban-column-label">Finalização</p>
                <h3>Concluído</h3>
              </div>
              <span className="kanban-pill">1</span>
            </header>
            <div className="kanban-card">
              <p className="kanban-card-title">Link privado gerado</p>
              <p className="kanban-card-meta">/p/linha-1?k=••• copiado para a área de transferência</p>
            </div>
            <div className="kanban-card kanban-card-muted">
              <p className="kanban-card-title">Acompanhe os lançamentos</p>
              <p className="kanban-card-meta">Visual para monitorar horas em tempo real</p>
            </div>
          </section>
        </div>

        {user ? (
          <div className="user-badge">
            <div className="user-avatar">{user.email?.slice(0, 1).toUpperCase()}</div>
            <div>
              <p className="user-name">{user.email}</p>
              <p className="user-meta">Administrador autenticado</p>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
