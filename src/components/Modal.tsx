import type { PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{
  title?: string;
  open: boolean;
  onClose?: () => void;
  className?: string;
  bodyClassName?: string;
}>;

export function Modal({ title, open, onClose, className = '', bodyClassName = '', children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`ui-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header">
          {title ? <h3>{title}</h3> : null}
          {onClose ? (
            <button
              className="ui-button ui-button-ghost ui-modal-close"
              type="button"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          ) : null}
        </header>
        <div className={`ui-modal-body ${bodyClassName}`.trim()}>{children}</div>
      </div>
    </div>
  );
}
