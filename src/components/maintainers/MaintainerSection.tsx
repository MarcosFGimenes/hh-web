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
  onAdd: (name: string) => void;
  onAddExtra: (maintainerId: string) => void;
  onAddOs: (maintainerId: string) => void;
  onUpdateOsTime: (maintainerId: string, osId: string, field: 'startTime' | 'endTime', value: string) => void;
};

export function MaintainerSection({ maintainers, canAdd, onAdd, onAddExtra, onAddOs, onUpdateOsTime }: MaintainerSectionProps) {
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

  const AddMaintainerForm = (
    <form className="maintainer-add-form" onSubmit={submitAddMaintainer}>
      <Input
        label="Nome do mantenedor"
        value={newMaintainerName}
        onChange={(event) => setNewMaintainerName(event.target.value)}
        disabled={!canAdd}
        required
      />
      <div className="maintainer-add-actions">
        <Button type="submit" disabled={!canAdd || !newMaintainerName.trim()}>
          Adicionar
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setShowAddForm(false);
            setNewMaintainerName('');
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );

  const AddMaintainerCallToAction = showAddForm ? (
    AddMaintainerForm
  ) : (
    <Button type="button" onClick={() => setShowAddForm(true)} disabled={!canAdd} aria-label="Adicionar mantenedor">
      + Adicionar Mantenedor
    </Button>
  );

  if (!maintainers.length) {
    return (
      <Card title="Mantenedores">
        <p className="footer-note">Nenhum mantenedor cadastrado ainda.</p>
        {AddMaintainerCallToAction}
      </Card>
    );
  }

  return (
    <Card title="Mantenedores">
      <div className="public-chip-list">
        {maintainers.map((maintainer) => (
          <div key={maintainer.id} className="public-chip-card">
            <div className="public-chip-row">
              <div className="pill pill-strong">{maintainer.name}</div>
              <ExtraTimeChips
                shifts={maintainer.shifts?.map(({ startTime, endTime, id }) => ({ startTime, endTime, id }))}
                onAddExtra={() => onAddExtra(maintainer.id)}
              />
            </div>
            <div className="public-chip-row">
              <strong>O.S.</strong>
              <Button type="button" variant="secondary" onClick={() => onAddOs(maintainer.id)} disabled={!canAdd}>
                + Adicionar O.S.
              </Button>
            </div>
            {(maintainer.os || []).length ? (
              <div className="stack">
                {(maintainer.os || []).map((os) => (
                  <div key={os.id} className="public-chip-card">
                    <div className="public-chip-row">
                      <span className="pill pill-strong">#{os.osNumber}</span>
                      <span className="pill pill-soft">{os.description}</span>
                    </div>
                    <div className="public-chip-row">
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
      <div className="maintainer-add-footer">{AddMaintainerCallToAction}</div>
    </Card>
  );
}
