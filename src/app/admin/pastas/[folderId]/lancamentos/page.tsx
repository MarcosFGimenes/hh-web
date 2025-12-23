"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';
import { Input } from '@/components/Input';
import { useAdminAuth } from '@/hooks/useAdminAuth';
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
  signatureName: string | null;
  signatureUrl: string | null;
  signedAt: number | null;
  employees: EntryEmployee[];
};

type EntriesResponse = {
  folder: { id: string; name: string; company: string | null };
  entries: EntryDay[];
};

const formatDate = (value: string) => value.split('-').reverse().join('/');

export default function FolderEntriesPage() {
  const params = useParams<{ folderId: string }>();
  const folderId = params.folderId;
  const { idToken } = useAdminAuth();

  const [data, setData] = useState<EntriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const adminFetch = async (input: string, init?: RequestInit) => {
    if (!idToken) throw new Error('Token do administrador indisponível.');
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${idToken}`);
    headers.set('Content-Type', 'application/json');
    return fetch(input, { ...init, headers });
  };

  const load = async () => {
    if (!folderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/entries`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Erro ao carregar lançamentos.');
      setData(json as EntriesResponse);
      setSuccess('Lançamentos carregados.');
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
  }, [idToken, folderId]);

  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [error, success]);

  const totalEntries = useMemo(() => data?.entries.length ?? 0, [data]);
  const filteredEntries = useMemo(() => {
    if (!data) return [];
    const query = searchTerm.trim().toLowerCase();
    return data.entries.filter((entry) => {
      const dateMatch = selectedDate ? entry.date === selectedDate : true;
      if (!query) return dateMatch;
      const employeesMatch = entry.employees.some((employee) => {
        const nameMatch = employee.name.toLowerCase().includes(query);
        const serviceMatch = employee.services.some((service) =>
          [service.osCode, service.tag, service.machineName, service.description]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(query))
        );
        return nameMatch || serviceMatch;
      });
      return dateMatch && employeesMatch;
    });
  }, [data, searchTerm, selectedDate]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data) return null;
    const timestamps = data.entries
      .map((entry) => entry.signedAt)
      .filter((value): value is number => Boolean(value));
    if (!timestamps.length) return null;
    const latest = Math.max(...timestamps);
    return new Date(latest).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }, [data]);

  return (
    <AdminGuard>
      <main className="entries-main">
        <section className="entries-shell">
          <header className="entries-header">
            <div className="entries-title-group">
              <span className="entries-badge ui-badge ui-badge-info">Lançamentos do terceiro</span>
              <h1 className="entries-title">{data?.folder.name || 'Carregando...'}</h1>
              <p className="entries-subtitle">
                {data?.folder.company ? `Responsável: ${data.folder.company}` : 'Responsável não informado'}
                {lastUpdatedLabel ? ` • Atualizado em ${lastUpdatedLabel}` : ''}
              </p>
            </div>
            <div className="entries-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={load}
                disabled={loading}
                aria-label="Atualizar lançamentos"
              >
                {loading ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <Link href="/admin">
                <Button variant="outline" type="button" aria-label="Voltar ao dashboard do PCM">
                  Voltar ao dashboard
                </Button>
              </Link>
            </div>
          </header>

          <section className="entries-controls">
            <div className="entries-control-grid">
              <Input
                type="date"
                label="Filtrar por data"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              <Input
                type="search"
                label="Busca por mantenedor ou O.S."
                placeholder="Ex.: Maria, 1234, TAG-01"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="entries-count">
              <span className="entries-count-badge ui-badge ui-badge-strong">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'resultado' : 'resultados'}
              </span>
              {totalEntries ? <p className="entries-count-hint">{totalEntries} datas com lançamentos nesta pasta.</p> : null}
            </div>
          </section>

          {loading && !data ? (
            <Card title="Carregando lançamentos">
              <p className="footer-note">Aguarde, buscando registros do terceiro...</p>
            </Card>
          ) : null}

          {!loading && data && totalEntries === 0 ? (
            <Card title="Nenhum lançamento encontrado">
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden>
                  📄
                </div>
                <div>
                  <p className="footer-note">Ainda não existem funcionários ou serviços lançados nesta pasta.</p>
                  <p className="footer-note">Atualize ou verifique se já existem lançamentos nesta pasta.</p>
                </div>
              </div>
            </Card>
          ) : null}

          {data ? (
            <section className="entries-grid">
              {filteredEntries.map((entry) => {
                const hasEmployees = entry.employees.length > 0;
                const signature = entry.signatureName
                  ? `Assinado por ${entry.signatureName}${entry.signedAt ? ` em ${new Date(entry.signedAt).toLocaleString('pt-BR')}` : ''}`
                  : 'Sem assinatura registrada';
                return (
                  <article key={entry.date} className="entry-card">
                    <header className="entry-card-head">
                      <div>
                        <p className="entry-date">{formatDate(entry.date)}</p>
                        <h3 className="entry-title">Lançamentos do dia</h3>
                        <p className="entry-signature">{signature}</p>
                      </div>
                      <div className="entry-meta">
                        <span className="entries-badge ui-badge ui-badge-info">
                          {entry.employees.length} mantenedor(es)
                        </span>
                        <span className="entries-chip">Dados da pasta</span>
                      </div>
                    </header>

                    {hasEmployees ? (
                      <div className="entry-body">
                        {entry.employees.map((employee) => (
                          <div key={employee.id} className="entry-employee-card">
                            <div className="entry-employee-head">
                              <div className="entry-avatar" aria-hidden>
                                {employee.name.slice(0, 1)}
                              </div>
                              <div>
                                <p className="entry-employee-name">{employee.name}</p>
                                <p className="entry-employee-meta">
                                  Total: {employee.totalMinutes != null ? `${employee.totalMinutes} min` : '—'}
                                </p>
                              </div>
                            </div>

                            {employee.services.length ? (
                              <div className="entry-services">
                                {employee.services.map((service) => (
                                  <div key={service.id} className="entry-service-card">
                                    <div className="entry-service-head">
                                      <span className="entries-chip strong">{service.osCode || 'O.S. não informada'}</span>
                                      {service.tag ? <span className="entries-chip subtle">{service.tag}</span> : null}
                                    </div>
                                    <p className="entry-service-machine">{service.machineName}</p>
                                    <p className="entry-service-description">{service.description}</p>
                                    <div className="entry-intervals">
                                      <span className="interval-chip">T1: {service.t1In} - {service.t1Out}</span>
                                      <span className="interval-chip">T2: {service.t2In} - {service.t2Out}</span>
                                      <span className="interval-chip strong">
                                        Total:{' '}
                                        {service.totalMinutes !== undefined && service.totalMinutes !== null
                                          ? `${service.totalMinutes} min`
                                          : '—'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="entry-empty">Nenhum serviço lançado para este funcionário.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="entry-empty">Nenhum funcionário lançado nesta data.</p>
                    )}
                  </article>
                );
              })}
            </section>
          ) : null}
        </section>

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </main>
    </AdminGuard>
  );
}
