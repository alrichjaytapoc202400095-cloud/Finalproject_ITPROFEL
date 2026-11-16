import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, pesos, getToken } from '../api/client.js';
import Alert from '../components/Alert.jsx';

// AI-assisted product discovery (Level 4). The answer and the product data
// both come from OUR backend; products are rendered as text links, never raw HTML.
export default function Assistant() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await api('/ai/assistant', { method: 'POST', body: { question }, token: getToken() }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>AI Book Assistant</h1>
      <p className="muted">Describe what you need — a subject, a course code, or an occasion. Answers are AI-assisted and always based on real products in our store.</p>
      <form onSubmit={ask} className="row" style={{ alignItems: 'stretch', maxWidth: 720 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What book do I need for IT301 or networking?"
          maxLength={500}
          required
        />
        <button className="btn" disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
      </form>
      <Alert kind="error">{error}</Alert>

      {result && (
        <div className="panel" style={{ marginTop: 16, maxWidth: 720 }}>
          <div className="row" style={{ marginBottom: 6 }}>
            <span className={`badge ${result.source === 'ai' ? 'soft' : 'warn'}`}>
              {result.source === 'ai' ? 'AI-assisted answer' : 'Keyword fallback (AI unavailable)'}
            </span>
          </div>
          <p>{result.answer}</p>
          {result.products?.length > 0 && (
            <div className="chips">
              {result.products.map((p) => (
                <Link to={`/product/${p._id}`} className="chip" key={p._id}>
                  <strong>{p.title}</strong> · {pesos(p.priceCents)} · {p.stock > 0 ? `${p.stock} in stock` : 'out of stock'}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
