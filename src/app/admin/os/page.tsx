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

export default function AdminOsPage() {
  const { idToken } = useAdminAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const filteredFolders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return folders;
    return folders.filter((folder) =>
      [folder.name, folder.company].filter(Boolean).some((field) => field!.toLowerCase().includes(term))
    );
  }, [folders, search]);

  return (
    <AdminGuard>
      <main>
        <div className="container admin-folders-page">
          <Card
            title="Gerenciar O.S."
            subtitle="Selecione a pasta desejada para gerenciar as ordens de serviço."
            action={
              <Link href="/admin">
                <Button variant="outline" type="button">
                  Voltar
                </Button>
              </Link>
            }
            className="admin-folders-card"
            bodyClassName="stack"
          >
            <Input
              label="Buscar pasta"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite o nome ou empresa"
            />
          </Card>

          <Card
            title="Pastas disponíveis"
            subtitle={loading ? 'Carregando...' : filteredFolders.length ? '' : 'Nenhuma pasta encontrada.'}
            className="admin-folders-card"
            bodyClassName="stack"
          >
            {filteredFolders.length ? (
              <div className="list">
                {filteredFolders.map((folder) => (
                  <div key={folder.id} className="list-item admin-folder-item">
                    <div className="admin-folder-details">
                      <strong>{folder.name}</strong>
                      <div className="footer-note">Responsável: {folder.company || '—'}</div>
                      <div className="footer-note">
                        Atualizado em {new Date(folder.updatedAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="admin-folder-controls">
                      <Link href={`/admin/pastas/${folder.id}/os`}>
                        <Button type="button" variant="secondary">
                          Gerenciar O.S.
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="footer-note">{loading ? 'Carregando pastas...' : 'Nenhuma pasta encontrada.'}</p>
            )}
          </Card>
        </div>

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </main>
    </AdminGuard>
  );
}
