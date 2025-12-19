import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function Input({ label, hint, className = '', ...props }: InputProps) {
  return (
    <label className="ui-field">
      {label ? <span className="ui-field-label">{label}</span> : null}
      <input className={`ui-input ${className}`.trim()} {...props} />
      {hint ? <span className="ui-field-hint">{hint}</span> : null}
    </label>
  );
}
