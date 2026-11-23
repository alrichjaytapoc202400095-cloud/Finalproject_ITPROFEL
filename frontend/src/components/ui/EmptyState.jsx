import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// Friendly empty state with a lightweight inline illustration (no image request).
export default function EmptyState({ title, description, actionLabel, actionTo, onAction, icon = 'book' }) {
  return (
    <section className="empty-state" aria-live="polite">
      <div className="empty-state__art" aria-hidden="true">
        <svg viewBox="0 0 160 120" width="160" height="120" fill="none">
          <ellipse cx="80" cy="104" rx="54" ry="9" fill="#eadfce" />
          <path d="M80 30c-10-8-24-11-38-10v58c14-1 28 2 38 10 10-8 24-11 38-10V20c-14-1-28 2-38 10Z" fill="#fffaf2" stroke="#c9a27f" strokeWidth="2.5" />
          <path d="M80 30v58" stroke="#c9a27f" strokeWidth="2.5" />
          <path d="M52 36c6 0 12 1 18 4M52 46c6 0 12 1 18 4M52 56c6 0 12 1 18 4" stroke="#dfc3a8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M90 40c6-3 12-4 18-4M90 50c6-3 12-4 18-4M90 60c6-3 12-4 18-4" stroke="#dfc3a8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="122" cy="30" r="12" fill="#f6e7c8" />
          <path d="m118 30 3 3 5-6" stroke="#7b1f2b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn--primary empty-state__action">
          {actionLabel}
          <Icon name="arrowRight" size={16} />
        </Link>
      )}
      {actionLabel && !actionTo && onAction && (
        <button type="button" className="btn btn--primary empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}
