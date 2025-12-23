import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  PropsWithChildren<{
    variant?: ButtonVariant;
    fullWidth?: boolean;
    isLoading?: boolean;
    loadingText?: string;
  }>;

export function Button({
  variant = 'primary',
  fullWidth,
  isLoading = false,
  className = '',
  children,
  loadingText,
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
      {isLoading ? loadingText || 'Carregando...' : children}
    </button>
  );
}
