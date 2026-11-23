import Icon from './Icon.jsx';

export default function ErrorState({
  title = 'We could not load this page',
  message,
  onRetry,
  offline = false,
}) {
  return (
    <section className="error-state" role="alert">
      <span className="error-state__icon" aria-hidden="true">
        <Icon name={offline ? 'wifiOff' : 'alert'} size={26} />
      </span>
      <h2>{title}</h2>
      {message && <p className="muted">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          <Icon name="refresh" size={17} />
          Try again
        </button>
      )}
      {offline && (
        <p className="muted error-state__note">
          Cached pages stay available. Network actions such as checkout and sign-in resume when you reconnect.
        </p>
      )}
    </section>
  );
}
