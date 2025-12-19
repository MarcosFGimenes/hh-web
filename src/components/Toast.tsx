type ToastProps = {
  message: string;
  type?: 'info' | 'success' | 'error';
};

export function Toast({ message, type = 'info' }: ToastProps) {
  return <div className={`ui-toast ui-toast-${type}`}>{message}</div>;
}
