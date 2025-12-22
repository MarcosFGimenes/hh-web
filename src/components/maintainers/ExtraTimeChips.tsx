import { TimeFieldChip } from './TimeFieldChip';

type ExtraTimeChipsProps = {
  extraMinutes?: number | null;
  onAddExtra?: () => void;
};

export function ExtraTimeChips({ extraMinutes, onAddExtra }: ExtraTimeChipsProps) {
  return (
    <div className="public-chip-row">
      <span className="ui-field-label">Tempo extra</span>
      <div className="public-chip-row">
        <span className="pill pill-soft">{extraMinutes ? `${extraMinutes} min` : 'Sem extra'}</span>
        <TimeFieldChip aria-label="Adicionar tempo extra" onClick={onAddExtra}>
          + Adicionar
        </TimeFieldChip>
      </div>
    </div>
  );
}
