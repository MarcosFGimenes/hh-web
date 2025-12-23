type ExtraTimeChipsProps = {
  shifts?: Array<{ id?: string; startTime: string; endTime: string }>;
};

export function ExtraTimeChips({ shifts = [] }: ExtraTimeChipsProps) {
  const hasShifts = shifts.length > 0;
  return (
    <div className="public-chip-row">
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
