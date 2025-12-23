import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import type { ServiceOrder } from '@/types/os';
import { isValidTimeHHMM, normalizeTime, parseTimeToMinutes } from '@/lib/time/base';

type IntervalRow = { id: string; startTime: string; endTime: string };

type AddOsModalProps = {
  open: boolean;
  date: string;
  maintainerName: string;
  existingIntervals: Array<{ startTime: string; endTime: string }>;
  availability?: Array<{ startTime: string; endTime: string }>;
  orders: ServiceOrder[];
  onClose: () => void;
  onCreateOs: (payload: { osCode: string; tag?: string; machineName?: string; description?: string }) => Promise<ServiceOrder>;
  onSubmit: (osId: string, intervals: Array<{ startTime: string; endTime: string }>) => Promise<void>;
  isSubmitting?: boolean;
};

const formatTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const overlap = (a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) => {
  const aStart = parseTimeToMinutes(a.startTime) ?? 0;
  const aEnd = parseTimeToMinutes(a.endTime) ?? 0;
  const bStart = parseTimeToMinutes(b.startTime) ?? 0;
  const bEnd = parseTimeToMinutes(b.endTime) ?? 0;
  return aStart < bEnd && aEnd > bStart;
};

const withinAvailability = (
  interval: { startTime: string; endTime: string },
  availability?: Array<{ startTime: string; endTime: string }>
) => {
  if (!availability || !availability.length) return true;
  const start = parseTimeToMinutes(interval.startTime);
  const end = parseTimeToMinutes(interval.endTime);
  if (start === null || end === null) return false;
  return availability.some((window) => {
    const aStart = parseTimeToMinutes(window.startTime);
    const aEnd = parseTimeToMinutes(window.endTime);
    if (aStart === null || aEnd === null) return false;
    return start >= aStart && end <= aEnd;
  });
};

