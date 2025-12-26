"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AdminGuard } from '@/components/AdminGuard';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Folder } from '@/types/folder';
import { Toast } from '@/components/Toast';

export default function AdminDashboardPlaceholder() {
  const { user, signOut } = useAdminAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [lastLinks, setLastLinks] = useState<Record<string, string>>({});
  const [layoutHydrated, setLayoutHydrated] = useState(false);
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

  const buildPrivateLink = (folderId: string, linkKey: string) => {
    const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const origin =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : fallbackOrigin;
    return `${origin.replace(/\/+$/, '')}/p/${folderId}/link?k=${linkKey}`;
  };

  const persistLayout = (layout: Record<'backlog' | 'progress' | 'done', Folder[]>) => {
    if (typeof window === 'undefined') return;
    const payload = {
      backlog: layout.backlog.map((folder) => folder.id),
      progress: layout.progress.map((folder) => folder.id),
      done: layout.done.map((folder) => folder.id),
    };
    localStorage.setItem('hh-admin-kanban-layout', JSON.stringify(payload));
  };

  const applySavedLayout = (items: Folder[]) => {
    if (typeof window === 'undefined') {
      return {
        backlog: items,
        progress: [],
        done: [],
      };
    }

    const raw = localStorage.getItem('hh-admin-kanban-layout');
    if (!raw) {
      return {
        backlog: items,
        progress: [],
        done: [],
      };
    }

    try {
      const saved = JSON.parse(raw) as { backlog?: string[]; progress?: string[]; done?: string[] };
      const map = new Map(items.map((item) => [item.id, item]));

      const buildLane = (ids: string[] = []) =>
        ids.map((id) => map.get(id)).filter(Boolean) as Folder[];

      const backlog = buildLane(saved.backlog);
      const progress = buildLane(saved.progress);
      const done = buildLane(saved.done);

      const usedIds = new Set([...backlog, ...progress, ...done].map((item) => item.id));
      const remaining = items.filter((item) => !usedIds.has(item.id));

      return {
        backlog: [...backlog, ...remaining],
        progress,
        done,
      };
    } catch {
      return {
        backlog: items,
        progress: [],
        done: [],
      };
    }
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
        setLanes(applySavedLayout(fetched));
        setLayoutHydrated(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao listar pastas.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  useEffect(() => {
    if (!layoutHydrated) return;
    persistLayout(lanes);
  }, [lanes, layoutHydrated]);

  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [error, success]);

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

  const toggleCardActions = (folderId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleRename = async (folderId: string, currentName: string) => {
    const newName = typeof window !== 'undefined' ? window.prompt('Novo nome da pasta', currentName)?.trim() : '';
    if (!newName || newName === currentName) return;
    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao renomear a pasta.');

      setLanes((prev) => {
        const updateLane = (items: Folder[]) =>
          items.map((item) => (item.id === folderId ? { ...item, name: data.folder.name } : item));
        return {
          backlog: updateLane(prev.backlog),
          progress: updateLane(prev.progress),
          done: updateLane(prev.done),
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao renomear a pasta.';
      setError(message);
    }
  };

  const generateLink = async (folderId: string) => {
    const response = await adminFetch(`/api/admin/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ rotateLinkKey: true }),
    });
    const data = await response.json();
    if (!response.ok || !data.linkKey) {
      throw new Error(data.error || 'Não foi possível gerar o link privado.');
    }
    const link = buildPrivateLink(folderId, data.linkKey);
    setLastLinks((prev) => ({ ...prev, [folderId]: link }));
    return link;
  };

  const handleCopyLink = async (folderId: string) => {
    try {
      const link = lastLinks[folderId] ?? (await generateLink(folderId));
      if (navigator?.clipboard?.writeText && document?.hasFocus?.()) {
        await navigator.clipboard.writeText(link);
      }
      setSuccess('Link copiado para a área de transferência.');
    } catch (err) {
      // Evita quebrar o carregamento quando o navegador bloqueia acesso à área de transferência.
      // O usuário ainda pode clicar em \"Gerenciar Pastas\" para copiar o link manualmente.
      console.warn('Não foi possível copiar para a área de transferência:', err);
      setError('Não foi possível copiar o link.');
    }
  };

  const openLink = (link: string) => {
    const url = link.startsWith('http') ? link : `${window.location.origin}${link}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenLink = async (folderId: string) => {
    try {
      const link = lastLinks[folderId] ?? (await generateLink(folderId));
      openLink(link);
      setSuccess('Link aberto em nova aba.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir link.';
      setError(message);
    }
  };

  const renderCard = (folder: Folder) => (
    <div
      key={folder.id}
      className={`kanban-card${draggingId === folder.id ? ' kanban-card-dragging' : ''}`}
      draggable
      onDragStart={() => onDragStart(folder.id)}
      onDragEnd={onDragEnd}
      onDoubleClick={() => toggleCardActions(folder.id)}
    >
      <p className="kanban-card-title">{folder.name}</p>
      <p className="kanban-card-meta">Responsável: {folder.company || '—'}</p>
      {expandedCards.has(folder.id) ? (
        <div className="kanban-card-actions">
          <Button type="button" variant="secondary" onClick={() => handleRename(folder.id, folder.name)}>
            Renomear
          </Button>
          <Link href={`/admin/pastas/${folder.id}/lancamentos`}>
            <Button type="button" variant="secondary">
              Lançamentos
            </Button>
          </Link>
          <Link href={`/admin/pastas/${folder.id}/os`}>
            <Button type="button" variant="secondary">
              Gerenciar O.S.
            </Button>
          </Link>
          <Link href={`/admin/pastas/${folder.id}/fechamento`}>
            <Button type="button" variant="secondary">
              Fechamento
            </Button>
          </Link>
          <Button type="button" variant="primary" onClick={() => handleCopyLink(folder.id)}>
            Copiar link
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleOpenLink(folder.id)}>
            Abrir link
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <AdminGuard>
      <main className="dashboard-main">
        <div className="dashboard-shell">
          <header className="dashboard-header">
            <div>
              <p className="ui-badge ui-badge-info">Lar Cooperativa Agroindustrial</p>
              <h1>Dashboard do PCM</h1>
              <p className="dashboard-subtitle">
                Consolide pastas de serviço e acompanhe o fluxo em um painel visual.
              </p>
            </div>
            <div className="dashboard-actions">
              <div className="dashboard-actions-row">
                <Link href="/admin/pastas">
                  <Button variant="primary" type="button" className="dashboard-action-button">
                    Gerenciar Pastas
                  </Button>
                </Link>
                <Link href="/admin/fechamentos">
                  <Button variant="secondary" type="button" className="dashboard-action-button">
                    Gerenciar Fechamentos
                  </Button>
                </Link>
                <Link href="/admin/os">
                  <Button variant="secondary" type="button" className="dashboard-action-button">
                    Gerenciar O.S.
                  </Button>
                </Link>
                <Link href="/admin/lancamentos">
                  <Button variant="secondary" type="button" className="dashboard-action-button">
                    Gerenciar Lançamentos
                  </Button>
                </Link>
                {user ? (
                  <Button variant="danger" type="button" onClick={signOut} className="dashboard-action-button">
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
      {error ? <Toast type="error" message={error} /> : null}
      {success ? <Toast type="success" message={success} /> : null}
    </AdminGuard>
  );
}
