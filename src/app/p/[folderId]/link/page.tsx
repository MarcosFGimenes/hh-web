"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';
import { MaintainerSection } from '@/components/maintainers/MaintainerSection';
import { AddOsModal } from '@/components/maintainers/AddOsModal';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOsLog } from '@/types/maintainerOsLog';
import type { ServiceOrder } from '@/types/os';

type FolderResponse = {
  folder: {
    id: string;
    name: string;
    updatedAt: number;
    foCode?: string | null;
    foEmission?: string | null;
    foRevision?: string | null;
    foNumber?: string | number | null;
  };
  maintainers: (Maintainer & { osLogs?: MaintainerOsLog[] })[];
  userRole: 'ADMIN' | 'THIRD';
};

type ManageMaintainerModalProps = {
  title: string;
  open: boolean;
  initialName: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  onOpenOs?: () => void;
};

function ManageMaintainerModal({
  title,
  open,
  initialName,
  confirmLabel = 'Salvar',
  confirmVariant = 'primary',
  onClose,
  onSubmit,
  onOpenOs,
}: ManageMaintainerModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  return (
    <Modal title={title} open={open} onClose={onClose}>
      <form
        className="stack modal-edit-form"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(name);
        }}
      >
        <Input
          label="Nome do mantenedor"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={confirmVariant === 'danger'}
        />

        <div className="modal-edit-options">
          <p className="modal-edit-label">Outras opções</p>
          <div className="modal-edit-grid">
            <Button
              type="button"
              variant="secondary"
              className="ui-button-compact"
              onClick={() => {
                onOpenOs?.();
                onClose();
              }}
            >
              Editar O.S.
            </Button>
          </div>
        </div>

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose} aria-label="Cancelar">
            Cancelar
          </Button>
          <Button
            type="submit"
            aria-label={confirmLabel}
            className="ui-button-compact"
            variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type PageProps = {
  params: { folderId: string };
};

