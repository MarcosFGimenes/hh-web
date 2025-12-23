"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Toast } from '@/components/Toast';
import { MaintainerSection } from '@/components/maintainers/MaintainerSection';
import { AddTimeModal } from '@/components/maintainers/AddTimeModal';
import { OsCardView } from '@/components/maintainers/OsCardView';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOs } from '@/types/maintainerOs';
import type { ServiceOrder } from '@/types/os';
import { normalizeTime, validateShiftPair } from '@/lib/time/base';

type FolderResponse = {
  folder: { id: string; name: string; updatedAt: number };
  maintainers: (Maintainer & { os?: MaintainerOs[] })[];
  userRole: 'ADMIN' | 'THIRD';
};

type PageProps = {
  params: { folderId: string };
};

export default function PublicFolderPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const folderId = params.folderId;
  const [data, setData] = useState<FolderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<{ maintainerId: string; shiftId?: string | null; start?: string; end?: string } | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [showAddOsFor, setShowAddOsFor] = useState<string | null>(null);
  const [osForm, setOsForm] = useState<{ orderId: string; osNumber: string; description: string; startTime: string; endTime: string }>({
    orderId: '',
    osNumber: '',
    description: '',
    startTime: '',
    endTime: '',
  });

  const linkKey = useMemo(() => searchParams.get('k') || '', [searchParams]);
  const canAddMaintainer = data?.userRole === 'ADMIN' || data?.userRole === 'THIRD';

  const fetchJSON = async () => {
    const response = await fetch(`/api/p/folders/${folderId}/maintainers?k=${encodeURIComponent(linkKey)}`, {
      cache: 'no-store',
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || 'Erro ao carregar dados.');
    }
    return json as FolderResponse;
  };

  const fetchOrders = async () => {
    const response = await fetch(`/api/p/folders/${folderId}/os?k=${encodeURIComponent(linkKey)}`, {
      cache: 'no-store',
    });
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
        const response = await fetchJSON();
        const ordersList = await fetchOrders();
        setData(response);
        setOrders(ordersList);
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
  }, [folderId, linkKey]);

  const refetch = async () => {
    try {
      const response = await fetchJSON();
      const ordersList = await fetchOrders();
      setData(response);
      setOrders(ordersList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar dados.';
      setError(message);
    }
  };

  const handleAddMaintainer = async (name: string) => {
    if (!data || !canAddMaintainer) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      const response = await fetch(`/api/p/folders/${folderId}/maintainers?k=${encodeURIComponent(linkKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao adicionar mantenedor.');
      }
      setData((prev) => (prev ? { ...prev, maintainers: [json.maintainer, ...prev.maintainers] } : prev));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar mantenedor.';
      setError(message);
    }
  };

  const handleSaveMaintainerTime = async (maintainerId: string, start: string, end: string) => {
    if (!data) return;
    const normalizedStart = normalizeTime(start);
    const normalizedEnd = normalizeTime(end);
    const shiftId = activeShift?.shiftId ?? null;

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

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/time?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startTime: normalizedStart, endTime: normalizedEnd, shiftId }),
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
      setActiveShift(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário.';
      setError(message);
    }
  };

  const handleUpdateOsTime = async (
    maintainerId: string,
    osId: string,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/os/${osId}?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao salvar horário da O.S.');
      }
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário da O.S.';
      setError(message);
    }
  };

  const loadingSkeleton = (
    <div className="stack">
      <div className="ui-card" style={{ minHeight: '140px', opacity: 0.7 }} />
      <div className="ui-card" style={{ minHeight: '180px', opacity: 0.7 }} />
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
    <main className="public-main">
      <div className="container public-container">
        {loading ? loadingSkeleton : null}
        {!loading && error ? errorState : null}
        {!loading && !error && data ? (
          <div className="stack">
            <div className="public-hero">
              <div>
                <h1 className="public-title">{data.folder.name}</h1>
                <p className="dashboard-subtitle">Acesso público com token seguro</p>
              </div>
            </div>

            <OsCardView folderName={data.folder.name} updatedAt={data.folder.updatedAt} />

            <MaintainerSection
              maintainers={data.maintainers}
              canAdd={canAddMaintainer}
              onAdd={handleAddMaintainer}
              onAddExtra={(id) => setActiveShift({ maintainerId: id, shiftId: null, start: '', end: '' })}
              onSelectShift={(maintainerId, shiftId, startTime, endTime) =>
                setActiveShift({ maintainerId, shiftId: shiftId || null, start: startTime, end: endTime })
              }
              onAddOs={(id) => {
                setShowAddOsFor(id);
                setOsForm({ orderId: '', osNumber: '', description: '', startTime: '', endTime: '' });
              }}
              onUpdateOsTime={handleUpdateOsTime}
            />
          </div>
        ) : null}

        {activeShift ? (
          <AddTimeModal
            open={Boolean(activeShift)}
            onClose={() => setActiveShift(null)}
            onSave={(start, end) => handleSaveMaintainerTime(activeShift.maintainerId, start, end)}
            initialStart={activeShift.start || ''}
            initialEnd={activeShift.end || ''}
          />
        ) : null}

        {showAddOsFor ? (
          <Modal
            title="Adicionar O.S."
            open={Boolean(showAddOsFor)}
            onClose={() => {
              setShowAddOsFor(null);
              setOsForm({ orderId: '', osNumber: '', description: '', startTime: '', endTime: '' });
            }}
          >
            <form
              className="stack"
              onSubmit={async (event) => {
                event.preventDefault();
                const targetMaintainer = data?.maintainers.find((item) => item.id === showAddOsFor);
                if (!data || !targetMaintainer) return;

                const selectedOrder = orders.find((order) => order.id === osForm.orderId);
                const osNumber = selectedOrder ? selectedOrder.osCode : osForm.osNumber.trim();
                const description = selectedOrder ? selectedOrder.description : osForm.description.trim();
                const start = normalizeTime(osForm.startTime);
                const end = normalizeTime(osForm.endTime);

                if (!osNumber || !description) {
                  setError('Preencha a O.S. e a descrição.');
                  return;
                }
                if ((start && !end) || (!start && end)) {
                  setError('Informe entrada e saída da O.S., ou deixe ambos vazios.');
                  return;
                }
                if (start && end) {
                  const validation = validateShiftPair(start, end);
                  if (!validation.ok) {
                    setError(validation.message || 'Horário da O.S. inválido.');
                    return;
                  }
                  const hasOverlap = (targetMaintainer.os || []).some(
                    (item) => item.startTime && item.endTime && start < item.endTime && item.startTime < end
                  );
                  if (hasOverlap) {
                    setError('Os horários desta O.S. não podem se sobrepor com outros deste mantenedor.');
                    return;
                  }
                }

                try {
                  const response = await fetch(
                    `/api/p/folders/${folderId}/maintainers/${targetMaintainer.id}/os?k=${encodeURIComponent(linkKey)}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        osNumber,
                        description,
                        startTime: start || null,
                        endTime: end || null,
                      }),
                    }
                  );
                  const json = await response.json();
                  if (!response.ok) {
                    throw new Error(json?.error || 'Erro ao adicionar O.S.');
                  }
                  setData((prev) =>
                    prev
                      ? {
                          ...prev,
                          maintainers: prev.maintainers.map((item) =>
                            item.id === targetMaintainer.id
                              ? { ...item, os: [json.os, ...(item.os || [])] }
                              : item
                          ),
                        }
                      : prev
                  );
                  setShowAddOsFor(null);
                  setOsForm({ orderId: '', osNumber: '', description: '', startTime: '', endTime: '' });
                  setError(null);
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Erro ao adicionar O.S.';
                  setError(message);
                }
              }}
            >
              <div className="stack">
                <label className="ui-field">
                  <span className="ui-field-label">O.S. cadastradas</span>
                  <select
                    className="ui-input"
                    value={osForm.orderId}
                    onChange={(event) => {
                      const orderId = event.target.value;
                      const selected = orders.find((order) => order.id === orderId);
                      setOsForm((prev) => ({
                        ...prev,
                        orderId,
                        osNumber: selected ? selected.osCode : '',
                        description: selected ? selected.description : prev.description,
                      }));
                    }}
                  >
                    <option value="">Selecione uma O.S.</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.osCode} — {order.description}
                      </option>
                    ))}
                    <option value="custom">Outra O.S. (digitar)</option>
                  </select>
                </label>

                {osForm.orderId === 'custom' || !osForm.orderId ? (
                  <>
                    <Input
                      label="Número da O.S."
                      value={osForm.osNumber}
                      onChange={(event) => setOsForm((prev) => ({ ...prev, osNumber: event.target.value }))}
                      required
                    />
                    <Input
                      label="Descrição"
                      value={osForm.description}
                      onChange={(event) => setOsForm((prev) => ({ ...prev, description: event.target.value }))}
                      required
                    />
                  </>
                ) : null}

                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <Input
                    label="Entrada"
                    type="time"
                    value={osForm.startTime}
                    onChange={(event) => setOsForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  />
                  <Input
                    label="Saída"
                    type="time"
                    value={osForm.endTime}
                    onChange={(event) => setOsForm((prev) => ({ ...prev, endTime: event.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowAddOsFor(null);
                      setOsForm({ orderId: '', osNumber: '', description: '', startTime: '', endTime: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar O.S.</Button>
                </div>
              </div>
            </form>
          </Modal>
        ) : null}

        {error ? <Toast type="error" message={error} /> : null}
      </div>
    </main>
  );
}
