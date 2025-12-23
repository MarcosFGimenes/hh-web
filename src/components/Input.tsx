import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, className = '', icon, rightSlot, ...props },
  ref
) {
  return (
    <label className="ui-field">
      {label ? <span className="ui-field-label">{label}</span> : null}
      <div className={`ui-input-wrapper ${icon ? 'has-icon' : ''} ${rightSlot ? 'has-right' : ''}`.trim()}>
        {icon ? <span className="ui-input-icon" aria-hidden>{icon}</span> : null}
        <input ref={ref} className={`ui-input ${className}`.trim()} {...props} />
        {rightSlot ? <span className="ui-input-right-slot">{rightSlot}</span> : null}
      </div>
      {hint ? <span className="ui-field-hint">{hint}</span> : null}
    </label>
  );
});
