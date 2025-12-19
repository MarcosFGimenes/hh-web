import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({ variant = 'primary', fullWidth, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button-${variant}${fullWidth ? ' ui-button-full' : ''} ${className}`.trim()}
      {...props}
    />
  );
}
