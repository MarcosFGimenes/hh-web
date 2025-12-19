"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { TimeSequenceInput } from '@/components/TimeSequenceInput';
import { Toast } from '@/components/Toast';
import type { Employee } from '@/types/employee';
import type { ServiceOrder } from '@/types/os';
import type { Service } from '@/types/service';
import { computeServiceMinutes as computeServiceMinutesLib, normalizeTimes, type TimeSequence } from '@/lib/time/service';

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
  const [serviceFormErrors, setServiceFormErrors] = useState<Record<string, string[]>>({});
  const [serviceErrors, setServiceErrors] = useState<Record<string, Record<string, string[]>>>({});
  const defaultServiceForm = { osId: '', description: '', t1In: '', t1Out: '', t2In: '', t2Out: '' };

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
    setServiceFormErrors({});
    setServiceForms({});
    setServiceErrors({});
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
      const errors: Record<string, Record<string, string[]>> = {};
      await Promise.all(
        employees.map(async (employee) => {
          const data = await fetchJSON(
            `/api/p/folders/${folderId}/days/${targetDate}/employees/${employee.id}/services?k=${encodeURIComponent(
              linkKey
            )}`
          );
          allServices[employee.id] = data.services;
          errors[employee.id] = {};
        })
      );
      setServices(allServices);
      setServiceErrors(errors);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar serviços.';
      setError(message);
      setServices({});
      setServiceErrors({});
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
    const { minutes, errors } = computeServiceMinutesLib({
      t1In,
      t1Out,
      t2In,
      t2Out,
    });
    return errors.length ? null : minutes;
  };

  const currentServiceTotal = (employeeId: string) =>
    (services[employeeId] || []).reduce((acc, service) => acc + (service.totalMinutes || 0), 0);

  const handleNewServiceTimesChange = (employeeId: string, times: TimeSequence, errors: string[]) => {
    setServiceForms((prev) => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || defaultServiceForm), ...times },
    }));
    setServiceFormErrors((prev) => ({ ...prev, [employeeId]: errors }));
  };

  const handleExistingServiceTimesChange = (
    employeeId: string,
    serviceId: string,
    times: TimeSequence,
    errors: string[]
  ) => {
    setServices((prev) => ({
      ...prev,
      [employeeId]: (prev[employeeId] || []).map((item) => (item.id === serviceId ? { ...item, ...times } : item)),
    }));
    setServiceErrors((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [serviceId]: errors,
      },
    }));
  };

  const handleCreateService = async (employeeId: string) => {
    const form = serviceForms[employeeId] || {
      osId: '',
      description: '',
      t1In: '',
      t1Out: '',
      t2In: '',
      t2Out: '',
    };

    if ((serviceFormErrors[employeeId] || []).length) {
      setError('Corrija os horários antes de salvar o serviço.');
      return;
    }

    const employee = employees.find((emp) => emp.id === employeeId);
    if (!employee || !employee.totalMinutes || employee.totalMinutes <= 0) {
      setError('Defina o horário total do funcionário antes de lançar serviços.');
      return;
    }

    const { minutes: total, errors, normalizedTimes } = computeServiceMinutesLib(form);
    if (errors.length || total === null) {
      setError(errors.join(' ') || 'Horários inválidos para o serviço.');
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
          body: JSON.stringify({ ...form, ...normalizedTimes }),
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

    if (serviceErrors[employeeId]?.[service.id]?.length) {
      setError('Corrija os horários antes de salvar o serviço.');
      return;
    }

    const { minutes: total, errors, normalizedTimes } = computeServiceMinutesLib(service);
    if (errors.length || total === null) {
      setError(errors.join(' ') || 'Horários inválidos para o serviço.');
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
          body: JSON.stringify({ ...service, ...normalizedTimes, totalMinutes: total }),
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
                          </div>
                          <TimeSequenceInput
                            value={serviceForms[employee.id] || defaultServiceForm}
                            onChange={(times, errors) => handleNewServiceTimesChange(employee.id, times, errors)}
                          />
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
                          {serviceFormErrors[employee.id]?.length ? (
                            <div className="footer-note" style={{ color: '#b91c1c' }}>
                              {serviceFormErrors[employee.id].join(' ')}
                            </div>
                          ) : null}
                          <Button type="button" onClick={() => handleCreateService(employee.id)}>
                            Salvar serviço
                          </Button>
                        </div>

                        <div className="stack">
                          {(services[employee.id] || []).map((service) => (
                            <div key={service.id} className="card" style={{ border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '10px' }}>
                              {(() => {
                                const { minutes } = computeServiceMinutesLib({
                                  t1In: service.t1In,
                                  t1Out: service.t1Out,
                                  t2In: service.t2In,
                                  t2Out: service.t2Out,
                                });
                                return (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <strong>Serviço</strong>
                                    <div className="footer-note">Total: {formatMinutes(minutes ?? service.totalMinutes)}</div>
                                  </div>
                                );
                              })()}
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
                                <TimeSequenceInput
                                  value={{
                                    t1In: service.t1In,
                                    t1Out: service.t1Out,
                                    t2In: service.t2In,
                                    t2Out: service.t2Out,
                                  }}
                                  onChange={(times, errors) => handleExistingServiceTimesChange(employee.id, service.id, times, errors)}
                                />
                              </div>
                              {serviceErrors[employee.id]?.[service.id]?.length ? (
                                <div className="footer-note" style={{ color: '#b91c1c' }}>
                                  {serviceErrors[employee.id][service.id].join(' ')}
                                </div>
                              ) : null}
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
