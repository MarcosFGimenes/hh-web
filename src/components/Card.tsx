import type { PropsWithChildren, ReactNode } from 'react';

type CardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
}>;

export function Card({ title, subtitle, action, className = '', bodyClassName = '', children }: CardProps) {
  return (
    <div className={`ui-card ${className}`.trim()}>
      {(title || action) && (
        <header className="ui-card-header">
          <div>
            {title ? <h3 className="ui-card-title">{title}</h3> : null}
            {subtitle ? <p className="ui-card-subtitle">{subtitle}</p> : null}
          </div>
          {action ? <div className="ui-card-action">{action}</div> : null}
        </header>
      )}
      <div className={`ui-card-body ${bodyClassName}`.trim()}>{children}</div>
    </div>
  );
}
