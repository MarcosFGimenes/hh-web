"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Toast } from '@/components/Toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Folder } from '@/types/folder';

type FormMode = 'create' | 'rename';

export default function AdminFoldersPage() {
  const { idToken } = useAdminAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [linkKey, setLinkKey] = useState<string | null>(null);
  const [linkFolderId, setLinkFolderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const apiHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${idToken || ''}`,
      'Content-Type': 'application/json',
    }),
    [idToken]
  );

  const fetchFolders = async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/folders', { headers: apiHeaders });
      if (!response.ok) {
        throw new Error('Não foi possível carregar as pastas.');
      }
      const data = await response.json();
      setFolders(data.folders ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar pastas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  const handleCreateOrRename = async () => {
    if (!name.trim()) {
      setToast({ type: 'error', message: 'Informe um nome para a pasta.' });
      return;
    }

    try {
      if (formMode === 'create') {
        const response = await fetch('/api/admin/folders', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ name }),
        });
        if (!response.ok) {
          throw new Error('Erro ao criar pasta.');
        }
        const data = await response.json();
        setLinkKey(data.linkKey);
        setLinkFolderId(data.folder.id);
        setFolders((prev) => [data.folder, ...prev]);
        setToast({ type: 'success', message: 'Pasta criada com sucesso.' });
      } else if (formMode === 'rename' && selectedId) {
        const response = await fetch('/api/admin/folders', {
          method: 'PATCH',
          headers: apiHeaders,
          body: JSON.stringify({ id: selectedId, name }),
        });
        if (!response.ok) {
          throw new Error('Erro ao renomear pasta.');
        }
        setFolders((prev) => prev.map((folder) => (folder.id === selectedId ? { ...folder, name } : folder)));
        setToast({ type: 'success', message: 'Pasta renomeada.' });
      }
      setFormOpen(false);
      setName('');
      setSelectedId(null);
      setLinkFolderId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar pasta.';
      setToast({ type: 'error', message });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch('/api/admin/folders', {
        method: 'DELETE',
        headers: apiHeaders,
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error('Erro ao excluir pasta.');
      }
      setFolders((prev) => prev.filter((folder) => folder.id !== id));
      setToast({ type: 'success', message: 'Pasta excluída.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao excluir pasta.';
      setToast({ type: 'error', message });
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = () => {
    setFormMode('create');
    setFormOpen(true);
    setName('');
    setSelectedId(null);
    setLinkKey(null);
    setLinkFolderId(null);
  };

  const openRenameModal = (folder: Folder) => {
    setFormMode('rename');
    setFormOpen(true);
    setName(folder.name);
    setSelectedId(folder.id);
    setLinkKey(null);
    setLinkFolderId(null);
  };

  return (
    <main>
      <div className="container">
        <Card
          title="Pastas de serviço"
          subtitle="Gerencie pastas, compartilhe links privados com terceiros e acompanhe lançamentos."
          action={
            <Button variant="primary" type="button" onClick={openCreateModal}>
              Nova pasta
            </Button>
          }
        >
          {loading ? <p className="footer-note">Carregando...</p> : null}
          {error ? <Toast type="error" message={error} /> : null}
          <div className="list">
            {folders.map((folder) => (
              <div key={folder.id} className="list-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                  <div>
                    <strong>{folder.name}</strong>
                    <div className="footer-note">ID: {folder.id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" type="button" onClick={() => openRenameModal(folder)}>
                      Renomear
                    </Button>
                    <Button variant="ghost" type="button" disabled={deletingId === folder.id} onClick={() => handleDelete(folder.id)}>
                      {deletingId === folder.id ? 'Excluindo...' : 'Excluir'}
                    </Button>
                  </div>
                </div>
                <div className="footer-note" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span>Link privado: /p/{folder.id}?k=&lt;linkKey&gt;</span>
                  <span>Hash armazenado: {folder.linkHash.slice(0, 12)}...</span>
                </div>
              </div>
            ))}
            {folders.length === 0 && !loading ? <p className="footer-note">Nenhuma pasta criada.</p> : null}
          </div>
        </Card>

        {linkKey && linkFolderId ? (
          <Card title="Link privado gerado" subtitle="Guarde esta chave, ela só é exibida uma vez.">
            <div className="list">
              <div className="list-item">
                Link:{' '}
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${linkFolderId}?k=${linkKey}`}
              </div>
              <div className="list-item">Chave: {linkKey}</div>
            </div>
          </Card>
        ) : null}
      </div>

      <Modal
        title={formMode === 'create' ? 'Nova pasta' : 'Renomear pasta'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      >
        <div className="stack">
          <Input label="Nome da pasta" value={name} onChange={(event) => setName(event.target.value)} required />
          <Button type="button" onClick={handleCreateOrRename}>
            {formMode === 'create' ? 'Criar pasta' : 'Salvar nome'}
          </Button>
        </div>
      </Modal>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </main>
  );
}
