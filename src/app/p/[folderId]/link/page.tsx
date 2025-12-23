"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';
import { MaintainerSection } from '@/components/maintainers/MaintainerSection';
import { AddTimeModal } from '@/components/maintainers/AddTimeModal';
import { OsCardView } from '@/components/maintainers/OsCardView';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOs } from '@/types/maintainerOs';
import { normalizeTime, validateShiftPair } from '@/lib/time/base';

type FolderResponse = {
  folder: { id: string; name: string; updatedAt: number };
  maintainers: (Maintainer & { os?: MaintainerOs[] })[];
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
};

function ManageMaintainerModal({
  title,
  open,
  initialName,
  confirmLabel = 'Salvar',
  confirmVariant = 'primary',
  onClose,
  onSubmit,
}: ManageMaintainerModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  return (
    <Modal title={title} open={open} onClose={onClose}>
      <form
        className="stack"
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
  const [showAddTimeFor, setShowAddTimeFor] = useState<string | null>(null);
  const [editMaintainer, setEditMaintainer] = useState<{ id: string; name: string } | null>(null);
  const [deleteMaintainer, setDeleteMaintainer] = useState<{ id: string; name: string } | null>(null);
  const initialDate = useMemo(() => searchParams.get('date') || new Date().toISOString().slice(0, 10), [searchParams]);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const linkKey = useMemo(() => searchParams.get('k') || '', [searchParams]);
  const canManageMaintainers = data?.userRole === 'ADMIN';
  const canAddMaintainer = Boolean(canManageMaintainers);
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!linkKey) {
          throw new Error('Link inválido ou expirado. Peça um novo link ao administrador.');
        }
        const response = await fetchJSON(selectedDate);
        setData(response);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Link inválido ou expirado. Peça um novo link ao administrador.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, linkKey, selectedDate]);

  useEffect(() => {
    setShowAddTimeFor(null);
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
      const response = await fetchJSON(selectedDate);
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar dados.';
      setError(message);
    }
  };

  const handleAddMaintainer = async (name: string) => {
    if (!data || !canAddMaintainer || !selectedDate) return;
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

  const handleSaveMaintainerTime = async (maintainerId: string, start: string, end: string) => {
    if (!data || !selectedDate) return;
    const normalizedStart = normalizeTime(start);
    const normalizedEnd = normalizeTime(end);

    if (!normalizedStart && !normalizedEnd) {
      setError('Informe entrada e saída do turno.');
      return;
    }

    const validation = validateShiftPair(normalizedStart, normalizedEnd);
    if (!validation.ok) {
      setError(validation.message || 'Horário inválido.');
      return;
    }

    const maintainer = data.maintainers.find((item) => item.id === maintainerId);
    if (maintainer && maintainer.startTime === normalizedStart && maintainer.endTime === normalizedEnd) {
      setError('Esse horário já está definido para este mantenedor.');
      return;
    }

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/time?k=${encodeURIComponent(linkKey)}&date=${encodeURIComponent(
          selectedDate
        )}`,
        {
          method: 'POST',
          ...withAuthHeaders({ headers: { 'Content-Type': 'application/json' } }),
          body: JSON.stringify({ startTime: normalizedStart, endTime: normalizedEnd }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao salvar horário.');
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              maintainers: prev.maintainers.map((item) => (item.id === maintainerId ? json.maintainer : item)),
            }
          : prev
      );
      setShowAddTimeFor(null);
      setError(null);
      setSuccess('Horário salvo.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário.';
      setError(message);
    }
  };

  const handleAddOs = async (maintainerId: string) => {
    if (!data || !selectedDate) return;
    const osNumber = typeof window !== 'undefined' ? window.prompt('Número da O.S.')?.trim() : '';
    const description = typeof window !== 'undefined' ? window.prompt('Descrição da O.S.')?.trim() : '';
    if (!osNumber || !description) return;

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/os?k=${encodeURIComponent(linkKey)}&date=${encodeURIComponent(
          selectedDate
        )}`,
        {
          method: 'POST',
          ...withAuthHeaders({ headers: { 'Content-Type': 'application/json' } }),
          body: JSON.stringify({ osNumber, description }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao adicionar O.S.');
      }
      await refetch();
      setSuccess('O.S. adicionada.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar O.S.';
      setError(message);
    }
  };

  const handleUpdateOsTime = async (
    maintainerId: string,
    osId: string,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    if (!selectedDate) return;
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/os/${osId}?k=${encodeURIComponent(
          linkKey
        )}&date=${encodeURIComponent(selectedDate)}`,
        {
          method: 'PATCH',
          ...withAuthHeaders({ headers: { 'Content-Type': 'application/json' } }),
          body: JSON.stringify({ field, value }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao salvar horário da O.S.');
      }
      await refetch();
      setSuccess('Horário da O.S. salvo.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário da O.S.';
      setError(message);
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
              <div>
                <p className="chip chip-soft">Link do serviço</p>
                <h1 className="public-title">{data.folder.name}</h1>
                <p className="dashboard-subtitle">Acesso público protegido · mantenedores e apontamentos.</p>
              </div>
              <div className="public-header-meta">
                <p className="footer-note">Atualizado em {new Date(data.folder.updatedAt).toLocaleString('pt-BR')}</p>
                <span className="pill pill-soft">{canManageMaintainers ? 'PCM (admin)' : 'Terceiro'}</span>
              </div>
            </Card>

            <Card className="public-date-card" bodyClassName="public-date-body">
              <Input
                type="date"
                label="Data do apontamento"
                required
                value={selectedDate}
                onChange={(event) => {
                  if (!event.target.value) return;
                  setSelectedDate(event.target.value);
                }}
              />
            </Card>

            <OsCardView folderName={data.folder.name} updatedAt={data.folder.updatedAt} />

            <MaintainerSection
              maintainers={data.maintainers}
              canAdd
              canManage={!!canManageMaintainers}
              onAdd={handleAddMaintainer}
              onAddExtra={(id) => setShowAddTimeFor(id)}
              onAddOs={handleAddOs}
              onUpdateOsTime={handleUpdateOsTime}
              onEdit={(id, name) => setEditMaintainer({ id, name })}
              onDelete={(id, name) => setDeleteMaintainer({ id, name })}
            />
          </div>
        ) : null}

        {showAddTimeFor ? (
          <AddTimeModal
            open={Boolean(showAddTimeFor)}
            onClose={() => setShowAddTimeFor(null)}
            onSave={(start, end) => handleSaveMaintainerTime(showAddTimeFor, start, end)}
            initialStart={
              data?.maintainers.find((item) => item.id === showAddTimeFor)?.shifts?.[0]?.startTime ||
              data?.maintainers.find((item) => item.id === showAddTimeFor)?.startTime ||
              ''
            }
            initialEnd={
              data?.maintainers.find((item) => item.id === showAddTimeFor)?.shifts?.[0]?.endTime ||
              data?.maintainers.find((item) => item.id === showAddTimeFor)?.endTime ||
              ''
            }
          />
        ) : null}

        <ManageMaintainerModal
          title="Editar mantenedor"
          open={Boolean(editMaintainer)}
          initialName={editMaintainer?.name || ''}
          onClose={() => setEditMaintainer(null)}
          onSubmit={async (name) => {
            if (!editMaintainer || !canManageMaintainers) return;
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
                        item.id === editMaintainer.id ? json.maintainer : item
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
            if (!deleteMaintainer || !canManageMaintainers) return;
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
