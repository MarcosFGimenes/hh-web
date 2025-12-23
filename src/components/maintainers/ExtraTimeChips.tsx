import { TimeFieldChip } from './TimeFieldChip';

type ExtraTimeChipsProps = {
  shifts?: Array<{ id?: string; startTime: string; endTime: string }>;
  onAddExtra?: () => void;
};

export function ExtraTimeChips({ shifts = [], onAddExtra }: ExtraTimeChipsProps) {
  const hasShifts = shifts.length > 0;
  return (
    <div className="public-chip-row">
      <TimeFieldChip aria-label="Adicionar horário do turno" onClick={onAddExtra}>
        + Horário
      </TimeFieldChip>
      {hasShifts ? (
        <div className="public-chip-row">
          {shifts.map((shift) => (
            <span key={shift.id || `${shift.startTime}-${shift.endTime}`} className="pill pill-soft">
              {shift.startTime} – {shift.endTime}
            </span>
          ))}
        </div>
      ) : (
        <span className="pill pill-soft">Sem horário definido</span>
      )}
    </div>
  );
}
