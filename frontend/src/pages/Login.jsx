import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeError, fieldErrors } from '../utils/errors.js';
import { hasErrors, validateLogin } from '../utils/validation.js';
import Alert from '../components/ui/Alert.jsx';
import Field from '../components/ui/Field.jsx';
import Icon from '../components/ui/Icon.jsx';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const { online } = useNetworkStatus();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from;
  const redirectTo = from
    ? `${from.pathname || '/'}${from.search || ''}`
    : null;

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setServerError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = validateLogin(form);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    if (!online) {
      setServerError('You are offline. Reconnect to sign in.');
      return;
    }

    setBusy(true);
    setServerError('');
    try {
      const user = await login(form.email.trim(), form.password);
      const fallback = user.role === 'admin' ? '/admin' : '/';
      navigate(redirectTo || fallback, { replace: true });
    } catch (caught) {
      const fields = fieldErrors(caught);
      if (Object.keys(fields).length > 0) setErrors(fields);
      setServerError(describeError(caught));
      setBusy(false);
    }
  }

  return (
    <div className="page auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <span className="auth-card__mark" aria-hidden="true">
          <Icon name="book" size={26} />
        </span>
        <h1 id="login-title">Welcome back</h1>
        <p className="muted auth-card__intro">
          Sign in to reserve books, use AI discovery and track campus pickup.
        </p>

        {!online && <Alert kind="info">Sign-in is paused while you are offline.</Alert>}
        {serverError && <Alert kind="error">{serverError}</Alert>}

        <form onSubmit={submit} noValidate className="stack">
          <Field label="Email address" required error={errors.email}>
            {(aria) => (
              <input
                {...aria}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                placeholder="you@spc.edu"
                maxLength={160}
              />
            )}
          </Field>

          <Field label="Password" required error={errors.password}>
            {(aria) => (
              <div className="input-with-action">
                <input
                  {...aria}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                  maxLength={72}
                />
                <button
                  type="button"
                  className="input-with-action__btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={19} />
                </button>
              </div>
            )}
          </Field>

          <button type="submit" className="btn btn--primary btn--full" disabled={busy || !online}>
            {busy ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="lock" size={17} />}
            {busy ? 'Signing in…' : online ? 'Sign in' : 'Offline'}
          </button>
        </form>

        <p className="auth-switch">
          New to SPC Book Store? <Link to="/register">Create an account</Link>
        </p>

        <Link to="/" className="auth-back">
          <Icon name="arrowLeft" size={16} /> Back to storefront
        </Link>
      </section>
    </div>
  );
}
