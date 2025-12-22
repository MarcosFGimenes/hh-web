"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';
import { MaintainerSection } from '@/components/maintainers/MaintainerSection';
import { AddTimeModal } from '@/components/maintainers/AddTimeModal';
import { OsCardView } from '@/components/maintainers/OsCardView';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOs } from '@/types/maintainerOs';
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
  const [showAddTimeFor, setShowAddTimeFor] = useState<string | null>(null);

  const linkKey = useMemo(() => searchParams.get('k') || '', [searchParams]);
  const canAddMaintainer = data?.userRole === 'ADMIN';

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!linkKey) {
          throw new Error('Link inválido ou expirado. Peça um novo link ao administrador.');
        }
        const response = await fetchJSON();
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
  }, [folderId, linkKey]);

  const refetch = async () => {
    try {
      const response = await fetchJSON();
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar dados.';
      setError(message);
    }
  };

  const handleAddMaintainer = async () => {
    if (!data || !canAddMaintainer) return;
    const name = typeof window !== 'undefined' ? window.prompt('Nome do mantenedor')?.trim() : '';
    if (!name) return;
    try {
      const response = await fetch(`/api/p/folders/${folderId}/maintainers?k=${encodeURIComponent(linkKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
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
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/time?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário.';
      setError(message);
    }
  };

  const handleAddOs = async (maintainerId: string) => {
    if (!data || !canAddMaintainer) return;
    const osNumber = typeof window !== 'undefined' ? window.prompt('Número da O.S.')?.trim() : '';
    const description = typeof window !== 'undefined' ? window.prompt('Descrição da O.S.')?.trim() : '';
    if (!osNumber || !description) return;

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/maintainers/${maintainerId}/os?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ osNumber, description }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Erro ao adicionar O.S.');
      }
      await refetch();
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
              <Button
                type="button"
                onClick={() => setShowAddTimeFor('new')}
                disabled={!canAddMaintainer}
                aria-label="Adicionar mantenedor"
              >
                + Adicionar Mantenedor
              </Button>
            </div>

            <OsCardView folderName={data.folder.name} updatedAt={data.folder.updatedAt} />

            <MaintainerSection
              maintainers={data.maintainers}
              canAdd={canAddMaintainer}
              onAdd={handleAddMaintainer}
              onAddExtra={(id) => setShowAddTimeFor(id)}
              onAddOs={handleAddOs}
              onUpdateOsTime={handleUpdateOsTime}
            />
          </div>
        ) : null}

        {showAddTimeFor ? (
          <AddTimeModal
            open={Boolean(showAddTimeFor)}
            onClose={() => setShowAddTimeFor(null)}
            onSave={(start, end) => handleSaveMaintainerTime(showAddTimeFor, start, end)}
            initialStart={data?.maintainers.find((item) => item.id === showAddTimeFor)?.startTime || ''}
            initialEnd={data?.maintainers.find((item) => item.id === showAddTimeFor)?.endTime || ''}
          />
        ) : null}

        {error ? <Toast type="error" message={error} /> : null}
      </div>
    </main>
  );
}