export default function PublicFolderPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const folderId = params.folderId;
  const { idToken } = useAdminAuth();
  const [data, setData] = useState<FolderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddOsFor, setShowAddOsFor] = useState<string | null>(null);
  const [editMaintainer, setEditMaintainer] = useState<{ id: string; name: string } | null>(null);
  const [deleteMaintainer, setDeleteMaintainer] = useState<{ id: string; name: string } | null>(null);
  const initialDate = useMemo(() => searchParams.get('date') || new Date().toISOString().slice(0, 10), [searchParams]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [savingOsLog, setSavingOsLog] = useState(false);
  const [addMaintainerTrigger, setAddMaintainerTrigger] = useState(0);
  const formatFoValue = (value: string | number) => String(value);
  const isFoValuePresent = (value: string | number | null | undefined) =>
    value !== null && value !== undefined && value !== '';
  const hasFoData = Boolean(
    data &&
      [data.folder.foCode, data.folder.foEmission, data.folder.foRevision, data.folder.foNumber].every(isFoValuePresent)
  );

  const linkKey = useMemo(() => searchParams.get('k') || '', [searchParams]);
  const canManageMaintainers = true;
  const canCreateMaintainer = Boolean(data);
  const withAuthHeaders = (init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
    return { ...init, headers };
  };

  const fetchJSON = async (date: string) => {
    const response = await fetch(
      `/api/p/folders/${folderId}/maintainers?k=${encodeURIComponent(linkKey)}&date=${encodeURIComponent(date)}`,
      {
        cache: 'no-store',
        ...withAuthHeaders(),
      }
    );
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || 'Erro ao carregar dados.');
    }
    return json as FolderResponse;
  };

  const fetchOrders = async () => {
    const response = await fetch(
      `/api/p/folders/${folderId}/os?k=${encodeURIComponent(linkKey)}`,
      { cache: 'no-store' }
    );
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || 'Erro ao carregar O.S.');
    }
    return json.orders as ServiceOrder[];
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!linkKey) {
          throw new Error('Link inválido ou expirado. Peça um novo link ao administrador.');
        }
        const [response, fetchedOrders] = await Promise.all([fetchJSON(selectedDate), fetchOrders()]);
        setData(response);
        setOrders(fetchedOrders);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Link inválido ou expirado. Peça um novo link ao administrador.';
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, linkKey, selectedDate]);

  useEffect(() => {
    setShowAddOsFor(null);
  }, [selectedDate]);

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

  const refetch = async () => {
    try {
      const [response, fetchedOrders] = await Promise.all([fetchJSON(selectedDate), fetchOrders()]);
      setData(response);
      setOrders(fetchedOrders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar dados.';
      setError(message);
    }
  };

  const handleAddMaintainer = async (name: string) => {
    if (!data || !selectedDate) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      const response = await fetch(`/api/p/folders/${folderId}/maintainers?k=${encodeURIComponent(linkKey)}`, {
        method: 'POST',
        ...withAuthHeaders({ headers: { 'Content-Type': 'application/json' } }),
        body: JSON.stringify({ name: trimmedName, date: selectedDate }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao adicionar mantenedor.');
      }
      setData((prev) => (prev ? { ...prev, maintainers: [json.maintainer, ...prev.maintainers] } : prev));
      setSuccess('Mantenedor adicionado.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar mantenedor.';
      setError(message);
    }
  };

  const handleAddOs = async (maintainerId: string) => {
    if (!data || !selectedDate) return;
    setShowAddOsFor(maintainerId);
  };
  const handleCreateOrder = async (payload: {
    osCode: string;
    tag?: string;
    machineName?: string;
    description?: string;
  }) => {
    const response = await fetch(`/api/p/folders/${folderId}/os?k=${encodeURIComponent(linkKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || 'Erro ao criar O.S.');
    }
    const created = json.order as ServiceOrder;
    setOrders((prev) => {
      const exists = prev.find((item) => item.id === created.id);
      if (exists) return prev;
      return [created, ...prev];
    });
    return created;
  };

  const handleSaveOsLog = async (
    maintainerId: string,
    osId: string,
    intervals: Array<{ startTime: string; endTime: string }>
  ) => {
    try {
      setSavingOsLog(true);
      const response = await fetch(
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/os-logs?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ osId, date: selectedDate, intervals }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao salvar horário da O.S.');
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              maintainers: prev.maintainers.map((maintainer) =>
                maintainer.id === maintainerId
                  ? { ...maintainer, osLogs: [...(maintainer.osLogs || []), ...(json.logs || [])] }
                  : maintainer
              ),
            }
          : prev
      );
      setShowAddOsFor(null);
      setSuccess('Horário salvo.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário da O.S.';
      setError(message);
    } finally {
      setSavingOsLog(false);
    }
  };

  const loadingSkeleton = (
    <div className="stack">
      <div className="ui-card" style={{ minHeight: '150px', opacity: 0.7 }} />
      <div className="ui-card" style={{ minHeight: '110px', opacity: 0.7 }} />
      <div className="ui-card" style={{ minHeight: '260px', opacity: 0.7 }} />
    </div>
  );

  const errorState = (
    <Card title="Link do Terceiro">
      <p className="footer-note">
        Link inválido ou expirado. Peça um novo link ao administrador.
      </p>
    </Card>
  );

  return (
    <main className="public-main public-surface">
      <div className="container public-container public-shell">
        {loading ? loadingSkeleton : null}
        {!loading && error ? errorState : null}
        {!loading && !error && data ? (
          <div className="stack public-grid">
            <Card className="public-header-card" bodyClassName="public-header-body">
              <div className="public-header-text">
                <p className="ui-badge ui-badge-info public-header-chip">Link do serviço</p>
                <h1 className="public-title">{data.folder.name}</h1>
                <p className="dashboard-subtitle">
                  Acesso público protegido • mantenedores e apontamentos.
                </p>
                <div className="public-header-meta">
                  <p className="public-header-updated">
                    Atualizado em {new Date(data.folder.updatedAt).toLocaleString('pt-BR')}
                  </p>
                  <span className="pill pill-soft">{canManageMaintainers ? 'PCM (admin)' : 'Terceiro'}</span>
                </div>
              </div>
            </Card>

            <Card className="public-date-card" bodyClassName="public-date-toolbar">
              <div className="public-date-left">
                <div className="public-date-copy">
                  <p className="public-date-title">Data do apontamento</p>
                  <p className="public-date-hint">Selecione a data do lançamento.</p>
                </div>
                <div className="public-date-controls">
                  <div className="public-date-input">
                    <Input
                      type="date"
                      required
                      value={selectedDate}
                      className="ui-input-compact"
                      onChange={(event) => {
                        if (!event.target.value) return;
                        setSelectedDate(event.target.value);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    className="ui-button-compact public-date-add-button"
                    onClick={() => setAddMaintainerTrigger((value) => value + 1)}
                  >
                    + Adicionar mantenedor
                  </Button>
                </div>
              </div>
              {hasFoData && data ? (
                <div className="public-date-fo-card">
                  <div className="public-date-fo-title">FO {formatFoValue(data.folder.foCode!)}</div>
                  <div className="public-date-fo-grid">
                    <div>
                      <span className="public-date-fo-label">Emissão</span>
                      <span className="public-date-fo-value">{formatFoValue(data.folder.foEmission!)}</span>
                    </div>
                    <div>
                      <span className="public-date-fo-label">Revisão</span>
                      <span className="public-date-fo-value">{formatFoValue(data.folder.foRevision!)}</span>
                    </div>
                    <div>
                      <span className="public-date-fo-label">Nº</span>
                      <span className="public-date-fo-value">{formatFoValue(data.folder.foNumber!)}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>

              <MaintainerSection
                maintainers={data.maintainers}
                orders={orders}
                canAdd
                canManage
                canCreateMaintainer={canCreateMaintainer}
                openAddMaintainerToken={addMaintainerTrigger}
                onCloseAddMaintainer={() => setAddMaintainerTrigger(0)}
                onAdd={handleAddMaintainer}
                onAddOs={handleAddOs}
                onEdit={(id, name) => setEditMaintainer({ id, name })}
                onDelete={(id, name) => setDeleteMaintainer({ id, name })}
              />
          </div>
        ) : null}

        {showAddOsFor && data ? (
          <AddOsModal
            open={Boolean(showAddOsFor)}
            date={selectedDate}
            maintainerName={data.maintainers.find((item) => item.id === showAddOsFor)?.name || 'Mantenedor'}
            existingIntervals={
              data.maintainers
                .find((item) => item.id === showAddOsFor)
                ?.osLogs?.map((log) => ({ startTime: log.startTime, endTime: log.endTime })) || []
            }
            availability={
              data.maintainers.find((item) => item.id === showAddOsFor)?.shifts?.length
                ? data.maintainers.find((item) => item.id === showAddOsFor)?.shifts?.map(({ startTime, endTime }) => ({
                    startTime,
                    endTime,
                  }))
                : data.maintainers.find((item) => item.id === showAddOsFor)?.startTime &&
                  data.maintainers.find((item) => item.id === showAddOsFor)?.endTime
                ? [
                    {
                      startTime: data.maintainers.find((item) => item.id === showAddOsFor)!.startTime as string,
                      endTime: data.maintainers.find((item) => item.id === showAddOsFor)!.endTime as string,
                    },
                  ]
                : []
            }
            orders={orders}
            onClose={() => setShowAddOsFor(null)}
            onCreateOs={handleCreateOrder}
            onSubmit={(osId, intervals) => handleSaveOsLog(showAddOsFor, osId, intervals)}
            isSubmitting={savingOsLog}
          />
        ) : null}

        <ManageMaintainerModal
          title="Editar mantenedor"
          open={Boolean(editMaintainer)}
          initialName={editMaintainer?.name || ''}
          onOpenOs={
            editMaintainer
              ? () => {
                  setShowAddOsFor(editMaintainer.id);
                }
              : undefined
          }
          onClose={() => setEditMaintainer(null)}
          onSubmit={async (name) => {
            if (!editMaintainer) return;
            const trimmed = name.trim();
            if (!trimmed) return;
            try {
              const response = await fetch(
                `/api/p/folders/${folderId}/maintainers/${editMaintainer.id}?k=${encodeURIComponent(linkKey)}`,
                {
                  method: 'PATCH',
                  ...withAuthHeaders({ headers: { 'Content-Type': 'application/json' } }),
                  body: JSON.stringify({ name: trimmed }),
                }
              );
              const json = await response.json();
              if (!response.ok) throw new Error(json?.error || 'Erro ao editar mantenedor.');
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      maintainers: prev.maintainers.map((item) =>
                        item.id === editMaintainer.id ? { ...item, ...json.maintainer } : item
                      ),
                    }
                  : prev
              );
              setSuccess('Mantenedor atualizado.');
              setEditMaintainer(null);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Erro ao editar mantenedor.';
              setError(message);
            }
          }}
        />

        <ManageMaintainerModal
          title="Excluir mantenedor"
          open={Boolean(deleteMaintainer)}
          initialName={deleteMaintainer?.name || ''}
          confirmLabel="Excluir"
          confirmVariant="danger"
          onClose={() => setDeleteMaintainer(null)}
          onSubmit={async () => {
            if (!deleteMaintainer) return;
            try {
              const response = await fetch(
                `/api/p/folders/${folderId}/maintainers/${deleteMaintainer.id}?k=${encodeURIComponent(linkKey)}`,
                {
                  method: 'DELETE',
                  ...withAuthHeaders(),
                }
              );
              const json = await response.json();
              if (!response.ok) throw new Error(json?.error || 'Erro ao excluir mantenedor.');
              setData((prev) =>
                prev ? { ...prev, maintainers: prev.maintainers.filter((item) => item.id !== deleteMaintainer.id) } : prev
              );
              setSuccess('Mantenedor excluído.');
              setDeleteMaintainer(null);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Erro ao excluir mantenedor.';
              setError(message);
            }
          }}
        />

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </div>
    </main>
  );
}