export function AddOsModal({
  open,
  date,
  maintainerName,
  existingIntervals,
  availability,
  orders,
  onClose,
  onCreateOs,
  onSubmit,
  isSubmitting,
}: AddOsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedOsId, setSelectedOsId] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [osForm, setOsForm] = useState({ osCode: '', tag: '', machineName: '', description: '' });
  const [intervalRows, setIntervalRows] = useState<IntervalRow[]>([{ id: '0', startTime: '', endTime: '' }]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [savingOs, setSavingOs] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedOsId('');
      setCreatingNew(false);
      setOsForm({ osCode: '', tag: '', machineName: '', description: '' });
      setIntervalRows([{ id: '0', startTime: '', endTime: '' }]);
      setLocalError(null);
      setSavingOs(false);
    }
  }, [open]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (order) => order.osCode.toLowerCase().includes(term) || (order.tag || '').toLowerCase().includes(term)
    );
  }, [orders, search]);

  const validateIntervals = () => {
    const normalized: Array<{ startTime: string; endTime: string }> = [];
    for (const row of intervalRows) {
      const startTime = normalizeTime(row.startTime);
      const endTime = normalizeTime(row.endTime);
      if (!startTime || !endTime) {
        setLocalError('Informe entrada e saída em todos os intervalos.');
        return null;
      }
      if (!isValidTimeHHMM(startTime) || !isValidTimeHHMM(endTime)) {
        setLocalError('Horário inválido. Use HH:MM.');
        return null;
      }
      const start = parseTimeToMinutes(startTime);
      const end = parseTimeToMinutes(endTime);
      if (start === null || end === null || start >= end) {
        setLocalError('Entrada deve ser menor que saída.');
        return null;
      }
      normalized.push({ startTime, endTime });
    }

    for (let i = 0; i < normalized.length; i += 1) {
      for (let j = i + 1; j < normalized.length; j += 1) {
        if (overlap(normalized[i], normalized[j])) {
          setLocalError('Conflito de horário: esse período já está sendo usado em outra O.S.');
          return null;
        }
      }
    }

    for (const interval of normalized) {
      for (const existing of existingIntervals) {
        if (overlap(interval, existing)) {
          setLocalError('Conflito de horário: esse período já está sendo usado em outra O.S.');
          return null;
        }
      }

      if (!withinAvailability(interval, availability)) {
        setLocalError('Horário fora da disponibilidade definida para este mantenedor.');
        return null;
      }
    }

    setLocalError(null);
    return normalized;
  };

  const handleCreateOs = async () => {
    const osCode = osForm.osCode.trim();
    if (!osCode) {
      setLocalError('Código da O.S. é obrigatório.');
      return;
    }
    try {
      setSavingOs(true);
      const order = await onCreateOs({
        osCode,
        tag: osForm.tag.trim() || undefined,
        machineName: osForm.machineName.trim() || undefined,
        description: osForm.description.trim() || undefined,
      });
      setSavingOs(false);
      setSelectedOsId(order.id);
      setCreatingNew(false);
      setLocalError(null);
    } catch (error) {
      setSavingOs(false);
      const message = error instanceof Error ? error.message : 'Erro ao criar O.S.';
      setLocalError(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOsId) {
      setLocalError('Selecione uma O.S. antes de salvar.');
      return;
    }
    const normalized = validateIntervals();
    if (!normalized) return;
    await onSubmit(selectedOsId, normalized);
  };

  const toggleNewOs = () => {
    setCreatingNew(true);
    setSelectedOsId('');
  };

  const removeInterval = (id: string) => {
    setIntervalRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  return (
    <Modal
      title={`Adicionar O.S · ${maintainerName}`}
      open={open}
      onClose={onClose}
    >
      <form className="stack os-modal-form" onSubmit={handleSubmit}>
        <div className="modal-actions os-modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Confirmar
          </Button>
        </div>

        <div className="stack">
          <div className="ui-field">
            <span className="ui-field-label">Buscar O.S (código ou tag)</span>
            <input
              className="ui-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite para filtrar"
            />
          </div>

          <div className="os-select-list">
            {filteredOrders.map((order) => {
              const isSelected = selectedOsId === order.id;
              return (
                <button
                  type="button"
                  key={order.id}
                  className={`os-select-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedOsId(order.id);
                    setCreatingNew(false);
                  }}
                >
                  <div className="os-select-head">
                    <span className="pill pill-strong">{order.osCode}</span>
                    {order.tag ? <span className="pill pill-soft">{order.tag}</span> : null}
                    {order.isExternal ? <span className="pill pill-soft">Criada pelo terceiro</span> : null}
                  </div>
                  <p className="os-select-sub">
                    {[order.machineName, order.description].filter(Boolean).join(' · ') || 'Sem descrição'}
                  </p>
                </button>
              );
            })}

            <button
              type="button"
              className={`os-select-item os-select-new ${creatingNew ? 'is-selected' : ''}`}
              onClick={toggleNewOs}
            >
              <div className="os-select-head">
                <span className="pill pill-strong">Não encontrei — adicionar nova O.S</span>
              </div>
              <p className="os-select-sub">Informe código, TAG e equipamento (opcionais) e descreva brevemente.</p>
            </button>
          </div>

          {creatingNew ? (
            <div className="grid">
              <Input
                label="Código O.S *"
                value={osForm.osCode}
                onChange={(event) => setOsForm((prev) => ({ ...prev, osCode: event.target.value }))}
                required
              />
              <Input
                label="TAG (opcional)"
                value={osForm.tag}
                onChange={(event) => setOsForm((prev) => ({ ...prev, tag: event.target.value }))}
              />
              <Input
                label="Equipamento (opcional)"
                value={osForm.machineName}
                onChange={(event) => setOsForm((prev) => ({ ...prev, machineName: event.target.value }))}
              />
              <Input
                label="Descrição (opcional)"
                value={osForm.description}
                onChange={(event) => setOsForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <div className="os-new-actions">
                <Button type="button" onClick={handleCreateOs} isLoading={savingOs} disabled={savingOs}>
                  Salvar nova O.S
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="stack">
          <div className="stack">
            <div className="ui-field">
              <span className="ui-field-label">Horários já lançados hoje</span>
              <div className="maintainer-intervals-row">
                {existingIntervals.length ? (
                  existingIntervals.map((interval, index) => (
                    <span key={`${interval.startTime}-${interval.endTime}-${index}`} className="pill pill-soft">
                      {interval.startTime} – {interval.endTime}
                    </span>
                  ))
                ) : (
                  <span className="pill pill-soft">Nenhum horário lançado ainda.</span>
                )}
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="os-intervals-head">
              <p className="ui-field-label">Horários trabalhados nesta O.S ({date.split('-').reverse().join('/')})</p>
              <Button
                type="button"
                variant="secondary"
                className="ui-button-compact"
                onClick={() =>
                  setIntervalRows((prev) => [
                    ...prev,
                    {
                      id:
                        typeof crypto !== 'undefined' && 'randomUUID' in crypto
                          ? crypto.randomUUID()
                          : `${Date.now()}-${Math.random()}`,
                      startTime: '',
                      endTime: '',
                    },
                  ])
                }
              >
                + Adicionar intervalo
              </Button>
            </div>

            <div className="stack">
              {intervalRows.map((row, index) => (
                <div key={row.id} className="os-interval-row">
                  <Input
                    label={`Entrada ${index + 1}`}
                    value={row.startTime}
                    inputMode="numeric"
                    onChange={(event) =>
                      setIntervalRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, startTime: formatTimeInput(event.target.value) } : item
                        )
                      )
                    }
                    required
                  />
                  <Input
                    label={`Saída ${index + 1}`}
                    value={row.endTime}
                    inputMode="numeric"
                    onChange={(event) =>
                      setIntervalRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, endTime: formatTimeInput(event.target.value) } : item
                        )
                      )
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="ui-button-compact os-remove-button"
                    onClick={() => removeInterval(row.id)}
                    disabled={intervalRows.length === 1}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {localError ? <div className="form-error">{localError}</div> : null}

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Salvar apontamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
