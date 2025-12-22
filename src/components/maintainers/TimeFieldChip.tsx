import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type TimeFieldChipProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
  }
>;

export function TimeFieldChip({ active, className = '', children, ...props }: TimeFieldChipProps) {
  return (
    <button
      type="button"
      className={`pill ${active ? 'pill-strong' : 'pill-soft'} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
