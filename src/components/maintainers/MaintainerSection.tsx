import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import type { Maintainer } from '@/types/maintainer';
import { ExtraTimeChips } from './ExtraTimeChips';

type MaintainerSectionProps = {
  maintainers: Maintainer[];
  canAdd: boolean;
  onAdd: () => void;
  onAddExtra: (maintainerId: string) => void;
};

export function MaintainerSection({ maintainers, canAdd, onAdd, onAddExtra }: MaintainerSectionProps) {
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
          </div>
        ))}
      </div>
    </Card>
  );
}
