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

const formatMinutesToTime = (minutes: number) => {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
};

export const parseTimeToMinutes = (value: string): number | null => {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export const normalizeTimes = (times: TimeSequence): NormalizeResult => {
  const errors: string[] = [];

  const t1InMin = parseTimeToMinutes(times.t1In);
  const t1OutMin = parseTimeToMinutes(times.t1Out);
  const t2InMin = times.t2In ? parseTimeToMinutes(times.t2In) : null;
  const t2OutMin = times.t2Out ? parseTimeToMinutes(times.t2Out) : null;

  if (t1InMin === null || t1OutMin === null) {
    errors.push('Horários do primeiro período são obrigatórios e devem estar no formato HH:MM.');
  }

  if (times.t2Out && t2InMin === null) {
    errors.push('Defina T2 Entrada antes de T2 Saída.');
  }

  if (errors.length > 0) {
    return {
      normalizedTimes: times,
      errors,
      minutesValues: { t1In: t1InMin, t1Out: t1OutMin, t2In: t2InMin, t2Out: t2OutMin },
    };
  }

  let n1 = t1InMin ?? 0;
  let n2 = t1OutMin ?? 0;
  let n3 = t2InMin;
  let n4 = t2OutMin;

  // Ajusta ordem: t1In <= t1Out <= t2In <= t2Out
  if (n2 < n1) n2 = n1;
  if (n3 !== null && n3 < n2) n3 = n2;
  if (n4 !== null && n3 !== null && n4 < n3) n4 = n3;

  // Validação final
  if (n2 < n1) errors.push('T1 Saída deve ser após T1 Entrada.');
  if (n3 !== null && n3 < n2) errors.push('T2 Entrada deve ser após T1 Saída.');
  if (n4 !== null && n3 !== null && n4 < n3) errors.push('T2 Saída deve ser após T2 Entrada.');

  const normalizedTimes: TimeSequence = {
    t1In: formatMinutesToTime(n1),
    t1Out: formatMinutesToTime(n2),
    t2In: n3 !== null ? formatMinutesToTime(n3) : '',
    t2Out: n4 !== null ? formatMinutesToTime(n4) : '',
  };

  return {
    normalizedTimes,
    errors,
    minutesValues: { t1In: n1, t1Out: n2, t2In: n3, t2Out: n4 },
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
