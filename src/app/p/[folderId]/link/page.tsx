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
import { normalizeTime, validateShiftPair } from '@/lib/time/base';

type FolderResponse = {
  folder: { id: string; name: string; updatedAt: number };
  maintainers: Maintainer[];
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
    const response = await fetch(
      `/api/p/folders/${folderId}/maintainers?k=${encodeURIComponent(linkKey)}`,
      { cache: 'no-store' }
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

  const handleAddMaintainer = () => {
    if (!data || !canAddMaintainer) return;
    const name = typeof window !== 'undefined' ? window.prompt('Nome do mantenedor')?.trim() : '';
    if (!name) return;
    const now = Date.now();
    setData((prev) =>
      prev
        ? {
            ...prev,
            maintainers: [
              {
                id: `local-${now}`,
                name,
                startTime: null,
                endTime: null,
                extraMinutes: null,
                createdAt: now,
                updatedAt: now,
              },
              ...prev.maintainers,
            ],
          }
        : prev
    );
  };

  const handleSaveMaintainerTime = (maintainerId: string, start: string, end: string) => {
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

    const now = Date.now();
    setData((prev) =>
      prev
        ? {
            ...prev,
            maintainers: prev.maintainers.map((item) =>
              item.id === maintainerId
                ? { ...item, startTime: normalizedStart, endTime: normalizedEnd, updatedAt: now }
                : item
            ),
          }
        : prev
    );
    setShowAddTimeFor(null);
    setError(null);
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
