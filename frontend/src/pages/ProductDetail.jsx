import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { catalogApi } from '../api/endpoints.js';
import { formatDate, pesos } from '../utils/format.js';
import { describeError, isAbortError } from '../utils/errors.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import BookCover from '../components/product/BookCover.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import QuantityStepper from '../components/ui/QuantityStepper.jsx';
import StickyActionBar from '../components/layout/StickyActionBar.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addItem, pendingIds } = useCart();
  const { online } = useNetworkStatus();
  const { notify } = useToast();

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: product, loading, error, refetch } = useApiQuery(
    ({ signal }) => catalogApi.product(id, { signal }),
    [id]
  );

  useDocumentTitle(product?.title || 'Book details');

  if (loading) {
    return (
      <div className="page" aria-busy="true" aria-live="polite">
        <PageHeader title="Book details" backTo="/products" backLabel="Back to catalog" />
        <div className="detail-skeleton">
          <Skeleton className="skeleton--detail-cover" />
          <div className="stack">
            <Skeleton className="skeleton--line skeleton--w70" />
            <Skeleton className="skeleton--line skeleton--w40" />
            <Skeleton className="skeleton--line skeleton--w30" />
            <Skeleton className="skeleton--line skeleton--w80" />
          </div>
        </div>
        <span className="sr-only">Loading book details…</span>
      </div>
    );
  }

  if (error && !isAbortError(error)) {
    return (
      <div className="page">
        <PageHeader title="Book details" backTo="/products" backLabel="Back to catalog" />
        <ErrorState
          title={error.code === 'PRODUCT_NOT_FOUND' ? 'This book is not available' : 'Could not load this book'}
          message={describeError(error)}
          offline={!online}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!product) return null;

  const releaseDate = product.releaseDate ? new Date(product.releaseDate) : null;
  const isPreOrder = Boolean(product.isPreOrder && releaseDate && releaseDate > new Date());
  const inStock = product.stock > 0 && !isPreOrder;
  const maxQty = Math.min(Math.max(product.stock, 1), 10);
  const isAdding = Boolean(pendingIds[id]);

  async function addToCart(thenGoTo) {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!online) {
      notify('You are offline. Reconnect to add this book to your cart.', { tone: 'error' });
      return;
    }
    try {
      await addItem(id, qty);
      setAdded(true);
      notify(`${product.title} added to cart.`, { tone: 'success' });
      if (thenGoTo) navigate(thenGoTo);
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    }
  }

  return (
    <div className="page page--detail">
      <PageHeader
        title={product.category?.name || 'Book details'}
        backTo="/products"
        backLabel="Back to catalog"
        action={
          <Link to="/cart" className="icon-btn icon-btn--badge" aria-label="View cart">
            <Icon name="bag" />
          </Link>
        }
      />

      <article className="product-detail">
        <div className="product-detail__media">
          <BookCover product={product} eager />
          {isPreOrder && <Badge tone="warn" className="product-detail__flag">Pre-order</Badge>}
        </div>

        <div className="product-detail__info">
          {product.courseCode && <span className="course-chip">{product.courseCode}</span>}
          <h1>{product.title}</h1>
          <p className="product-detail__author">by {product.author || 'SPC Book Store'}</p>

          <div className="product-detail__price-row">
            <strong className="price price--lg">{pesos(product.priceCents)}</strong>
            {isPreOrder ? (
              <Badge tone="warn">Releases {formatDate(product.releaseDate)}</Badge>
            ) : product.stock > 0 ? (
              <Badge tone={product.stock <= 5 ? 'warn' : 'success'}>
                {product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
              </Badge>
            ) : (
              <Badge tone="danger">Out of stock</Badge>
            )}
          </div>

          <p className="product-detail__description">
            {product.description || 'No description has been added for this title yet.'}
          </p>

          <dl className="detail-meta">
            <div>
              <dt>Category</dt>
              <dd>{product.category?.name || '—'}</dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>{product.courseCode || 'General'}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd>{product.stock} available</dd>
            </div>
          </dl>

          {!online && (
            <Alert kind="info">
              You are offline. This book is available from the cached catalog, but adding it to the cart needs a connection.
            </Alert>
          )}
          {added && <Alert kind="success">Added to your cart.</Alert>}
          {!user && online && (
            <p className="inline-note">
              <Icon name="lock" size={15} /> Sign in to add this title to your cart.
            </p>
          )}
        </div>
      </article>

      <section className="detail-shipping" aria-label="Fulfilment options">
        <div>
          <Icon name="store" size={19} />
          <div>
            <strong>Campus pickup</strong>
            <p className="muted">Choose a free pickup slot at checkout.</p>
          </div>
        </div>
        <div>
          <Icon name="truck" size={19} />
          <div>
            <strong>Home delivery</strong>
            <p className="muted">Shipping is calculated by the server at checkout.</p>
          </div>
        </div>
      </section>

      {inStock ? (
        <StickyActionBar label="Add this book to your cart">
          <div className="sticky-action-bar__qty">
            <span className="sticky-action-bar__label">Qty</span>
            <QuantityStepper value={qty} onChange={setQty} max={maxQty} label={`Quantity for ${product.title}`} />
          </div>
          <button
            type="button"
            className="btn btn--primary sticky-action-bar__main"
            onClick={() => addToCart(null)}
            disabled={isAdding || !online}
          >
            {isAdding ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="bag" size={18} />}
            {!online ? 'Offline' : isAdding ? 'Adding…' : user ? 'Add to cart' : 'Sign in to add'}
          </button>
        </StickyActionBar>
      ) : (
        <StickyActionBar label="Availability">
          <p className="sticky-action-bar__message">
            {isPreOrder
              ? `Available ${formatDate(product.releaseDate)}`
              : 'This title is currently out of stock.'}
          </p>
          <Link to="/products" className="btn btn--secondary">
            Browse similar
          </Link>
        </StickyActionBar>
      )}
    </div>
  );
}
