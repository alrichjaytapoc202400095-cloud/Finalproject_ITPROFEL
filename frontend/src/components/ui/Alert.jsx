import Icon from './Icon.jsx';

// Inline alert. Errors use role="alert"; informational messages use a polite status.
export default function Alert({ kind = 'info', children, onRetry, actionLabel = 'Try again' }) {
  if (!children) return null;
  const role = kind === 'error' ? 'alert' : 'status';
  const iconName = kind === 'error' ? 'alert' : kind === 'success' ? 'check' : 'wifiOff';

  return (
    <div className={`alert alert--${kind}`} role={role}>
      <Icon name={iconName} size={18} className="alert__icon" />
      <div className="alert__content">
        <p>{children}</p>
        {onRetry && (
          <button type="button" className="alert__action" onClick={onRetry}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
