import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import type { Maintainer } from '@/types/maintainer';
import type { ServiceOrder } from '@/types/os';
import type { MaintainerOsLog } from '@/types/maintainerOsLog';
import { ExtraTimeChips } from './ExtraTimeChips';

type MaintainerSectionProps = {
  maintainers: Maintainer[];
  orders: ServiceOrder[];
  canAdd: boolean;
  canManage: boolean;
  onAdd: (name: string) => void;
  onAddExtra: (maintainerId: string) => void;
  onAddOs: (maintainerId: string) => void;
  onEdit?: (maintainerId: string, currentName: string) => void;
  onDelete?: (maintainerId: string, currentName: string) => void;
};

export function MaintainerSection({
  maintainers,
  orders,
  canAdd,
  canManage,
  onAdd,
  onAddExtra,
  onAddOs,
  onEdit,
  onDelete,
}: MaintainerSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaintainerName, setNewMaintainerName] = useState('');

  const ordersMap = orders.reduce<Record<string, ServiceOrder>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const submitAddMaintainer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = newMaintainerName.trim();
    if (!value) return;
    onAdd(value);
    setNewMaintainerName('');
    setShowAddForm(false);
  };

  return (
    <Card
      title="Mantenedores"
      action={
        <div className="maintainer-head-actions">
          <span className="maintainer-count">Total: {maintainers.length}</span>
          {canManage && !showAddForm ? (
            <Button
              type="button"
              onClick={() => setShowAddForm(true)}
              aria-label="Adicionar mantenedor"
              className="ui-button-compact"
            >
              + Adicionar Mantenedor
            </Button>
          ) : null}
        </div>
      }
      className="maintainer-card-shell"
    >
      <div className="stack">
        {showAddForm && canManage ? (
          <form className="maintainer-add-form" onSubmit={submitAddMaintainer}>
            <Input
              label="Nome do mantenedor"
              value={newMaintainerName}
              onChange={(event) => setNewMaintainerName(event.target.value)}
              required
            />
            <div className="maintainer-add-actions">
              <Button type="submit" disabled={!newMaintainerName.trim()}>
                Adicionar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewMaintainerName('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}

        {!maintainers.length ? (
          <p className="footer-note">Nenhum mantenedor cadastrado ainda.</p>
        ) : (
          <div className="maintainer-grid">
            {maintainers.map((maintainer) => (
              <div key={maintainer.id} className="maintainer-card">
                <div className="maintainer-card-header">
                  <div className="maintainer-person">
                    <div className="maintainer-avatar" aria-hidden="true">
                      {maintainer.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="maintainer-meta">
                      <p className="maintainer-name">{maintainer.name}</p>
                      <p className="maintainer-updated">
                        Atualizado em {new Date(maintainer.updatedAt || Date.now()).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="maintainer-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      className="ui-button-compact"
                      onClick={() => onAddExtra(maintainer.id)}
                      aria-label={`Adicionar horário para ${maintainer.name}`}
                      disabled={!canAdd}
                    >
                      + Horário
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="ui-button-compact"
                      onClick={() => onAddOs(maintainer.id)}
                      aria-label={`Adicionar O.S. para ${maintainer.name}`}
                      disabled={!canAdd}
                    >
                      + O.S.
                    </Button>
                    {canManage ? (
                      <div className="maintainer-manage-actions">
                        <Button
                          type="button"
                          variant="secondary"
                          className="ui-button-compact"
                          aria-label={`Editar ${maintainer.name}`}
                          onClick={() => onEdit?.(maintainer.id, maintainer.name)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="ui-button-compact"
                          aria-label={`Excluir ${maintainer.name}`}
                          onClick={() => onDelete?.(maintainer.id, maintainer.name)}
                        >
                          Excluir
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="maintainer-chip-row">
                  <ExtraTimeChips
                    shifts={maintainer.shifts?.map(({ startTime, endTime, id }) => ({ startTime, endTime, id }))}
                    onAddExtra={() => onAddExtra(maintainer.id)}
                  />
                </div>

                {(maintainer.osLogs || []).length ? (
                  <div className="maintainer-os-list">
                    {Object.entries(
                      (maintainer.osLogs || []).reduce<Record<string, MaintainerOsLog[]>>((acc, log) => {
                        acc[log.osId] = [...(acc[log.osId] || []), log];
                        return acc;
                      }, {})
                    ).map(([osId, logs]) => {
                      const order = ordersMap[osId];
                      const title = order ? `${order.osCode} — ${order.tag}` : 'O.S. vinculada';
                      return (
                        <div key={osId} className="maintainer-os-card">
                          <div className="maintainer-os-header">
                            <span className="pill pill-strong">{title}</span>
                            {order?.machineName ? <span className="pill pill-soft">{order.machineName}</span> : null}
                          </div>
                          <div className="maintainer-os-description">
                            {order?.description || 'Lançamento de horário associado a esta O.S.'}
                            {order?.isExternal ? <span className="pill pill-soft">Criada pelo terceiro</span> : null}
                          </div>
                          <div className="maintainer-intervals-row">
                            {logs
                              .slice()
                              .sort((a, b) => a.startTime.localeCompare(b.startTime))
                              .map((log) => (
                                <span key={log.id} className="pill pill-soft">
                                  {log.startTime} – {log.endTime}
                                </span>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="maintainer-empty">Nenhuma O.S. adicionada.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
