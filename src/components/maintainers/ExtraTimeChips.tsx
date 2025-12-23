import { TimeFieldChip } from './TimeFieldChip';

type ExtraTimeChipsProps = {
  shifts?: Array<{ id?: string; startTime: string; endTime: string }>;
  onAddExtra?: () => void;
  onSelectShift?: (shiftId?: string, startTime?: string, endTime?: string) => void;
};

export function ExtraTimeChips({ shifts = [], onAddExtra, onSelectShift }: ExtraTimeChipsProps) {
  const hasShifts = shifts.length > 0;
  return (
    <div className="public-chip-row">
      <TimeFieldChip aria-label="Adicionar horário do turno" onClick={onAddExtra}>
        + Horário
      </TimeFieldChip>
      {hasShifts ? (
        <div className="public-chip-row">
          {shifts.map((shift) => (
            <button
              key={shift.id || `${shift.startTime}-${shift.endTime}`}
              type="button"
              className="pill pill-soft maintainer-shift-chip"
              onClick={() => onSelectShift?.(shift.id, shift.startTime, shift.endTime)}
            >
              {shift.startTime} – {shift.endTime}
            </button>
          ))}
        </div>
      ) : (
        <span className="pill pill-soft">Sem horário definido</span>
      )}
    </div>
  );
}
