"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AdminGuard } from '@/components/AdminGuard';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Folder } from '@/types/folder';

export default function AdminDashboardPlaceholder() {
  const { user, signOut } = useAdminAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lanes, setLanes] = useState<Record<'backlog' | 'progress' | 'done', Folder[]>>({
    backlog: [],
    progress: [],
    done: [],
  });

  const totalCount = useMemo(
    () => lanes.backlog.length + lanes.progress.length + lanes.done.length,
    [lanes.backlog.length, lanes.progress.length, lanes.done.length]
  );

  const adminFetch = async (input: string, init?: RequestInit) => {
    const token = await user?.getIdToken?.();
    if (!token) throw new Error('Token do administrador indisponível.');

    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    return fetch(input, { ...init, headers });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminFetch('/api/admin/folders');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao carregar pastas.');
        const fetched: Folder[] = data.folders ?? [];
        setFolders(fetched);
        setLanes({
          backlog: fetched,
          progress: [],
          done: [],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao listar pastas.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const onDragStart = (folderId: string) => setDraggingId(folderId);

  const onDragEnd = () => setDraggingId(null);

  const moveFolder = (folderId: string, targetLane: keyof typeof lanes) => {
    setLanes((current) => {
      const next: Record<'backlog' | 'progress' | 'done', Folder[]> = {
        backlog: [],
        progress: [],
        done: [],
      };

      let moving: Folder | null = null;
      (Object.keys(current) as Array<keyof typeof current>).forEach((key) => {
        current[key].forEach((folder) => {
          if (folder.id === folderId) {
            moving = folder;
            return;
          }
          next[key].push(folder);
        });
      });

      if (moving) {
        next[targetLane] = [...next[targetLane], moving];
      }

      return next;
    });
    onDragEnd();
  };

  const renderCard = (folder: Folder) => (
    <div
      key={folder.id}
      className={`kanban-card${draggingId === folder.id ? ' kanban-card-dragging' : ''}`}
      draggable
      onDragStart={() => onDragStart(folder.id)}
      onDragEnd={onDragEnd}
    >
      <p className="kanban-card-title">{folder.name}</p>
      <p className="kanban-card-meta">Responsável: {folder.company || '—'}</p>
    </div>
  );

  return (
    <AdminGuard>
      <main className="dashboard-main">
        <div className="dashboard-shell">
          <header className="dashboard-header">
            <div>
              <p className="chip">Painel visual</p>
              <h1>Quadro do administrador</h1>
              <p className="dashboard-subtitle">
                Consolide pastas de serviço e acompanhe o fluxo em um painel visual.
              </p>
            </div>
            <div className="dashboard-actions">
              <div className="dashboard-actions-row">
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
          </header>

          <div className="kanban-board">
            {(['backlog', 'progress', 'done'] as const).map((laneKey) => (
              <section
                key={laneKey}
                className="kanban-column"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggingId) moveFolder(draggingId, laneKey);
                }}
              >
                <header className="kanban-column-header">
                  <div>
                    <p className="kanban-column-label">
                      {laneKey === 'backlog' ? 'Entrada' : laneKey === 'progress' ? 'Execução' : 'Finalização'}
                    </p>
                    <h3>
                      {laneKey === 'backlog'
                        ? 'Novas demandas'
                        : laneKey === 'progress'
                        ? 'Em andamento'
                        : 'Concluído'}
                    </h3>
                  </div>
                  <span className="kanban-pill">{lanes[laneKey].length}</span>
                </header>
                {loading ? (
                  <p className="kanban-card-meta">Carregando pastas...</p>
                ) : lanes[laneKey].length > 0 ? (
                  lanes[laneKey].map(renderCard)
                ) : (
                  <div className="kanban-card kanban-card-muted">
                    <p className="kanban-card-title">Sem pastas</p>
                    <p className="kanban-card-meta">
                      {laneKey === 'backlog'
                        ? 'Crie pastas na área de pastas.'
                        : 'Arraste pastas para esta coluna.'}
                    </p>
                  </div>
                )}
              </section>
            ))}
          </div>

          {error ? (
            <div className="kanban-card kanban-card-muted" style={{ borderStyle: 'dashed', color: '#b91c1c' }}>
              <p className="kanban-card-title">Erro ao carregar pastas</p>
              <p className="kanban-card-meta">{error}</p>
            </div>
          ) : null}

          {!loading && totalCount === 0 ? (
            <div className="kanban-card kanban-card-muted">
              <p className="kanban-card-title">Nenhuma pasta cadastrada</p>
              <p className="kanban-card-meta">
                Crie pastas em &quot;Gerenciar pastas&quot; e arraste-as entre colunas para organizar o fluxo.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </AdminGuard>
  );
}
