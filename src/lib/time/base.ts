const TIME_REGEX = /^\d{2}:\d{2}$/;

export const isValidTimeHHMM = (value: string): boolean => {
  const normalized = normalizeTime(value);
  if (!TIME_REGEX.test(normalized)) return false;
  const [h, m] = normalized.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

export const normalizeTime = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return trimmed;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return trimmed;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return trimmed;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const parseTimeToMinutes = (value: string): number | null => {
  if (!isValidTimeHHMM(value)) return null;
  const [h, m] = normalizeTime(value).split(':').map(Number);
  return h * 60 + m;
};

export const compareTimes = (a: string, b: string): number => {
  const aMinutes = parseTimeToMinutes(a);
  const bMinutes = parseTimeToMinutes(b);
  if (aMinutes === null || bMinutes === null) return 0;
  return aMinutes - bMinutes;
};

export const validateShiftPair = (start?: string, end?: string): { ok: boolean; message?: string } => {
  const normalizedStart = start ? normalizeTime(start) : '';
  const normalizedEnd = end ? normalizeTime(end) : '';

  if (!normalizedStart && !normalizedEnd) {
    return { ok: true };
  }

  if (!normalizedStart || !normalizedEnd) {
    return { ok: false, message: 'Preencha entrada e saída do turno' };
  }

  if (!isValidTimeHHMM(normalizedStart) || !isValidTimeHHMM(normalizedEnd)) {
    return { ok: false, message: 'Horário inválido. Use o formato HH:MM' };
  }

  if (compareTimes(normalizedStart, normalizedEnd) >= 0) {
    return { ok: false, message: 'Entrada deve ser menor que saída' };
  }

  return { ok: true };
};
