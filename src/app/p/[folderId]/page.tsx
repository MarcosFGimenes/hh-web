"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Toast } from '@/components/Toast';
import type { Employee } from '@/types/employee';
import type { ServiceOrder } from '@/types/os';
import type { Service } from '@/types/service';

type FolderSummary = {
  id: string;
  name: string;
};

type PageProps = {
  params: { folderId: string };
};

export default function PublicFolderAccessPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const folderId = params.folderId;
  const [folder, setFolder] = useState<FolderSummary | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [services, setServices] = useState<Record<string, Service[]>>({});
  const [serviceForms, setServiceForms] = useState<
    Record<
      string,
      {
        osId: string;
        description: string;
        t1In: string;
        t1Out: string;
        t2In: string;
        t2Out: string;
      }
    >
  >({});

  const linkKey = useMemo(() => searchParams.get('k') || '', [searchParams]);

  const fetchJSON = async (path: string) => {
    const response = await fetch(path, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error || 'Falha ao validar o link.';
      throw new Error(message);
    }
    return data;
  };

  const loadEmployees = async (targetDate: string) => {
    const data = await fetchJSON(
      `/api/p/folders/${folderId}/days/${targetDate}/employees?k=${encodeURIComponent(linkKey)}`
    );
    setEmployees(data.employees);
  };

  useEffect(() => {
    const validate = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!linkKey) {
          throw new Error('Link inválido ou expirado.');
        }

        const summary = await fetchJSON(`/api/p/folders/${folderId}/summary?k=${encodeURIComponent(linkKey)}`);
        setFolder(summary.folder);

        const osData = await fetchJSON(`/api/p/folders/${folderId}/os?k=${encodeURIComponent(linkKey)}`);
        setOrders(osData.orders);

        await loadEmployees(date);
        await loadAllServices(date, osData.orders.length > 0);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Link inválido ou expirado.';
        setError(message);
        setFolder(null);
        setOrders([]);
        setEmployees([]);
        setServices({});
      } finally {
        setLoading(false);
      }
    };

    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, linkKey]);

  const hasOrders = orders.length > 0;
  const hasEmployees = employees.length > 0;

  const handleChangeDate = async (nextDate: string) => {
    setDate(nextDate);
    try {
      await loadEmployees(nextDate);
      await loadAllServices(nextDate, hasOrders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar funcionários.';
      setError(message);
      setEmployees([]);
      setServices({});
    }
  };

  const handleCreateEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEmployeeName.trim()) return;
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newEmployeeName }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao adicionar funcionário.');
      setEmployees((prev) => [data.employee, ...prev]);
      setAddEmployeeOpen(false);
      setNewEmployeeName('');
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar funcionário.';
      setError(message);
    }
  };

  const handleUpdateMinutes = async (employeeId: string, totalMinutes: number) => {
    setSavingEmployeeId(employeeId);
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ totalMinutes }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar horário.');
      setEmployees((prev) => prev.map((emp) => (emp.id === employeeId ? data.employee : emp)));
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário.';
      setError(message);
    } finally {
      setSavingEmployeeId(null);
    }
  };

  const loadAllServices = async (targetDate: string, hasOs: boolean) => {
    if (!hasOs) {
      setServices({});
      return;
    }
    try {
      const allServices: Record<string, Service[]> = {};
      await Promise.all(
        employees.map(async (employee) => {
          const data = await fetchJSON(
            `/api/p/folders/${folderId}/days/${targetDate}/employees/${employee.id}/services?k=${encodeURIComponent(
              linkKey
            )}`
          );
          allServices[employee.id] = data.services;
        })
      );
      setServices(allServices);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar serviços.';
      setError(message);
      setServices({});
    }
  };

  const updateServiceForm = (employeeId: string, field: keyof (typeof serviceForms)[string], value: string) => {
    setServiceForms((prev) => ({
      ...prev,
      [employeeId]: {
        osId: '',
        description: '',
        t1In: '',
        t1Out: '',
        t2In: '',
        t2Out: '',
        ...prev[employeeId],
        [field]: value,
      },
    }));
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const computeServiceMinutes = (t1In: string, t1Out: string, t2In: string, t2Out: string) => {
    const toMinutes = (value: string) => {
      if (!/^\d{2}:\d{2}$/.test(value)) return null;
      const [h, m] = value.split(':').map(Number);
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return h * 60 + m;
    };

    const p1 = toMinutes(t1In);
    const p2 = toMinutes(t1Out);
    const p3 = toMinutes(t2In);
    const p4 = toMinutes(t2Out);

    if (p1 === null || p2 === null || p1 > p2) return null;
    if ((t2In || t2Out) && (p3 === null || p4 === null || p3 > p4)) return null;

    const first = p2 - p1;
    const second = p3 !== null && p4 !== null ? p4 - p3 : 0;
    const total = first + second;
    return total > 0 ? total : null;
  };

  const currentServiceTotal = (employeeId: string) =>
    (services[employeeId] || []).reduce((acc, service) => acc + (service.totalMinutes || 0), 0);

  const handleCreateService = async (employeeId: string) => {
    const form = serviceForms[employeeId] || {
      osId: '',
      description: '',
      t1In: '',
      t1Out: '',
      t2In: '',
      t2Out: '',
    };

    const employee = employees.find((emp) => emp.id === employeeId);
    if (!employee || !employee.totalMinutes || employee.totalMinutes <= 0) {
      setError('Defina o horário total do funcionário antes de lançar serviços.');
      return;
    }

    const total = computeServiceMinutes(form.t1In, form.t1Out, form.t2In, form.t2Out);
    if (total === null) {
      setError('Horários inválidos para o serviço.');
      return;
    }

    if (currentServiceTotal(employeeId) + total > employee.totalMinutes) {
      setError('Soma dos serviços excede o horário total do funcionário.');
      return;
    }

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}/services?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar serviço.');
      setServices((prev) => ({
        ...prev,
        [employeeId]: [data.service, ...(prev[employeeId] || [])],
      }));
      setServiceForms((prev) => ({ ...prev, [employeeId]: { osId: '', description: '', t1In: '', t1Out: '', t2In: '', t2Out: '' } }));
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar serviço.';
      setError(message);
    }
  };

  const handleUpdateService = async (employeeId: string, service: Service) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    if (!employee || !employee.totalMinutes || employee.totalMinutes <= 0) {
      setError('Defina o horário total do funcionário antes de atualizar serviços.');
      return;
    }

    const total = computeServiceMinutes(service.t1In, service.t1Out, service.t2In, service.t2Out);
    if (total === null) {
      setError('Horários inválidos para o serviço.');
      return;
    }

    const otherSum = (services[employeeId] || []).reduce((acc, item) => (item.id === service.id ? acc : acc + item.totalMinutes), 0);
    if (otherSum + total > employee.totalMinutes) {
      setError('Soma dos serviços excede o horário total do funcionário.');
      return;
    }

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}/services/${service.id}?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...service, totalMinutes: total }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao atualizar serviço.');
      setServices((prev) => ({
        ...prev,
        [employeeId]: (prev[employeeId] || []).map((item) => (item.id === service.id ? data.service : item)),
      }));
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar serviço.';
      setError(message);
    }
  };

  const handleDeleteService = async (employeeId: string, serviceId: string) => {
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}/services/${serviceId}?k=${encodeURIComponent(linkKey)}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao excluir serviço.');
      setServices((prev) => ({
        ...prev,
        [employeeId]: (prev[employeeId] || []).filter((item) => item.id !== serviceId),
      }));
      setSuccess('Serviço excluído.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir serviço.';
      setError(message);
    }
  };

  return (
    <main>
      <div className="container">
        {error ? (
          <Card title="Link inválido ou expirado">
            <p className="footer-note">{error}</p>
          </Card>
        ) : null}

        {!error ? (
          <>
            <Card
              title={folder ? `Pasta: ${folder.name}` : 'Validando link...'}
              subtitle="Acesso do terceiro via link privado"
              action={
                <Link href="/">
                  <Button variant="ghost" type="button">
                    Voltar
                  </Button>
                </Link>
              }
            >
              {loading ? (
                <p className="footer-note">Validando link e carregando dados...</p>
              ) : (
                <div className="stack">
                  <p className="footer-note">
                    Link válido. Informe a data para lançar os funcionários e horários do dia.
                  </p>
                  <Input
                    label="Data (DD/MM/AAAA)"
                    type="date"
                    value={date}
                    onChange={(event) => handleChangeDate(event.target.value)}
                    required
                  />
                  <div className="footer-note">Formato salvo: {date}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button type="button" onClick={() => setAddEmployeeOpen(true)}>
                      Adicionar Funcionário
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Ordens de Serviço disponíveis" subtitle={loading ? 'Carregando...' : `Total: ${orders.length}`}>
              {hasOrders ? (
                <div className="list">
                  {orders.map((order) => (
                    <div key={order.id} className="list-item">
                      <strong>{order.osCode}</strong>
                      <div className="footer-note">
                        TAG: {order.tag} · Equipamento: {order.machineName}
                      </div>
                      <div className="footer-note" style={{ lineHeight: 1.5 }}>
                        {order.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="footer-note">
                  {loading ? 'Carregando...' : 'Nenhuma O.S. cadastrada para esta pasta.'}
                </p>
              )}
            </Card>

            <Card title="Funcionários do dia" subtitle={`Data: ${date.split('-').reverse().join('/')}`}>
              {hasEmployees ? (
                <div className="list">
                  {employees.map((employee) => (
                    <div key={employee.id} className="list-item" style={{ display: 'grid', gap: '0.75rem' }}>
                      <div>
                        <strong>{employee.name}</strong>
                        <div className="footer-note">
                          Atualizado em {new Date(employee.updatedAt).toLocaleString('pt-BR')}
                        </div>
                        <div className="footer-note">
                          Horário geral: {employee.totalMinutes ? formatMinutes(employee.totalMinutes) : 'Defina o total do dia'}
                        </div>
                        <div className="footer-note">
                          Soma dos serviços: {formatMinutes(currentServiceTotal(employee.id))}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        label="Horário total (minutos)"
                        value={employee.totalMinutes ?? ''}
                        onChange={(event) =>
                          setEmployees((prev) =>
                            prev.map((item) =>
                              item.id === employee.id
                                ? { ...item, totalMinutes: Number(event.target.value) || 0 }
                                : item
                            )
                          )
                        }
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          onClick={() => handleUpdateMinutes(employee.id, employee.totalMinutes || 0)}
                          disabled={savingEmployeeId === employee.id}
                        >
                          {savingEmployeeId === employee.id ? 'Salvando...' : 'Salvar horário'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => updateServiceForm(employee.id, 'osId', serviceForms[employee.id]?.osId || '')}>
                          Adicionar serviço
                        </Button>
                      </div>

                      <div className="stack">
                        <div className="card" style={{ border: '1px dashed #cbd5e1', padding: '0.75rem', borderRadius: '10px' }}>
                          <h4 style={{ margin: '0 0 0.5rem' }}>Novo serviço</h4>
                          <div className="grid">
                            <label className="ui-field">
                              <span className="ui-field-label">O.S</span>
                              <select
                                className="ui-input"
                                value={serviceForms[employee.id]?.osId || ''}
                                onChange={(event) => updateServiceForm(employee.id, 'osId', event.target.value)}
                              >
                                <option value="">Selecione</option>
                                {orders.map((order) => (
                                  <option key={order.id} value={order.id}>
                                    {order.osCode} — {order.tag}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="ui-field">
                              <span className="ui-field-label">Descrição</span>
                              <textarea
                                className="ui-input"
                                rows={2}
                                value={serviceForms[employee.id]?.description || ''}
                                onChange={(event) => updateServiceForm(employee.id, 'description', event.target.value)}
                              />
                            </label>
                            <Input
                              label="T1 Entrada"
                              type="time"
                              value={serviceForms[employee.id]?.t1In || ''}
                              onChange={(event) => updateServiceForm(employee.id, 't1In', event.target.value)}
                              required
                            />
                            <Input
                              label="T1 Saída"
                              type="time"
                              value={serviceForms[employee.id]?.t1Out || ''}
                              onChange={(event) => updateServiceForm(employee.id, 't1Out', event.target.value)}
                              required
                            />
                            <Input
                              label="T2 Entrada (opcional)"
                              type="time"
                              value={serviceForms[employee.id]?.t2In || ''}
                              onChange={(event) => updateServiceForm(employee.id, 't2In', event.target.value)}
                            />
                            <Input
                              label="T2 Saída (opcional)"
                              type="time"
                              value={serviceForms[employee.id]?.t2Out || ''}
                              onChange={(event) => updateServiceForm(employee.id, 't2Out', event.target.value)}
                            />
                          </div>
                          <div className="footer-note">
                            Total estimado:{' '}
                            {computeServiceMinutes(
                              serviceForms[employee.id]?.t1In || '',
                              serviceForms[employee.id]?.t1Out || '',
                              serviceForms[employee.id]?.t2In || '',
                              serviceForms[employee.id]?.t2Out || ''
                            ) !== null
                              ? formatMinutes(
                                  computeServiceMinutes(
                                    serviceForms[employee.id]?.t1In || '',
                                    serviceForms[employee.id]?.t1Out || '',
                                    serviceForms[employee.id]?.t2In || '',
                                    serviceForms[employee.id]?.t2Out || ''
                                  ) || 0
                                )
                              : '—'}
                          </div>
                          <Button type="button" onClick={() => handleCreateService(employee.id)}>
                            Salvar serviço
                          </Button>
                        </div>

                        <div className="stack">
                          {(services[employee.id] || []).map((service) => (
                            <div key={service.id} className="card" style={{ border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <strong>Serviço</strong>
                                <div className="footer-note">Total: {formatMinutes(service.totalMinutes)}</div>
                              </div>
                              <div className="grid">
                                <label className="ui-field">
                                  <span className="ui-field-label">O.S</span>
                                  <select
                                    className="ui-input"
                                    value={service.osId}
                                    onChange={(event) =>
                                      setServices((prev) => ({
                                        ...prev,
                                        [employee.id]: (prev[employee.id] || []).map((item) =>
                                          item.id === service.id ? { ...item, osId: event.target.value } : item
                                        ),
                                      }))
                                    }
                                  >
                                    <option value="">Selecione</option>
                                    {orders.map((order) => (
                                      <option key={order.id} value={order.id}>
                                        {order.osCode} — {order.tag}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="ui-field">
                                  <span className="ui-field-label">Descrição</span>
                                  <textarea
                                    className="ui-input"
                                    rows={2}
                                    value={service.description}
                                    onChange={(event) =>
                                      setServices((prev) => ({
                                        ...prev,
                                        [employee.id]: (prev[employee.id] || []).map((item) =>
                                          item.id === service.id ? { ...item, description: event.target.value } : item
                                        ),
                                      }))
                                    }
                                  />
                                </label>
                                <Input
                                  label="T1 Entrada"
                                  type="time"
                                  value={service.t1In}
                                  onChange={(event) =>
                                    setServices((prev) => ({
                                      ...prev,
                                      [employee.id]: (prev[employee.id] || []).map((item) =>
                                        item.id === service.id ? { ...item, t1In: event.target.value } : item
                                      ),
                                    }))
                                  }
                                />
                                <Input
                                  label="T1 Saída"
                                  type="time"
                                  value={service.t1Out}
                                  onChange={(event) =>
                                    setServices((prev) => ({
                                      ...prev,
                                      [employee.id]: (prev[employee.id] || []).map((item) =>
                                        item.id === service.id ? { ...item, t1Out: event.target.value } : item
                                      ),
                                    }))
                                  }
                                />
                                <Input
                                  label="T2 Entrada (opcional)"
                                  type="time"
                                  value={service.t2In}
                                  onChange={(event) =>
                                    setServices((prev) => ({
                                      ...prev,
                                      [employee.id]: (prev[employee.id] || []).map((item) =>
                                        item.id === service.id ? { ...item, t2In: event.target.value } : item
                                      ),
                                    }))
                                  }
                                />
                                <Input
                                  label="T2 Saída (opcional)"
                                  type="time"
                                  value={service.t2Out}
                                  onChange={(event) =>
                                    setServices((prev) => ({
                                      ...prev,
                                      [employee.id]: (prev[employee.id] || []).map((item) =>
                                        item.id === service.id ? { ...item, t2Out: event.target.value } : item
                                      ),
                                    }))
                                  }
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <Button type="button" onClick={() => handleUpdateService(employee.id, service)}>
                                  Atualizar
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => handleDeleteService(employee.id, service.id)}>
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="footer-note">{loading ? 'Carregando...' : 'Nenhum funcionário lançado para esta data.'}</p>
              )}
            </Card>
          </>
        ) : null}

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </div>

      <Modal title="Adicionar Funcionário" open={addEmployeeOpen} onClose={() => setAddEmployeeOpen(false)}>
        <form className="stack" onSubmit={handleCreateEmployee}>
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={newEmployeeName}
            onChange={(event) => setNewEmployeeName(event.target.value)}
            required
          />
          <Button type="submit" disabled={!newEmployeeName.trim()}>
            Adicionar
          </Button>
        </form>
      </Modal>
    </main>
  );
}
