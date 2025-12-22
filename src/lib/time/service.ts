import {
  compareTimes,
  isValidTimeHHMM,
  normalizeTime,
  parseTimeToMinutes,
  validateShiftPair,
} from './base';

export { parseTimeToMinutes } from './base';

export type TimeSequence = {
  t1In: string;
  t1Out: string;
  t2In: string;
  t2Out: string;
};

type NormalizeResult = {
  normalizedTimes: TimeSequence;
  errors: string[];
  minutesValues: {
    t1In: number | null;
    t1Out: number | null;
    t2In: number | null;
    t2Out: number | null;
  };
};

type ComputeResult = {
  minutes: number | null;
  errors: string[];
  normalizedTimes: TimeSequence;
};

type DayTotalResult = {
  minutes: number | null;
  errors: string[];
};

type ServicesSumValidation = { ok: boolean; error?: string };

const formatMinutesToTime = (minutes: number) => {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
};

export const normalizeTimes = (times: TimeSequence): NormalizeResult => {
  const errors: string[] = [];

  const normalized: TimeSequence = {
    t1In: normalizeTime(times.t1In),
    t1Out: normalizeTime(times.t1Out),
    t2In: normalizeTime(times.t2In),
    t2Out: normalizeTime(times.t2Out),
  };

  if (!normalized.t1In || !normalized.t1Out) {
    errors.push('Horários do primeiro período são obrigatórios e devem estar no formato HH:MM.');
  }

  if (normalized.t1In && !isValidTimeHHMM(normalized.t1In)) {
    errors.push('T1 Entrada inválida (use HH:MM).');
  }

  if (normalized.t1Out && !isValidTimeHHMM(normalized.t1Out)) {
    errors.push('T1 Saída inválida (use HH:MM).');
  }

  const firstValidation = validateShiftPair(normalized.t1In, normalized.t1Out);
  if (!firstValidation.ok && firstValidation.message) {
    errors.push(firstValidation.message);
  }

  if (normalized.t2In || normalized.t2Out) {
    const secondValidation = validateShiftPair(normalized.t2In, normalized.t2Out);
    if (!secondValidation.ok && secondValidation.message) {
      errors.push(secondValidation.message.replace('turno', 'turno 2'));
    }
  }

  if (!errors.length && normalized.t1In && normalized.t1Out && compareTimes(normalized.t1In, normalized.t1Out) >= 0) {
    errors.push('T1 Entrada deve ser menor que T1 Saída.');
  }

  const t1InMin = parseTimeToMinutes(normalized.t1In);
  const t1OutMin = parseTimeToMinutes(normalized.t1Out);
  const t2InMin = normalized.t2In ? parseTimeToMinutes(normalized.t2In) : null;
  const t2OutMin = normalized.t2Out ? parseTimeToMinutes(normalized.t2Out) : null;

  const minutesValues = { t1In: t1InMin, t1Out: t1OutMin, t2In: t2InMin, t2Out: t2OutMin };

  return {
    normalizedTimes: normalized,
    errors,
    minutesValues,
  };
};

export const computeServiceMinutes = (times: TimeSequence): ComputeResult => {
  const { normalizedTimes, errors, minutesValues } = normalizeTimes(times);

  if (errors.length > 0 || minutesValues.t1In === null || minutesValues.t1Out === null) {
    return { minutes: null, errors: errors.length ? errors : ['Horários inválidos.'], normalizedTimes };
  }

  const first = minutesValues.t1Out - minutesValues.t1In;
  const second =
    minutesValues.t2In !== null && minutesValues.t2Out !== null ? minutesValues.t2Out - minutesValues.t2In : 0;
  const total = first + second;

  if (total <= 0) {
    return { minutes: null, errors: ['Total do serviço deve ser maior que zero.'], normalizedTimes };
  }

  return { minutes: total, errors: [], normalizedTimes };
};

export const computeDayTotalMinutes = (dayStart: string, dayEnd: string, breakMinutes = 0): DayTotalResult => {
  const errors: string[] = [];

  const startMin = parseTimeToMinutes(dayStart);
  const endMin = parseTimeToMinutes(dayEnd);

  if (!dayStart || !dayEnd) {
    errors.push('Horário inicial e final são obrigatórios no formato HH:MM.');
  }

  if (startMin === null) {
    errors.push('Horário inicial inválido. Use o formato HH:MM.');
  }

  if (endMin === null) {
    errors.push('Horário final inválido. Use o formato HH:MM.');
  }

  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
    errors.push('Intervalo deve ser um número maior ou igual a zero.');
  }

  if (errors.length > 0 || startMin === null || endMin === null) {
    return { minutes: null, errors };
  }

  if (endMin <= startMin) {
    return { minutes: null, errors: ['Horário final deve ser após o inicial.'] };
  }

  const total = endMin - startMin - (breakMinutes || 0);

  if (total <= 0) {
    return { minutes: null, errors: ['Total do dia deve ser maior que zero.'] };
  }

  return { minutes: total, errors: [] };
};

export const validateEmployeeServicesSum = (
  servicesMinutes: number[],
  dayTotalMinutes: number
): ServicesSumValidation => {
  if (!Number.isFinite(dayTotalMinutes) || dayTotalMinutes <= 0) {
    return { ok: false, error: 'Defina o horário total do funcionário antes de lançar serviços.' };
  }

  const totalServices = servicesMinutes.reduce((acc, current) => acc + (Number.isFinite(current) ? current : 0), 0);

  if (totalServices > dayTotalMinutes) {
    return { ok: false, error: 'Soma dos serviços excede o horário total do funcionário.' };
  }

  return { ok: true };
};
