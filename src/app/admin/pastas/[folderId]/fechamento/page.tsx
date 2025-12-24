"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Employee } from '@/types/employee';
import type { Service } from '@/types/service';

type EntryService = Service & {
  osCode: string;
  tag: string;
  machineName: string;
  intervals?: Array<{ startTime: string; endTime: string }>;
};

type EntryEmployee = Employee & {
  services: EntryService[];
};

type EntryDay = {
  date: string;
  employees: EntryEmployee[];
};

type EntriesResponse = {
  folder: {
    id: string;
    name: string;
    company: string | null;
    hourRate: number | null;
    hourRate50: number | null;
    hourRate100: number | null;
  };
  entries: EntryDay[];
};

type EmployeeSummary = {
  id: string;
  name: string;
  normalMinutes: number;
  extra50Minutes: number;
  extra100Minutes: number;
};

type OsSummary = {
  osId: string;
  osCode: string;
  title: string;
  description: string;
  totalMinutes: number;
};

type ScheduleRow = {
  id: string;
  date: string;
  dayLabel: string;
  employeeName: string;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  totalMinutes: number;
  extra50Minutes: number;
  extra100Minutes: number;
};

const formatDate = (value: string) => value.split('-').reverse().join('/');

const formatMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const buildIntervals = (service: EntryService) => {
  if (service.intervals?.length) return service.intervals;
  const intervals: Array<{ startTime: string; endTime: string }> = [];
  if (service.t1In && service.t1Out) intervals.push({ startTime: service.t1In, endTime: service.t1Out });
  if (service.t2In && service.t2Out) intervals.push({ startTime: service.t2In, endTime: service.t2Out });
  return intervals;
};

