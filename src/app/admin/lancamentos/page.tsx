"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminGuard } from '@/components/AdminGuard';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Folder } from '@/types/folder';
import type { Employee } from '@/types/employee';
import type { Service } from '@/types/service';

type EntryService = Service & {
  osCode: string;
  tag: string;
  machineName: string;
};

type EntryEmployee = Employee & {
  services: EntryService[];
};

type EntryDay = {
  date: string;
  employees: EntryEmployee[];
};

type EntriesResponse = {
  folder: { id: string; name: string; company: string | null };
  entries: EntryDay[];
};

type LaunchRecord = {
  id: string;
  folderId: string;
  folderName: string;
  company: string | null;
  date: string;
  employeeName: string;
  osCode: string;
  tag: string;
  machineName: string;
  description: string;
  totalMinutes: number | null;
};

const formatDate = (value: string) => value.split('-').reverse().join('/');

export default function ManageEntriesPage() {
  const { idToken } = useAdminAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [launches, setLaunches] = useState<LaunchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const adminFetch = async (input: string, init?: RequestInit) => {
    if (!idToken) throw new Error('Token do administrador indisponível.');
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${idToken}`);
    headers.set('Content-Type', 'application/json');
    return fetch(input, { ...init, headers });
  };

  const buildLaunches = (folder: Folder, entries: EntryDay[]): LaunchRecord[] => {
    const records: LaunchRecord[] = [];

    entries.forEach((entry) => {
      if (!entry.employees.length) {
        records.push({
          id: `${folder.id}-${entry.date}-empty`,
          folderId: folder.id,
          folderName: folder.name,
          company: folder.company ?? null,
          date: entry.date,
          employeeName: 'Sem funcionários',
          osCode: '—',
          tag: '',
          machineName: '',
          description: 'Nenhum funcionário lançado nesta data.',
          totalMinutes: null,
        });
        return;
      }

      entry.employees.forEach((employee) => {
        if (!employee.services.length) {
          records.push({
            id: `${folder.id}-${entry.date}-${employee.id}-no-services`,
            folderId: folder.id,
            folderName: folder.name,
            company: folder.company ?? null,
            date: entry.date,
            employeeName: employee.name,
            osCode: '—',
            tag: '',
            machineName: '',
            description: 'Nenhum serviço lançado para este mantenedor.',
            totalMinutes: employee.totalMinutes ?? null,
          });
          return;
        }

        employee.services.forEach((service) => {
          records.push({
            id: `${folder.id}-${entry.date}-${employee.id}-${service.id}`,
            folderId: folder.id,
            folderName: folder.name,
            company: folder.company ?? null,
            date: entry.date,
            employeeName: employee.name,
            osCode: service.osCode || 'O.S. não informada',
            tag: service.tag,
            machineName: service.machineName,
            description: service.description,
            totalMinutes: service.totalMinutes ?? employee.totalMinutes ?? null,
          });
        });
      });
    });

    return records;
  };

  const load = async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const foldersResponse = await adminFetch('/api/admin/folders');
      const foldersJson = await foldersResponse.json();
      if (!foldersResponse.ok) throw new Error(foldersJson.error || 'Erro ao carregar pastas.');
      const fetchedFolders: Folder[] = foldersJson.folders ?? [];
      setFolders(fetchedFolders);

      const entriesPayload = await Promise.all(
        fetchedFolders.map(async (folder) => {
          const response = await adminFetch(`/api/admin/folders/${folder.id}/entries`);
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Erro ao carregar lançamentos.');
          return { folder, entries: (json as EntriesResponse).entries ?? [] };
        })
      );

      const consolidated = entriesPayload.flatMap(({ folder, entries }) => buildLaunches(folder, entries));
      consolidated.sort((a, b) => b.date.localeCompare(a.date));
      setLaunches(consolidated);
      setSuccess('Lançamentos consolidados carregados.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar lançamentos.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!idToken) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [error, success]);

  const filteredLaunches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return launches.filter((launch) => {
      const folderMatch = selectedFolder === 'all' ? true : launch.folderId === selectedFolder;
      const dateMatch = selectedDate ? launch.date === selectedDate : true;
      const queryMatch = query
        ? [launch.employeeName, launch.osCode, launch.tag, launch.machineName, launch.company, launch.description]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(query))
        : true;
      return folderMatch && dateMatch && queryMatch;
    });
  }, [launches, searchTerm, selectedDate, selectedFolder]);

  return (
    <AdminGuard>
      <main className="entries-main">
        <section className="entries-shell">
          <header className="entries-header">
            <div className="entries-title-group">
              <span className="entries-badge">Painel</span>
              <h1 className="entries-title">Gerenciar lançamentos</h1>
              <p className="entries-subtitle">
                Consulte e filtre lançamentos de todas as pastas em um único lugar.
              </p>
            </div>
            <div className="entries-actions">
              <Button type="button" variant="secondary" onClick={load} disabled={loading} aria-label="Atualizar painel">
                {loading ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <Link href="/admin">
                <Button variant="outline" type="button" aria-label="Voltar ao dashboard do PCM">
                  Voltar ao dashboard
                </Button>
              </Link>
            </div>
          </header>

          <section className="entries-controls manager">
            <div className="entries-control-grid">
              <label className="ui-field">
                <span className="ui-field-label">Pasta</span>
                <select
                  className="ui-input"
                  value={selectedFolder}
                  onChange={(event) => setSelectedFolder(event.target.value)}
                >
                  <option value="all">Todas as pastas</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                type="date"
                label="Data"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              <Input
                type="search"
                label="Busca por mantenedor, O.S. ou TAG"
                placeholder="Ex.: João, 2001, TAG"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="entries-count">
              <span className="entries-count-badge">
                {filteredLaunches.length} {filteredLaunches.length === 1 ? 'lançamento' : 'lançamentos'}
              </span>
              <p className="entries-count-hint">Use os filtros para refinar a visão consolidada.</p>
            </div>
          </section>

          {loading && !launches.length ? (
            <article className="entry-card">
              <p className="entry-signature">Buscando lançamentos consolidados...</p>
            </article>
          ) : null}

          <section className="launches-grid">
            {filteredLaunches.map((launch) => (
              <article key={launch.id} className="launch-card">
                <header className="launch-card-head">
                  <div>
                    <span className="entries-chip strong">{launch.folderName}</span>
                    <p className="launch-folder-meta">{launch.company || 'Responsável não informado'}</p>
                  </div>
                  <div className="launch-badges">
                    <span className="entries-chip subtle">{formatDate(launch.date)}</span>
                    <span className="entries-chip">{launch.osCode}</span>
                  </div>
                </header>
                <p className="launch-title">{launch.employeeName}</p>
                <p className="launch-meta">
                  {launch.machineName ? `${launch.machineName} • ` : ''}
                  {launch.tag ? `TAG ${launch.tag}` : 'Sem TAG'}
                  {launch.totalMinutes != null ? ` • ${launch.totalMinutes} min` : ''}
                </p>
                <p className="launch-description">{launch.description || 'Sem observações.'}</p>
                <div className="launch-actions">
                  <Link href={`/admin/pastas/${launch.folderId}/lancamentos`}>
                    <Button variant="outline" type="button">
                      Ir para a pasta
                    </Button>
                  </Link>
                </div>
              </article>
            ))}

            {!loading && filteredLaunches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden>
                  🔎
                </div>
                <div>
                  <p className="footer-note">Nenhum lançamento corresponde aos filtros.</p>
                  <p className="footer-note">Ajuste os filtros ou atualize para tentar novamente.</p>
                </div>
              </div>
            ) : null}
          </section>
        </section>

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </main>
    </AdminGuard>
  );
}
