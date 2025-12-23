import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOs } from '@/types/maintainerOs';
import { ExtraTimeChips } from './ExtraTimeChips';

type MaintainerSectionProps = {
  maintainers: (Maintainer & { os?: MaintainerOs[] })[];
  canAdd: boolean;
  canManage: boolean;
  onAdd: (name: string) => void;
  onAddExtra: (maintainerId: string) => void;
  onAddOs: (maintainerId: string) => void;
  onUpdateOsTime: (maintainerId: string, osId: string, field: 'startTime' | 'endTime', value: string) => void;
  onEdit?: (maintainerId: string, currentName: string) => void;
  onDelete?: (maintainerId: string, currentName: string) => void;
};

export function MaintainerSection({
  maintainers,
  canAdd,
  canManage,
  onAdd,
  onAddExtra,
  onAddOs,
  onUpdateOsTime,
  onEdit,
  onDelete,
}: MaintainerSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaintainerName, setNewMaintainerName] = useState('');

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
      subtitle={`Total: ${maintainers.length}`}
      action={
        canManage ? (
          showAddForm ? null : (
            <Button
              type="button"
              onClick={() => setShowAddForm(true)}
              aria-label="Adicionar mantenedor"
              className="ui-button-compact"
            >
              + Adicionar Mantenedor
            </Button>
          )
        ) : null
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
                  <div className="maintainer-avatar" aria-hidden="true">
                    {maintainer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="maintainer-meta">
                    <p className="maintainer-name">{maintainer.name}</p>
                    <p className="footer-note">Atualizado em {new Date(maintainer.updatedAt || Date.now()).toLocaleString('pt-BR')}</p>
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

                {(maintainer.os || []).length ? (
                  <div className="maintainer-os-list">
                    {(maintainer.os || []).map((os) => (
                      <div key={os.id} className="maintainer-os-card">
                        <div className="maintainer-os-header">
                          <span className="pill pill-strong">#{os.osNumber}</span>
                          <span className="pill pill-soft">{os.description}</span>
                        </div>
                        <div className="maintainer-os-inputs">
                          <label className="ui-field">
                            <span className="ui-field-label">Início</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={os.startTime || ''}
                              onChange={(event) => onUpdateOsTime(maintainer.id, os.id, 'startTime', event.target.value)}
                            />
                          </label>
                          <label className="ui-field">
                            <span className="ui-field-label">Fim</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={os.endTime || ''}
                              onChange={(event) => onUpdateOsTime(maintainer.id, os.id, 'endTime', event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="footer-note">Nenhuma O.S. adicionada para este mantenedor.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
