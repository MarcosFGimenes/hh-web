"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { AdminGuard } from '@/components/AdminGuard';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Folder } from '@/types/folder';

type FolderListItem = Folder & {
  lastLink?: string;
};

export default function AdminFoldersPage() {
  const { idToken } = useAdminAuth();
  const [folders, setFolders] = useState<FolderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState('');
  const [creatingCompany, setCreatingCompany] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null);

  const hasFolders = useMemo(() => folders.length > 0, [folders]);

  const adminFetch = async (input: string, init?: RequestInit) => {
    if (!idToken) {
      throw new Error('Token do administrador indisponível.');
    }

    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${idToken}`);
    headers.set('Content-Type', 'application/json');

    return fetch(input, { ...init, headers });
  };

  const loadFolders = async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetch('/api/admin/folders');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar pastas.');
      }

      setFolders(data.folders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao listar pastas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  const buildPrivateLink = (folderId: string, linkKey: string) => {
    const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const origin =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : fallbackOrigin;
    return `${origin.replace(/\/+$/, '')}/p/${folderId}/link?k=${linkKey}`;
  };

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, success]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creatingName.trim()) return;

    try {
      const response = await adminFetch('/api/admin/folders', {
        method: 'POST',
        body: JSON.stringify({ name: creatingName, company: creatingCompany }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível criar a pasta.');
      }

      const link = buildPrivateLink(data.folder.id, data.linkKey);
      setFolders((prev) => [{ ...data.folder, lastLink: link }, ...prev]);
      setSuccess('Pasta criada e link privado gerado.');
      setCreatingName('');
      setCreatingCompany('');
      setLastCreatedLink(link);
      await copyLink(link);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar a pasta.';
      setError(message);
    }
  };

  const handleRename = async (folderId: string) => {
    if (!editingName.trim()) {
      setError('O nome não pode ser vazio.');
      return;
    }

    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingName }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao renomear a pasta.');
      }

      setFolders((prev) => prev.map((folder) => (folder.id === folderId ? { ...folder, name: data.folder.name } : folder)));
      setSuccess('Pasta renomeada.');
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao renomear.';
      setError(message);
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!confirm('Deseja excluir esta pasta? Essa ação não pode ser desfeita.')) return;

    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir a pasta.');
      }

      setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
      setSuccess('Pasta excluída.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir.';
      setError(message);
    }
  };

  const generateLink = async (folderId: string) => {
    const folder = folders.find((item) => item.id === folderId);

    if (folder?.lastLink) {
      return folder.lastLink;
    }

    const response = await adminFetch(`/api/admin/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ rotateLinkKey: true }),
    });
    const data = await response.json();

    if (!response.ok || !data.linkKey) {
      throw new Error(data.error || 'Não foi possível gerar o link privado.');
    }

    const link = buildPrivateLink(folderId, data.linkKey);

    setFolders((prev) =>
      prev.map((item) =>
        item.id === folderId
          ? {
              ...item,
              lastLink: link,
              updatedAt: data.folder?.updatedAt ?? item.updatedAt,
            }
          : item
      )
    );
    setLastCreatedLink(link);

    return link;
  };

  const handleCopyLink = async (folderId: string) => {
    try {
      const link = await generateLink(folderId);
      await copyLink(link);
      setSuccess('Link privado copiado para a área de transferência.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao copiar link.';
      setError(message);
    }
  };

  const copyLink = async (link: string) => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
    }
  };

  const startEditing = (folder: Folder) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const openLink = (link: string) => {
    const url = link.startsWith('http') ? link : `${window.location.origin}${link}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenFolderLink = async (folderId: string) => {
    try {
      const link = await generateLink(folderId);
      openLink(link);
      setSuccess('Link aberto em nova aba.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir link.';
      setError(message);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <AdminGuard>
      <main>
        <div className="container admin-folders-page">
          <Card
            title="Pastas de serviço"
            subtitle="Cadastre e gerencie pastas. Cada pasta possui um link privado para lançamentos do terceiro."
            action={<Link href="/admin">Voltar</Link>}
            className="admin-folders-card"
            bodyClassName="stack"
          >
            <form className="stack" onSubmit={handleCreate}>
              <Input
                label="Nome da pasta"
                placeholder="Ex.: Manutenção Linha 1"
                value={creatingName}
                onChange={(event) => setCreatingName(event.target.value)}
                required
              />
              <Input
                label="Empresa responsável"
                placeholder="Ex.: ACME Serviços Industriais"
                value={creatingCompany}
                onChange={(event) => setCreatingCompany(event.target.value)}
                required
              />
              <div className="admin-folders-actions">
                <Button
                  type="submit"
                  disabled={!creatingName.trim() || !creatingCompany.trim()}
                  className="ui-button-compact"
                >
                  Criar pasta e gerar link
                </Button>
              </div>
              {lastCreatedLink ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button type="button" variant="primary" onClick={() => openLink(lastCreatedLink)}>
                    Abrir link gerado
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => copyLink(lastCreatedLink)}>
                    Copiar link
                  </Button>
                </div>
              ) : null}
            </form>
          </Card>

          <Card
            title="Pastas existentes"
            subtitle={loading ? 'Carregando...' : hasFolders ? 'Links podem ser rotacionados a qualquer momento.' : 'Nenhuma pasta criada ainda.'}
            className="admin-folders-card"
            bodyClassName="stack"
          >
            {hasFolders ? (
              <div className="list">
                {folders.map((folder) => (
                  <div key={folder.id} className="list-item">
                    <div className="admin-folder-row">
                      <div className="admin-folder-details">
                        {editingId === folder.id ? (
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            aria-label="Novo nome da pasta"
                          />
                        ) : (
                          <strong>{folder.name}</strong>
                        )}
                        <div className="footer-note">Responsável: {folder.company || '—'}</div>
                        <div className="footer-note">Atualizado em {new Date(folder.updatedAt).toLocaleString('pt-BR')}</div>
                        {folder.lastLink ? (
                          <div className="footer-note" style={{ wordBreak: 'break-all' }}>
                            Último link emitido: {folder.lastLink}
                          </div>
                        ) : null}
                        <div className="admin-folder-actions">
                          <Link href={`/admin/pastas/${folder.id}/os`}>
                            <Button type="button" variant="secondary" className="ui-button-dark">
                              Gerenciar O.S.
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="admin-folder-controls">
                        {editingId === folder.id ? (
                          <>
                            <Button type="button" variant="primary" onClick={() => handleRename(folder.id)}>
                              Salvar
                            </Button>
                            <Button type="button" variant="ghost" onClick={cancelEditing}>
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button type="button" variant="secondary" onClick={() => startEditing(folder)}>
                              Renomear
                            </Button>
                            <Button type="button" variant="primary" onClick={() => handleCopyLink(folder.id)}>
                              Copiar link privado
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleOpenFolderLink(folder.id)}
                            >
                              Abrir link
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => handleDelete(folder.id)}>
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="footer-note">Nenhuma pasta cadastrada. Crie a primeira para gerar um link privado.</p>
            )}
          </Card>

          {error ? <Toast type="error" message={error} /> : null}
          {success ? <Toast type="success" message={success} /> : null}
        </div>
      </main>
    </AdminGuard>
  );
}
