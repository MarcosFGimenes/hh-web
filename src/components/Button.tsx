import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  PropsWithChildren<{
    variant?: ButtonVariant;
    fullWidth?: boolean;
    isLoading?: boolean;
  }>;

export function Button({
  variant = 'primary',
  fullWidth,
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const combinedClassName = `ui-button ui-button-${variant}${fullWidth ? ' ui-button-full' : ''} ${className}`.trim();

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? 'Carregando...' : children}
    </button>
  );
}
