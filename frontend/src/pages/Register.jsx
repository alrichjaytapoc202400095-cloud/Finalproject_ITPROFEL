import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeError, fieldErrors } from '../utils/errors.js';
import { hasErrors, validateRegister } from '../utils/validation.js';
import Alert from '../components/ui/Alert.jsx';
import Field from '../components/ui/Field.jsx';
import Icon from '../components/ui/Icon.jsx';

const EMPTY = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  studentNumber: '',
  course: '',
  year: '',
};

export default function Register() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const { online } = useNetworkStatus();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [showStudent, setShowStudent] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    const nextErrors = validateRegister(form);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    if (!online) {
      setServerError('You are offline. Reconnect to create your account.');
      return;
    }

    const hasStudent = showStudent && form.studentNumber.trim();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(hasStudent
        ? {
            student: {
              number: form.studentNumber.trim(),
              course: form.course.trim(),
              year: form.year.trim(),
            },
          }
        : {}),
    };

    setBusy(true);
    setServerError('');
    try {
      const user = await register(payload);
      navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (caught) {
      const fields = fieldErrors(caught);
      if (Object.keys(fields).length > 0) setErrors(fields);
      setServerError(describeError(caught));
      setBusy(false);
    }
  }

  return (
    <div className="page auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <span className="auth-card__mark" aria-hidden="true">
          <Icon name="book" size={26} />
        </span>
        <h1 id="register-title">Create your account</h1>
        <p className="muted auth-card__intro">
          Students who verify their details receive an automatic discount at checkout.
        </p>

        {!online && <Alert kind="info">Registration is paused while you are offline.</Alert>}
        {serverError && <Alert kind="error">{serverError}</Alert>}

        <form onSubmit={submit} noValidate className="stack">
          <Field label="Full name" required error={errors.name}>
            {(aria) => (
              <input
                {...aria}
                autoComplete="name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                maxLength={120}
              />
            )}
          </Field>

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

          <Field label="Password" required error={errors.password} hint="At least 8 characters.">
            {(aria) => (
              <div className="input-with-action">
                <input
                  {...aria}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                  minLength={8}
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

          <Field label="Confirm password" required error={errors.confirmPassword}>
            {(aria) => (
              <input
                {...aria}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) => update('confirmPassword', event.target.value)}
                maxLength={72}
              />
            )}
          </Field>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={showStudent}
              onChange={(event) => setShowStudent(event.target.checked)}
            />
            <span>
              <strong>Add student verification</strong>
              <small>Optional · unlocks the automatic student discount</small>
            </span>
          </label>

          {showStudent && (
            <div className="student-fields">
              <Field label="Student number" required={showStudent} error={errors.studentNumber}>
                {(aria) => (
                  <input
                    {...aria}
                    value={form.studentNumber}
                    onChange={(event) => update('studentNumber', event.target.value)}
                    placeholder="SPC-2024-0123"
                    maxLength={40}
                  />
                )}
              </Field>
              <div className="field-row">
                <Field label="Course" required={showStudent} error={errors.course}>
                  {(aria) => (
                    <input
                      {...aria}
                      value={form.course}
                      onChange={(event) => update('course', event.target.value.toUpperCase())}
                      placeholder="BSIT"
                      maxLength={80}
                    />
                  )}
                </Field>
                <Field label="Year level" required={showStudent} error={errors.year}>
                  {(aria) => (
                    <input
                      {...aria}
                      value={form.year}
                      onChange={(event) => update('year', event.target.value)}
                      placeholder="3rd"
                      maxLength={20}
                    />
                  )}
                </Field>
              </div>
              <p className="muted">An administrator reviews submitted student details.</p>
            </div>
          )}

          <button type="submit" className="btn btn--primary btn--full" disabled={busy || !online}>
            {busy ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="user" size={17} />}
            {busy ? 'Creating account…' : online ? 'Create account' : 'Offline'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <Link to="/" className="auth-back">
          <Icon name="arrowLeft" size={16} /> Back to storefront
        </Link>
      </section>
    </div>
  );
}
