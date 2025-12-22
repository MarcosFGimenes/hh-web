import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import type { Maintainer } from '@/types/maintainer';
import type { MaintainerOs } from '@/types/maintainerOs';
import { ExtraTimeChips } from './ExtraTimeChips';

type MaintainerSectionProps = {
  maintainers: (Maintainer & { os?: MaintainerOs[] })[];
  canAdd: boolean;
  onAdd: () => void;
  onAddExtra: (maintainerId: string) => void;
  onAddOs: (maintainerId: string) => void;
  onUpdateOsTime: (maintainerId: string, osId: string, field: 'startTime' | 'endTime', value: string) => void;
};

export function MaintainerSection({ maintainers, canAdd, onAdd, onAddExtra, onAddOs, onUpdateOsTime }: MaintainerSectionProps) {
  if (!maintainers.length) {
    return (
      <Card title="Mantenedores">
        <p className="footer-note">Nenhum mantenedor cadastrado ainda.</p>
        <Button type="button" onClick={onAdd} disabled={!canAdd} aria-label="Adicionar mantenedor">
          + Adicionar Mantenedor
        </Button>
      </Card>
    );
  }

  return (
    <Card
      title="Mantenedores"
      action={
        <Button type="button" onClick={onAdd} disabled={!canAdd} aria-label="Adicionar novo mantenedor">
          + Adicionar Mantenedor
        </Button>
      }
    >
      <div className="public-chip-list">
        {maintainers.map((maintainer) => (
          <div key={maintainer.id} className="public-chip-card">
            <div className="public-chip-row">
              <div className="pill pill-strong">{maintainer.name}</div>
              <span className="pill pill-soft">ID: {maintainer.id}</span>
            </div>
            <div className="public-chip-row">
              <span className="pill pill-soft">Início: {maintainer.startTime || '—'} · Fim: {maintainer.endTime || '—'}</span>
            </div>
            <ExtraTimeChips
              startTime={maintainer.startTime ?? null}
              endTime={maintainer.endTime ?? null}
              onAddExtra={() => onAddExtra(maintainer.id)}
            />
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
                          type="time"
                          value={os.startTime || ''}
                          onChange={(event) => onUpdateOsTime(maintainer.id, os.id, 'startTime', event.target.value)}
                        />
                      </label>
                      <label className="ui-field">
                        <span className="ui-field-label">Fim</span>
                        <input
                          type="time"
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
    </Card>
  );
}
