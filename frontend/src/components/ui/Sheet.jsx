import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

// Slide-up bottom sheet: the mobile-native replacement for desktop modals.
// Escape closes it, background scroll is locked, and focus moves into the panel.
export default function Sheet({ open, onClose, title, description, children, footer }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    const frame = requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="sheet" role="presentation">
      <div className="sheet__backdrop" aria-hidden="true" onClick={onClose} />
      <section
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p className="muted">{description}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Close panel" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </section>
    </div>,
    document.body
  );
}