export default function FolderClosingPage() {
  const params = useParams<{ folderId: string }>();
  const folderId = params.folderId;
  const { idToken } = useAdminAuth();
  const [data, setData] = useState<EntriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

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
      if (!response.ok) throw new Error(json.error || 'Erro ao carregar fechamentos.');
      setData(json as EntriesResponse);
      setSuccess('Fechamento carregado.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar fechamentos.';
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

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    return selectedDate ? data.entries.filter((entry) => entry.date === selectedDate) : data.entries;
  }, [data, selectedDate]);

  const hourRate = data?.folder.hourRate ?? 0;
  const hourRate50 = data?.folder.hourRate50 ?? 0;
  const hourRate100 = data?.folder.hourRate100 ?? 0;

  const employeeSummaries = useMemo<EmployeeSummary[]>(() => {
    const map = new Map<string, EmployeeSummary>();
    filteredEntries.forEach((entry) => {
      entry.employees.forEach((employee) => {
        const totalMinutes = employee.services.reduce((sum, service) => {
          const minutes = service.totalMinutes ?? buildIntervals(service).reduce((acc, interval) => {
            const [startH, startM] = interval.startTime.split(':').map(Number);
            const [endH, endM] = interval.endTime.split(':').map(Number);
            return acc + (endH * 60 + endM - (startH * 60 + startM));
          }, 0);
          return sum + minutes;
        }, 0);
        if (!map.has(employee.id)) {
          map.set(employee.id, {
            id: employee.id,
            name: employee.name,
            normalMinutes: 0,
            extra50Minutes: 0,
            extra100Minutes: 0,
          });
        }
        const item = map.get(employee.id)!;
        item.normalMinutes += totalMinutes;
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredEntries]);

  const employeeTotals = useMemo(() => {
    return employeeSummaries.reduce(
      (acc, item) => {
        acc.normalMinutes += item.normalMinutes;
        acc.extra50Minutes += item.extra50Minutes;
        acc.extra100Minutes += item.extra100Minutes;
        return acc;
      },
      { normalMinutes: 0, extra50Minutes: 0, extra100Minutes: 0 }
    );
  }, [employeeSummaries]);

  const osSummaries = useMemo<OsSummary[]>(() => {
    const map = new Map<string, OsSummary>();
    filteredEntries.forEach((entry) => {
      entry.employees.forEach((employee) => {
        employee.services.forEach((service) => {
          const minutes = service.totalMinutes ?? 0;
          if (!map.has(service.osId)) {
            map.set(service.osId, {
              osId: service.osId,
              osCode: service.osCode || 'O.S. não informada',
              title: [service.tag, service.machineName].filter(Boolean).join(' · ') || '—',
              description: service.description || 'Sem descrição',
              totalMinutes: 0,
            });
          }
          map.get(service.osId)!.totalMinutes += minutes;
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.osCode.localeCompare(b.osCode));
  }, [filteredEntries]);

  const osTotals = useMemo(
    () => osSummaries.reduce((sum, item) => sum + item.totalMinutes, 0),
    [osSummaries]
  );

  const totalAmount = useMemo(() => {
    return (
      (employeeTotals.normalMinutes / 60) * hourRate +
      (employeeTotals.extra50Minutes / 60) * hourRate50 +
      (employeeTotals.extra100Minutes / 60) * hourRate100
    );
  }, [employeeTotals, hourRate, hourRate50, hourRate100]);

  const scheduleRows = useMemo<ScheduleRow[]>(() => {
    const rows: ScheduleRow[] = [];
    filteredEntries.forEach((entry) => {
      entry.employees.forEach((employee) => {
        const intervals = employee.services
          .flatMap((service) => buildIntervals(service))
          .slice()
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const totalMinutes = employee.services.reduce((sum, service) => sum + (service.totalMinutes ?? 0), 0);
        rows.push({
          id: `${entry.date}-${employee.id}`,
          date: entry.date,
          dayLabel: new Date(entry.date).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase(),
          employeeName: employee.name,
          morningStart: intervals[0]?.startTime || '—',
          morningEnd: intervals[0]?.endTime || '—',
          afternoonStart: intervals[1]?.startTime || '—',
          afternoonEnd: intervals[1]?.endTime || '—',
          totalMinutes,
          extra50Minutes: 0,
          extra100Minutes: 0,
        });
      });
    });
    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName));
  }, [filteredEntries]);

  const monthLabel = useMemo(() => {
    if (!data?.entries.length) return '';
    const targetDate = selectedDate || data.entries[0]?.date;
    if (!targetDate) return '';
    return new Date(targetDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [data, selectedDate]);

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <AdminGuard>
      <main className="closing-page">
        <div className="container closing-container">
          <header className="closing-header print-hidden">
            <div>
              <p className="ui-badge ui-badge-info">Fechamento</p>
              <h1 className="closing-title">Fechamento de serviços terceiros</h1>
              <p className="closing-subtitle">{data?.folder.name || 'Carregando...'}</p>
            </div>
            <div className="closing-actions">
              <Button type="button" variant="secondary" onClick={handleExport} disabled={!data}>
                Exportar PDF
              </Button>
              <Link href="/admin">
                <Button variant="outline" type="button">
                  Voltar ao dashboard
                </Button>
              </Link>
            </div>
          </header>

          <section className="closing-toolbar print-hidden">
            <Input
              type="date"
              label="Filtrar por data"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={load} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </section>

          {loading && !data ? (
            <Card title="Carregando fechamento" className="print-hidden">
              <p className="footer-note">Aguarde, preparando o fechamento...</p>
            </Card>
          ) : null}

          {data ? (
            <section className="closing-print-area">
              <article className="closing-sheet">
                <table className="closing-header-table">
                  <tbody>
                    <tr>
                      <td className="closing-logo-cell">
                        <span className="closing-logo-text">Lar</span>
                      </td>
                      <td className="closing-title-cell" colSpan={5}>
                        FECHAMENTO DE SERVIÇOS TERCEIROS HORA HOMEM
                      </td>
                      <td className="closing-doc-cell" colSpan={2}>
                        <div className="closing-doc-code">FO 012-050-0054</div>
                        <div className="closing-doc-grid">
                          <div>EMISSÃO</div>
                          <div>REVISÃO</div>
                          <div>N°</div>
                          <div>{new Date().toLocaleDateString('pt-BR')}</div>
                          <div>{new Date().toLocaleDateString('pt-BR')}</div>
                          <div>1</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={8} className="closing-green-band" />
                    </tr>
                    <tr>
                      <td colSpan={6} className="closing-company-cell">
                        Empresa Terceira: <strong>{data.folder.company || '—'}</strong>
                      </td>
                      <td colSpan={2} className="closing-month-cell">
                        Mês: <strong>{monthLabel || '—'}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="closing-rate-label">HORA NORMAL</td>
                      <td className="closing-rate-currency">R$</td>
                      <td className="closing-rate-value">{formatCurrency(hourRate).replace('R$', '').trim()}</td>
                      <td colSpan={5} />
                    </tr>
                    <tr>
                      <td className="closing-rate-label">HORA 50%</td>
                      <td className="closing-rate-currency">R$</td>
                      <td className="closing-rate-value">{formatCurrency(hourRate50).replace('R$', '').trim()}</td>
                      <td colSpan={5} />
                    </tr>
                    <tr>
                      <td className="closing-rate-label">HORA 100%</td>
                      <td className="closing-rate-currency">R$</td>
                      <td className="closing-rate-value">{formatCurrency(hourRate100).replace('R$', '').trim()}</td>
                      <td colSpan={5} />
                    </tr>
                  </tbody>
                </table>

                <table className="closing-table closing-main-table">
                  <thead>
                    <tr>
                      <th>Nome fun. terceiro</th>
                      <th>Horas normais</th>
                      <th>Valor horas normais</th>
                      <th>Horas 50%</th>
                      <th>Valor horas 50%</th>
                      <th>Horas 100%</th>
                      <th>Valor horas 100%</th>
                      <th>Total (R$) (C.P)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeSummaries.map((item) => {
                      const normalValue = (item.normalMinutes / 60) * hourRate;
                      const extra50Value = (item.extra50Minutes / 60) * hourRate50;
                      const extra100Value = (item.extra100Minutes / 60) * hourRate100;
                      const totalValue = normalValue + extra50Value + extra100Value;
                      return (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{formatMinutes(item.normalMinutes)}</td>
                          <td>{formatCurrency(normalValue)}</td>
                          <td>{formatMinutes(item.extra50Minutes)}</td>
                          <td>{formatCurrency(extra50Value)}</td>
                          <td>{formatMinutes(item.extra100Minutes)}</td>
                          <td>{formatCurrency(extra100Value)}</td>
                          <td>{formatCurrency(totalValue)}</td>
                        </tr>
                      );
                    })}
                    <tr className="closing-total-row">
                      <td>SOMA DE HORAS/VALORES</td>
                      <td>{formatMinutes(employeeTotals.normalMinutes)}</td>
                      <td>{formatCurrency((employeeTotals.normalMinutes / 60) * hourRate)}</td>
                      <td>{formatMinutes(employeeTotals.extra50Minutes)}</td>
                      <td>{formatCurrency((employeeTotals.extra50Minutes / 60) * hourRate50)}</td>
                      <td>{formatMinutes(employeeTotals.extra100Minutes)}</td>
                      <td>{formatCurrency((employeeTotals.extra100Minutes / 60) * hourRate100)}</td>
                      <td>
                        {formatCurrency(
                          (employeeTotals.normalMinutes / 60) * hourRate +
                            (employeeTotals.extra50Minutes / 60) * hourRate50 +
                            (employeeTotals.extra100Minutes / 60) * hourRate100
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="closing-total-footer">
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </article>

              <article className="closing-sheet">
                <table className="closing-table closing-os-table">
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>O.S ABERTA</th>
                      <th>DESCRIÇÃO</th>
                      <th>TOTAL DE HORAS</th>
                      <th>CUSTOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {osSummaries.map((item) => {
                      const cost = (item.totalMinutes / 60) * hourRate;
                      return (
                        <tr key={item.osId}>
                          <td>{item.osCode}</td>
                          <td>{item.title}</td>
                          <td>{item.description}</td>
                          <td>{formatMinutes(item.totalMinutes)}</td>
                          <td>{formatCurrency(cost)}</td>
                        </tr>
                      );
                    })}
                    <tr className="closing-total-row">
                      <td colSpan={3}>Total</td>
                      <td>{formatMinutes(osTotals)}</td>
                      <td>{formatCurrency((osTotals / 60) * hourRate)}</td>
                    </tr>
                  </tbody>
                </table>
              </article>

              <article className="closing-sheet">
                <div className="closing-month-title">MÊS: {monthLabel || '—'}</div>
                <table className="closing-table closing-schedule-table">
                  <thead>
                    <tr>
                      <th>DATA</th>
                      <th>DIA</th>
                      <th>FUNCIONÁRIO</th>
                      <th>HORA INICIO MANHÃ</th>
                      <th>HORA FINAL MANHÃ</th>
                      <th>HORA INICIO TARDE</th>
                      <th>HORA FINAL TARDE</th>
                      <th>TOTAL DE HORAS</th>
                      <th>TOTAL DE HORAS 50%</th>
                      <th>TOTAL DE HORAS 100%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.dayLabel}</td>
                        <td>{row.employeeName}</td>
                        <td>{row.morningStart}</td>
                        <td>{row.morningEnd}</td>
                        <td>{row.afternoonStart}</td>
                        <td>{row.afternoonEnd}</td>
                        <td>{formatMinutes(row.totalMinutes)}</td>
                        <td>{formatMinutes(row.extra50Minutes)}</td>
                        <td>{formatMinutes(row.extra100Minutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </section>
          ) : null}

          {error ? (
            <div className="print-hidden">
              <Toast type="error" message={error} />
            </div>
          ) : null}
          {success ? (
            <div className="print-hidden">
              <Toast type="success" message={success} />
            </div>
          ) : null}
        </div>
      </main>
    </AdminGuard>
  );
}
