"use client";

import { useMemo } from 'react';
import { Input } from './Input';
import { normalizeTimes, type TimeSequence } from '@/lib/time/service';

type TimeSequenceInputProps = {
  value: TimeSequence;
  onChange: (value: TimeSequence, errors: string[]) => void;
  disabled?: boolean;
  label?: string;
};

export function TimeSequenceInput({ value, onChange, disabled, label }: TimeSequenceInputProps) {
  const { normalizedTimes, errors } = useMemo(() => normalizeTimes(value), [value]);

  const handleChange = (field: keyof TimeSequence, nextValue: string) => {
    const next = { ...value, [field]: nextValue };
    const result = normalizeTimes(next);
    onChange(result.normalizedTimes, result.errors);
  };

  return (
    <div className="stack">
      {label ? <span className="ui-field-label">{label}</span> : null}
      <div className="grid">
        <Input
          label="T1 Entrada"
          type="tel"
          inputMode="numeric"
          value={normalizedTimes.t1In}
          onChange={(event) => handleChange('t1In', event.target.value)}
          disabled={disabled}
          required
        />
        <Input
          label="T1 Saída"
          type="tel"
          inputMode="numeric"
          value={normalizedTimes.t1Out}
          onChange={(event) => handleChange('t1Out', event.target.value)}
          disabled={disabled}
          required
        />
        <Input
          label="T2 Entrada (opcional)"
          type="tel"
          inputMode="numeric"
          value={normalizedTimes.t2In}
          onChange={(event) => handleChange('t2In', event.target.value)}
          disabled={disabled}
        />
        <Input
          label="T2 Saída (opcional)"
          type="tel"
          inputMode="numeric"
          value={normalizedTimes.t2Out}
          onChange={(event) => handleChange('t2Out', event.target.value)}
          disabled={disabled}
        />
      </div>
      {errors.length ? (
        <div className="footer-note" style={{ color: '#b91c1c' }}>
          {errors.join(' ')}
        </div>
      ) : null}
    </div>
  );
}
