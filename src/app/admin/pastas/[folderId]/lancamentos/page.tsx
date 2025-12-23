"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';
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

  return (
    <AdminGuard>
      <main className="container stack" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="dashboard-actions" style={{ justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p className="chip">Lançamentos do terceiro</p>
            <h1>{data?.folder.name || 'Carregando...'}</h1>
            <p className="dashboard-subtitle">
              {data?.folder.company ? `Responsável: ${data.folder.company}` : 'Responsável não informado'}
            </p>
          </div>
          <div className="dashboard-actions-row">
            <Button type="button" variant="secondary" onClick={load} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Link href="/admin">
              <Button variant="outline" type="button">
                Voltar ao dashboard
              </Button>
            </Link>
          </div>
        </div>

        {loading && !data ? (
          <Card title="Carregando lançamentos">
            <p className="footer-note">Aguarde, buscando registros do terceiro...</p>
          </Card>
        ) : null}

        {!loading && data && totalEntries === 0 ? (
          <Card title="Nenhum lançamento encontrado">
            <p className="footer-note">Ainda não existem funcionários ou serviços lançados nesta pasta.</p>
          </Card>
        ) : null}

        {data
          ? data.entries.map((entry) => {
              const hasEmployees = entry.employees.length > 0;
              return (
                <Card
                  key={entry.date}
                  title={`Lançamentos de ${formatDate(entry.date)}`}
                  subtitle={
                    entry.signatureName
                      ? `Assinado por ${entry.signatureName}${entry.signedAt ? ` em ${new Date(entry.signedAt).toLocaleString('pt-BR')}` : ''}`
                      : 'Sem assinatura registrada'
                  }
                >
                  {hasEmployees ? (
                    <div className="stack">
                      {entry.employees.map((employee) => (
                        <div key={employee.id} className="public-chip-card">
                          <div className="public-chip-row">
                            <span className="pill pill-strong">{employee.name}</span>
                            <span className="pill pill-soft">
                              Total: {employee.totalMinutes != null ? `${employee.totalMinutes} min` : '—'}
                            </span>
                          </div>
                          {employee.services.length ? (
                            <div className="stack">
                              {employee.services.map((service) => (
                                <div key={service.id} className="public-chip-card">
                                  <div className="public-chip-row">
                                    <span className="pill pill-strong">{service.osCode || 'O.S. não informada'}</span>
                                    <span className="pill pill-soft">{service.tag}</span>
                                  </div>
                                  <p className="footer-note">{service.machineName}</p>
                                  <p className="footer-note" style={{ marginBottom: '0.25rem' }}>
                                    {service.description}
                                  </p>
                                  <div className="public-chip-row">
                                    <span className="pill pill-soft">T1: {service.t1In} - {service.t1Out}</span>
                                    <span className="pill pill-soft">T2: {service.t2In} - {service.t2Out}</span>
                                    <span className="pill pill-strong">
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
                            <p className="footer-note">Nenhum serviço lançado para este funcionário.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="footer-note">Nenhum funcionário lançado nesta data.</p>
                  )}
                </Card>
              );
            })
          : null}

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </main>
    </AdminGuard>
  );
}
