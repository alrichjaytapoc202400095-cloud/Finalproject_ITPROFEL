import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', studentNumber: '', course: '', year: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      ...(form.studentNumber ? { student: { number: form.studentNumber, course: form.course, year: form.year } } : {}),
    };
    try {
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.details ? `${err.message} ${Object.values(err.details).join(' ')}` : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 460, margin: '40px auto' }}>
      <h1>Create your account</h1>
      <p className="muted">Students who verify their student info get an automatic discount at checkout.</p>
      <form onSubmit={submit}>
        <label>Full name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password (min 8 characters)</label>
        <input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <h2 style={{ marginTop: 18 }}>Student verification (optional)</h2>
        <label>Student number</label>
        <input value={form.studentNumber} onChange={(e) => setForm({ ...form, studentNumber: e.target.value })} placeholder="SPC-2024-0123" />
        <label>Course</label>
        <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="BSIT" />
        <label>Year level</label>
        <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2nd" />
        <button className="btn" style={{ marginTop: 14, width: '100%' }} disabled={busy}>
          {busy ? 'Creating…' : 'Register'}
        </button>
      </form>
      <Alert kind="error">{error}</Alert>
      <p className="muted" style={{ marginTop: 10 }}>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
