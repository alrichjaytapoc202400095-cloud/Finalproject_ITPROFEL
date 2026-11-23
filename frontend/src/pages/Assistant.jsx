import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { aiApi } from '../api/endpoints.js';
import { getToken } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { MAX_AI_QUESTION_CHARS } from '../utils/constants.js';
import { describeError, isAiUnavailable } from '../utils/errors.js';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import { ProductGridSkeleton } from '../components/ui/Skeleton.jsx';

const SUGGESTIONS = [
  'What book do I need for IT301?',
  'Cheap reviewers for the civil service exam',
  'Something for a first-year nursing student',
  'Books about building good habits',
];

export default function Assistant() {
  useDocumentTitle('AI book discovery');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, pendingIds } = useCart();
  const { online } = useNetworkStatus();
  const { notify } = useToast();

  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = question.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 3;
  const remaining = MAX_AI_QUESTION_CHARS - question.length;

  async function ask(event) {
    event?.preventDefault();
    if (busy) return;
    if (!online) {
      setError('AI discovery needs a live connection. Browse the cached catalog while you are offline.');
      return;
    }
    if (trimmed.length < 3) {
      setError('Ask a question with at least 3 characters.');
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
    try {
      const answer = await aiApi.ask(trimmed, { token: getToken() });
      setResult(answer);
    } catch (caught) {
      setError(
        isAiUnavailable(caught)
          ? 'The AI assistant is unavailable right now. Use the keyword search below instead — it searches the same catalog.'
          : describeError(caught)
      );
    } finally {
      setBusy(false);
    }
  }

  function useSuggestion(text) {
    setQuestion(text);
    setError('');
  }

  async function handleAdd(product) {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/ai-assistant' } } });
      return;
    }
    if (!online) {
      notify('You are offline. Reconnect to update your cart.', { tone: 'error' });
      return;
    }
    try {
      await addItem(product._id, 1);
      notify(`${product.title} added to cart.`, { tone: 'success' });
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    }
  }

  const sourceIsAi = result?.source === 'ai';

  return (
    <div className="page ai-page">
      <PageHeader
        title="AI book discovery"
        subtitle="Describe what you need in your own words"
        backTo="/"
        backLabel="Back to home"
      />

      <section className="ai-intro" aria-labelledby="ai-intro-title">
        <span className="ai-intro__icon" aria-hidden="true">
          <Icon name="sparkles" size={22} />
        </span>
        <div>
          <h2 id="ai-intro-title">Grounded in the real store catalog</h2>
          <p className="muted">
            Your question goes to the SPC Express API, which retrieves products from the database and asks the AI to
            rank them. Prices and stock always come from the verified catalog — never from AI text.
          </p>
        </div>
      </section>

      {!online && (
        <Alert kind="info">
          You are offline. AI discovery and keyword search resume when you reconnect; cached books are still available.
        </Alert>
      )}

      <form className="ai-form" onSubmit={ask}>
        <div className="ai-form__field">
          <label htmlFor="ai-question" className="sr-only">
            What book are you looking for?
          </label>
          <textarea
            id="ai-question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value.slice(0, MAX_AI_QUESTION_CHARS));
              setError('');
            }}
            placeholder="e.g. I need the textbook for Networking IT305, or a cheap reviewer for education majors…"
            rows={3}
            maxLength={MAX_AI_QUESTION_CHARS}
            aria-describedby="ai-counter"
            disabled={!online}
          />
          <div className="ai-form__meta">
            <span className={`muted ${remaining < 50 ? 'ai-counter--warn' : ''}`} id="ai-counter" aria-live="polite">
              {remaining} characters left
            </span>
            {question && (
              <button type="button" className="text-link" onClick={() => setQuestion('')} disabled={busy}>
                Clear
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={busy || !online || trimmed.length < 3}
        >
          {busy ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="sparkles" size={18} />}
          {busy ? 'Searching the catalog…' : online ? 'Ask the assistant' : 'Offline'}
        </button>
      </form>

      <div className="chip-row" aria-label="Example questions">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="chip"
            onClick={() => useSuggestion(suggestion)}
            disabled={busy || !online}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {tooShort && <p className="field__hint">Ask at least 3 characters.</p>}
      {error && (
        <Alert kind="error">
          {error}
          {error.toLowerCase().includes('unavailable') && (
            <>
              {' '}
              <Link to={`/products?q=${encodeURIComponent(trimmed)}`} className="alert__inline-link">
                Search the catalog for “{trimmed}”
              </Link>
            </>
          )}
        </Alert>
      )}

      {busy && (
        <section aria-live="polite" aria-busy="true" className="stack">
          <p className="muted">Matching your request against real products…</p>
          <ProductGridSkeleton count={4} />
        </section>
      )}

      {result && (
        <section className="ai-result" aria-labelledby="ai-result-title">
          <div className="ai-result__header">
            <div className="row">
              <span className="ai-badge" aria-hidden="true">
                <Icon name="sparkles" size={14} />
              </span>
              <Badge tone={sourceIsAi ? 'info' : 'warn'}>
                {sourceIsAi ? 'AI-Assisted' : 'Keyword fallback'}
              </Badge>
              {result.fallbackReason && <span className="muted">({result.fallbackReason.replace('_', ' ')})</span>}
            </div>
            <h2 id="ai-result-title">Recommendations</h2>
            <p className="ai-result__answer">{result.answer}</p>
            <p className="ai-result__disclosure">
              <Icon name="shield" size={14} /> AI-assisted suggestions. Product names, prices, stock and links below are
              verified database records from the SPC API.
            </p>
          </div>

          {result.products?.length > 0 ? (
            <ProductGrid
              products={result.products}
              onAdd={handleAdd}
              pendingIds={pendingIds}
              addDisabled={!online}
            />
          ) : (
            <p className="muted">No matching products were found. Try a course code, title or author.</p>
          )}
        </section>
      )}
    </div>
  );
}
