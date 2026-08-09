import type { ReactNode } from 'react';

export function Modal({
  title,
  children,
  onClose,
  label,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
  label?: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="confirm-modal form-modal"
        role="dialog"
        aria-modal="true"
        aria-label={label ?? title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="form-modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
