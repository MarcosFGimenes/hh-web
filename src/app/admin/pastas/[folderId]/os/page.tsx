"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { ServiceOrder } from '@/types/os';

type OrderWithEdit = ServiceOrder;

export default function FolderServiceOrdersPage() {
  const params = useParams<{ folderId: string }>();
  const folderId = params.folderId;
  const { idToken } = useAdminAuth();

  const [orders, setOrders] = useState<OrderWithEdit[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState({
    osCode: '',
    tag: '',
    machineName: '',
    description: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState({
    osCode: '',
    tag: '',
    machineName: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const adminFetch = async (input: string, init?: RequestInit) => {
    if (!idToken) throw new Error('Token do administrador indisponível.');
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${idToken}`);
    headers.set('Content-Type', 'application/json');
    return fetch(input, { ...init, headers });
  };

  const loadOrders = async () => {
    if (!idToken || !folderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao listar O.S.');
      setOrders(data.orders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao carregar O.S.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, folderId]);

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      [order.osCode, order.tag, order.machineName, order.description].some((field) =>
        field.toLowerCase().includes(term)
      )
    );
  }, [orders, search]);

  const updateCreating = (key: keyof typeof creating, value: string) => {
    setCreating((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditing = (key: keyof typeof editing, value: string) => {
    setEditing((prev) => ({ ...prev, [key]: value }));
  };

  const validateOrderPayload = (payload: typeof creating) =>
    payload.osCode.trim() && payload.tag.trim() && payload.machineName.trim() && payload.description.trim();

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateOrderPayload(creating)) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os`, {
        method: 'POST',
        body: JSON.stringify(creating),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar O.S.');
      setOrders((prev) => [data.order, ...prev]);
      setCreating({ osCode: '', tag: '', machineName: '', description: '' });
      setSuccess('O.S. criada com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar O.S.';
      setError(message);
    }
  };

  const startEditing = (order: ServiceOrder) => {
    setEditingId(order.id);
    setEditing({
      osCode: order.osCode,
      tag: order.tag,
      machineName: order.machineName,
      description: order.description,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditing({ osCode: '', tag: '', machineName: '', description: '' });
  };

  const handleSaveEdit = async (orderId: string) => {
    if (!validateOrderPayload(editing)) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao atualizar O.S.');
      setOrders((prev) => prev.map((item) => (item.id === orderId ? data.order : item)));
      setSuccess('O.S. atualizada.');
      cancelEditing();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar O.S.';
      setError(message);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Deseja excluir esta O.S.? Essa ação não poderá ser desfeita.')) return;
    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os/${orderId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao excluir O.S.');
      setOrders((prev) => prev.filter((item) => item.id !== orderId));
      setSuccess('O.S. excluída.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir O.S.';
      setError(message);
    }
  };

  const renderFormFields = (state: typeof creating, onChange: typeof updateCreating | typeof updateEditing) => (
    <>
      <Input
        label="Código da O.S."
        value={state.osCode}
        onChange={(event) => onChange('osCode', event.target.value)}
        required
      />
      <Input label="TAG" value={state.tag} onChange={(event) => onChange('tag', event.target.value)} required />
      <Input
        label="Equipamento"
        value={state.machineName}
        onChange={(event) => onChange('machineName', event.target.value)}
        required
      />
      <label className="ui-field os-textarea-field">
        <span className="ui-field-label">Descrição</span>
        <textarea
          className="ui-textarea"
          rows={5}
          value={state.description}
          onChange={(event) => onChange('description', event.target.value)}
          required
        />
      </label>
    </>
  );

  return (
    <main className="os-page-shell">
      <div className="os-page-container stack os-page">
        <div className="os-header">
          <div className="os-header-content">
            <p className="chip">Gerenciar O.S.</p>
            <h1>Ordens de Serviço</h1>
            <p className="dashboard-subtitle">Cadastre, edite e acompanhe as O.S. desta pasta.</p>
          </div>
          <Link href="/admin/pastas" className="os-header-action os-header-link">
            <Button variant="outline" type="button" aria-label="Voltar para pastas">
              Voltar
            </Button>
          </Link>
        </div>

        <Card
          title="Cadastrar O.S."
          subtitle="Preencha os dados para adicionar uma nova ordem de serviço."
          bodyClassName="stack os-form-body"
          className="os-card os-form-card"
        >
          <form className="stack os-form" onSubmit={handleCreate}>
            <div className="grid os-form-grid">{renderFormFields(creating, updateCreating)}</div>
            <div className="os-form-actions">
              <Button type="submit" disabled={!validateOrderPayload(creating)} aria-label="Cadastrar O.S.">
                Cadastrar O.S.
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Lista de O.S."
          subtitle={loading ? 'Carregando...' : `Total: ${orders.length}`}
          action={
            <div className="os-list-search">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="O.S ou TAG"
                aria-label="Buscar O.S. por código ou TAG"
                className="os-search"
              />
            </div>
          }
          bodyClassName="stack"
          className="os-card os-list-card-shell"
        >
          {filtered.length ? (
            <div className="os-list">
              {filtered.map((order) => (
                <div key={order.id} className="os-list-card">
                  {editingId === order.id ? (
                    <div className="grid os-form-grid">{renderFormFields(editing, updateEditing)}</div>
                  ) : (
                    <div className="os-list-content">
                      <div>
                        <p className="os-code">#{order.osCode}</p>
                        <p className="os-machine">
                          <span className="pill pill-strong">{order.tag}</span>
                          <span className="pill pill-soft">{order.machineName}</span>
                        </p>
                      </div>
                      <p className="os-description">{order.description}</p>
                      <p className="os-updated">Atualizado em {new Date(order.updatedAt).toLocaleString('pt-BR')}</p>
                    </div>
                  )}

                  <div className="os-actions">
                    {editingId === order.id ? (
                      <>
                        <Button type="button" variant="primary" onClick={() => handleSaveEdit(order.id)}>
                          Salvar
                        </Button>
                        <Button type="button" variant="outline" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="secondary" onClick={() => startEditing(order)}>
                          Editar
                        </Button>
                        <Button type="button" variant="danger" onClick={() => handleDelete(order.id)}>
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="os-empty-state">
              <div className="os-empty-icon" aria-hidden="true">
                📄
              </div>
              <p className="os-empty-title">{loading ? 'Carregando O.S...' : 'Nenhuma O.S. cadastrada.'}</p>
              <p className="os-empty-subtitle">Cadastre uma nova ordem de serviço para começar.</p>
            </div>
          )}
        </Card>

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </div>
    </main>
  );
}
