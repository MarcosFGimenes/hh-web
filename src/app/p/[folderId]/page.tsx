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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Link inválido ou expirado.';
        setError(message);
        setFolder(null);
        setOrders([]);
        setEmployees([]);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar funcionários.';
      setError(message);
      setEmployees([]);
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
