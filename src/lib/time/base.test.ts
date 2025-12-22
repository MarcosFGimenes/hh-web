import { describe, expect, it } from 'vitest';
import { compareTimes, isValidTimeHHMM, normalizeTime, parseTimeToMinutes, validateShiftPair } from './base';

describe('time base utils', () => {
  it('rejects invalid times', () => {
    const invalid = ['25:61', '11:99', '99:00', '-1:00', 'aa:bb'];
    invalid.forEach((value) => {
      expect(isValidTimeHHMM(value)).toBe(false);
      expect(parseTimeToMinutes(value)).toBeNull();
    });
  });

  it('accepts valid times', () => {
    const valid = ['00:00', '09:05', '23:59'];
    valid.forEach((value) => {
      expect(isValidTimeHHMM(value)).toBe(true);
      expect(parseTimeToMinutes(value)).toBeGreaterThanOrEqual(0);
    });
  });

  it('normalizes padded times', () => {
    expect(normalizeTime('8:0')).toBe('08:00');
    expect(normalizeTime('09:05')).toBe('09:05');
    expect(normalizeTime('aa:bb')).toBe('aa:bb');
  });

  it('compares times correctly', () => {
    expect(compareTimes('08:00', '09:00')).toBeLessThan(0);
    expect(compareTimes('09:00', '08:00')).toBeGreaterThan(0);
    expect(compareTimes('09:00', '09:00')).toBe(0);
  });

  it('validates shift pairs', () => {
    expect(validateShiftPair('', '')).toEqual({ ok: true });
    expect(validateShiftPair('08:00', '')).toEqual({ ok: false, message: 'Preencha entrada e saída do turno' });
    expect(validateShiftPair('', '12:00')).toEqual({ ok: false, message: 'Preencha entrada e saída do turno' });
    expect(validateShiftPair('12:00', '08:00')).toEqual({ ok: false, message: 'Entrada deve ser menor que saída' });
    expect(validateShiftPair('08:00', '12:00')).toEqual({ ok: true });
  });
});
