import type { PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{
  title?: string;
  open: boolean;
  onClose?: () => void;
}>;

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header">
          {title ? <h3>{title}</h3> : null}
          {onClose ? (
            <button className="ui-button ui-button-ghost ui-modal-close" type="button" onClick={onClose}>
              ×
            </button>
          ) : null}
        </header>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  );
}
