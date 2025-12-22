import { describe, expect, it } from 'vitest';
import {
  computeDayTotalMinutes,
  computeServiceMinutes,
  normalizeTimes,
  parseTimeToMinutes,
  validateEmployeeServicesSum,
} from './service';

describe('parseTimeToMinutes', () => {
  it('converte horário válido em minutos', () => {
    expect(parseTimeToMinutes('08:30')).toBe(510);
  });

  it('retorna null para formato inválido', () => {
    expect(parseTimeToMinutes('8:30')).toBeNull();
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('aa:bb')).toBeNull();
  });
});

describe('normalizeTimes', () => {
  it('reporta erro quando T1 não está no formato correto', () => {
    const result = normalizeTimes({ t1In: '8:00', t1Out: '09:00', t2In: '', t2Out: '' });
    expect(result.errors).toContain('Horários do primeiro período são obrigatórios e devem estar no formato HH:MM.');
  });

  it('normaliza ordem invertida sem manter inconsistências', () => {
    const result = normalizeTimes({ t1In: '09:00', t1Out: '08:00', t2In: '07:30', t2Out: '07:00' });
    expect(result.normalizedTimes).toEqual({
      t1In: '09:00',
      t1Out: '09:00',
      t2In: '09:00',
      t2Out: '09:00',
    });
    expect(result.errors).toHaveLength(0);
  });
});

describe('computeServiceMinutes', () => {
  it('soma períodos válidos', () => {
    const result = computeServiceMinutes({ t1In: '08:00', t1Out: '12:00', t2In: '13:00', t2Out: '17:00' });
    expect(result.minutes).toBe(8 * 60);
    expect(result.errors).toHaveLength(0);
  });

  it('retorna erro quando total é zero ou negativo', () => {
    const result = computeServiceMinutes({ t1In: '10:00', t1Out: '10:00', t2In: '', t2Out: '' });
    expect(result.minutes).toBeNull();
    expect(result.errors).toContain('Total do serviço deve ser maior que zero.');
  });
});

describe('computeDayTotalMinutes', () => {
  it('calcula total do dia respeitando intervalo', () => {
    const result = computeDayTotalMinutes('08:00', '17:00', 60);
    expect(result.minutes).toBe(8 * 60);
    expect(result.errors).toHaveLength(0);
  });

  it('retorna erro quando horários são inválidos ou invertidos', () => {
    expect(computeDayTotalMinutes('', '17:00').minutes).toBeNull();
    expect(computeDayTotalMinutes('18:00', '17:00').errors).toContain('Horário final deve ser após o inicial.');
  });
});

describe('validateEmployeeServicesSum', () => {
  it('permite soma menor ou igual ao total do dia', () => {
    expect(validateEmployeeServicesSum([120, 60], 200).ok).toBe(true);
  });

  it('bloqueia soma maior que o total do dia', () => {
    const result = validateEmployeeServicesSum([200, 30], 220);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Soma dos serviços excede o horário total do funcionário.');
  });
});
