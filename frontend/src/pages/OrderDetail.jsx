import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { checkoutApi, ordersApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { describeError } from '../utils/errors.js';
import { formatDate, formatDateTime, pesos } from '../utils/format.js';
import Alert from '../components/ui/Alert.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import Sheet from '../components/ui/Sheet.jsx';
import { OrderStatusBadge } from '../components/ui/Badge.jsx';
import { ListSkeleton } from '../components/ui/Skeleton.jsx';

const TRACK = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered'];
const TRACK_LABELS = {
  pending_payment: 'Placed',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

export default function OrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { online } = useNetworkStatus();
  const { notify } = useToast();

  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => ordersApi.get(id, { token, signal }),
    [id, token]
  );

  const order = data?.order;
  useDocumentTitle(order ? `Order ${order.orderNumber}` : 'Order details');

  if (loading && !order) {
    return (
      <div className="page">
        <PageHeader title="Order details" backTo="/orders" backLabel="Back to orders" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="page">
        <PageHeader title="Order details" backTo="/orders" backLabel="Back to orders" />
        {error.code === 'ORDER_NOT_FOUND' ? (
          <EmptyState
            title="Order not found"
            description="This order does not exist or belongs to another account."
            actionLabel="Back to my orders"
            actionTo="/orders"
            icon="receipt"
          />
        ) : (
          <ErrorState
            title="Could not load this order"
            message={describeError(error)}
            offline={!online}
            onRetry={refetch}
          />
        )}
      </div>
    );
  }

  if (!order) return null;

  const history = data.history || [];
  const trackIndex = TRACK.indexOf(order.status);
  const isPending = order.status === 'pending_payment';

  async function retryPayment() {
    setBusy('pay');
    setActionError('');
    try {
      const result = await ordersApi.retryPayment(order._id, { token });
      if (!result?.checkoutUrl) throw new Error('The payment session did not return a checkout URL.');
      window.location.assign(result.checkoutUrl);
    } catch (caught) {
      setActionError(describeError(caught));
      setBusy('');
    }
  }

  async function cancelOrder() {
    setBusy('cancel');
    setActionError('');
    try {
      await ordersApi.cancel(order._id, { token });
      notify('Order cancelled. Reserved stock was released.', { tone: 'success' });
      setConfirmOpen(false);
      refetch();
    } catch (caught) {
      setActionError(describeError(caught));
    } finally {
      setBusy('');
    }
  }

  async function checkStatus() {
    setBusy('check');
    setActionError('');
    try {
      const result = await checkoutApi.paymentStatus(order._id, { token });
      notify(
        `Gateway: ${result.gateway?.status || 'unknown'} · Order: ${result.order?.status || order.status}`,
        { tone: 'info', duration: 5000 }
      );
      refetch();
    } catch (caught) {
      setActionError(describeError(caught));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={order.orderNumber}
        eyebrow="Order details"
        subtitle={`Placed ${formatDateTime(order.createdAt)}`}
        backTo="/orders"
        backLabel="Back to orders"
        action={<OrderStatusBadge status={order.status} />}
      />

      {actionError && <Alert kind="error">{actionError}</Alert>}

      <section className={`status-hero status-hero--compact ${isPending ? 'status-hero--pending' : 'status-hero--success'}`}>
        <span className="status-hero__icon" aria-hidden="true">
          <Icon name={isPending ? 'clock' : order.status === 'delivered' ? 'check' : 'receipt'} size={25} />
        </span>
        <div>
          <h2>{isPending ? 'Waiting for payment' : order.status === 'paid' ? 'Payment confirmed' : 'Order in progress'}</h2>
          <p className="muted">
            {isPending
              ? 'Complete the payment to release your reservation into fulfilment.'
              : `Authoritative server status: ${order.status.replace('_', ' ')}.`}
          </p>
        </div>
      </section>

      {TRACK.includes(order.status) && (
        <ol className="track" aria-label="Order progress">
          {TRACK.map((step, index) => (
            <li
              key={step}
              className={`track__step ${index <= trackIndex ? 'is-done' : ''} ${index === trackIndex ? 'is-current' : ''}`}
              aria-current={index === trackIndex ? 'step' : undefined}
            >
              <span className="track__dot" aria-hidden="true">
                {index < trackIndex ? <Icon name="check" size={11} /> : index + 1}
              </span>
              <span className="track__label">{TRACK_LABELS[step]}</span>
            </li>
          ))}
        </ol>
      )}

      <section className="panel" aria-labelledby="items-heading">
        <h2 id="items-heading">Items</h2>
        <div className="stack">
          {(order.items || []).map((item, index) => (
            <div className="order-item" key={`${item.product || item.title}-${index}`}>
              <div>
                <strong>{item.title}</strong>
                <p className="muted">
                  {item.author || 'SPC Book Store'} · {item.qty} × {pesos(item.priceCents)}
                </p>
              </div>
              <strong>{pesos(item.priceCents * item.qty)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="order-summary" aria-label="Order totals">
        <h2>Totals</h2>
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{pesos(order.subtotalCents)}</span>
        </div>
        {order.studentDiscountCents > 0 && (
          <div className="summary-row">
            <span>Student discount</span>
            <span>−{pesos(order.studentDiscountCents)}</span>
          </div>
        )}
        {order.discountCents > 0 && (
          <div className="summary-row">
            <span>Coupon {order.coupon?.code}</span>
            <span>−{pesos(order.discountCents)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Shipping</span>
          <span>{order.shippingFeeCents === 0 ? 'Free (pickup)' : pesos(order.shippingFeeCents)}</span>
        </div>
        <div className="summary-row summary-row--strong">
          <span>Total</span>
          <span>{pesos(order.totalCents)}</span>
        </div>
        {order.payment?.amountMismatch && (
          <Alert kind="error">Payment amount mismatch flagged for administrator review.</Alert>
        )}
      </section>

      <section className="panel" aria-labelledby="fulfilment-heading">
        <h2 id="fulfilment-heading">Fulfilment</h2>
        <div className="detail-list">
          <div>
            <dt>Method</dt>
            <dd>{order.method === 'pickup' ? 'Campus pickup' : 'Home delivery'}</dd>
          </div>
          <div>
            <dt>Recipient</dt>
            <dd>{order.shipping?.name || '—'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{order.shipping?.phone || '—'}</dd>
          </div>
          <div>
            <dt>{order.method === 'pickup' ? 'Pickup point' : 'Address'}</dt>
            <dd>{order.shipping?.address || 'Campus pickup'}</dd>
          </div>
        </div>
      </section>

      {history.length > 0 && (
        <section className="panel" aria-labelledby="history-heading">
          <h2 id="history-heading">Status history</h2>
          <ol className="timeline">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                <span className="timeline__dot" aria-hidden="true" />
                <div>
                  <p>
                    <OrderStatusBadge status={entry.to} />
                    {entry.from && <span className="muted"> from {entry.from.replace('_', ' ')}</span>}
                  </p>
                  <p className="muted">
                    {formatDate(entry.at)} · {formatDateTime(entry.at)}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {isPending && (
        <div className="status-actions">
          <button type="button" className="btn btn--primary btn--full" onClick={retryPayment} disabled={Boolean(busy) || !online}>
            {busy === 'pay' ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="card" size={18} />}
            {busy === 'pay' ? 'Opening gateway…' : online ? 'Pay now' : 'Offline'}
          </button>
          <button type="button" className="btn btn--secondary btn--full" onClick={checkStatus} disabled={Boolean(busy) || !online}>
            {busy === 'check' ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="refresh" size={17} />}
            Check payment status
          </button>
          <button type="button" className="btn btn--ghost btn--full" onClick={() => setConfirmOpen(true)} disabled={Boolean(busy) || !online}>
            Cancel order
          </button>
        </div>
      )}

      <p className="muted order-detail-note">
        Need help? Contact the campus bookstore with your order number. <Link to="/products">Continue shopping</Link>
      </p>

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel this order?"
        description="Reserved stock and any pickup slot will be released immediately."
        footer={
          <div className="sheet__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmOpen(false)}>
              Keep order
            </button>
            <button type="button" className="btn btn--danger" onClick={cancelOrder} disabled={busy === 'cancel'}>
              {busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        }
      >
        <p className="muted">This cannot be undone. You can place a new order at any time.</p>
      </Sheet>
    </div>
  );
}
