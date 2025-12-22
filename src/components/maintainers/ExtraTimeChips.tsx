import { TimeFieldChip } from './TimeFieldChip';

type ExtraTimeChipsProps = {
  startTime?: string | null;
  endTime?: string | null;
  onAddExtra?: () => void;
};

export function ExtraTimeChips({ startTime, endTime, onAddExtra }: ExtraTimeChipsProps) {
  const hasShift = Boolean(startTime && endTime);
  return (
    <div className="public-chip-row">
      <span className="ui-field-label">Horário do turno</span>
      <div className="public-chip-row">
        <span className="pill pill-soft">{hasShift ? `${startTime} – ${endTime}` : 'Sem horário definido'}</span>
        <TimeFieldChip aria-label="Adicionar horário do turno" onClick={onAddExtra}>
          + Horário
        </TimeFieldChip>
      </div>
    </div>
  );
}
