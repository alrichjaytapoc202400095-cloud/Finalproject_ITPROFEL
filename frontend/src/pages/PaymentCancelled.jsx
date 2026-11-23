import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../api/endpoints.js';
import { getToken } from '../api/client.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useOrderReturn } from '../hooks/useOrderReturn.js';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { describeError } from '../utils/errors.js';
import { formatDateTime, pesos } from '../utils/format.js';
import Alert from '../components/ui/Alert.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import Sheet from '../components/ui/Sheet.jsx';
import { OrderStatusBadge } from '../components/ui/Badge.jsx';

export default function PaymentCancelled() {
  useDocumentTitle('Payment cancelled');
  const { order, loading, error, refresh } = useOrderReturn({ poll: false });
  const { online } = useNetworkStatus();
  const { notify } = useToast();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const paid = order?.status === 'paid';
  const open = order?.status === 'pending_payment';

  async function retryPayment() {
    if (!online) {
      setActionError('Reconnect to retry the payment.');
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      const data = await ordersApi.retryPayment(order._id, { token: getToken() });
      if (!data?.checkoutUrl) throw new Error('The payment session did not return a checkout URL.');
      window.location.assign(data.checkoutUrl);
    } catch (caught) {
      setActionError(describeError(caught));
      setBusy(false);
    }
  }

  async function cancelOrder() {
    setBusy(true);
    setActionError('');
    try {
      await ordersApi.cancel(order._id, { token: getToken() });
      notify('Order cancelled. Reserved stock was released.', { tone: 'success' });
      setConfirmOpen(false);
      refresh();
    } catch (caught) {
      setActionError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page payment-page">
      <PageHeader title="Payment cancelled" backTo="/orders" backLabel="Back to orders" />

      {loading ? (
        <section className="status-hero status-hero--loading" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <h2>Checking your order…</h2>
          <p className="muted">Reading the latest server-side status. Nothing is changed by this page.</p>
        </section>
      ) : error ? (
        error.toLowerCase().includes('could not find') ? (
          <EmptyState
            title="Order not found"
            description="We could not match this return link to an order. Your order history has the latest status."
            actionLabel="Open my orders"
            actionTo="/orders"
            icon="receipt"
          />
        ) : (
          <ErrorState
            title="Could not load this order"
            message={error}
            offline={!online}
            onRetry={refresh}
          />
        )
      ) : (
        <>
          <section
            className={`status-hero ${paid ? 'status-hero--success' : 'status-hero--cancelled'}`}
            aria-live="polite"
          >
            <span className="status-hero__icon" aria-hidden="true">
              <Icon name={paid ? 'check' : 'close'} size={27} />
            </span>
            <h1>{paid ? 'This order is already paid' : 'Payment was not completed'}</h1>
            <p className="muted">
              {paid
                ? 'The server already confirmed this payment, so no further action is needed.'
                : 'You returned from the gateway without a confirmed payment. Your order stays reserved for a short time while you decide.'}
            </p>
            {order && (
              <div className="status-hero__meta">
                <OrderStatusBadge status={order.status} />
                <span className="muted">Order {order.orderNumber}</span>
              </div>
            )}
          </section>

          {order && (
            <section className="order-summary" aria-label="Order recap">
              <h2>Order recap</h2>
              <div className="summary-row">
                <span>Total</span>
                <strong>{pesos(order.totalCents)}</strong>
              </div>
              <div className="summary-row">
                <span>Placed</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <OrderStatusBadge status={order.status} />
              </div>
            </section>
          )}

          {actionError && <Alert kind="error">{actionError}</Alert>}

          {paid ? (
            <div className="status-actions">
              <Link to={`/orders/${order._id}`} className="btn btn--primary btn--full">
                View order
              </Link>
              <Link to="/products" className="btn btn--secondary btn--full">
                Continue shopping
              </Link>
            </div>
          ) : open ? (
            <div className="status-actions">
              <button type="button" className="btn btn--primary btn--full" onClick={retryPayment} disabled={busy || !online}>
                {busy ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="card" size={18} />}
                {busy ? 'Opening gateway…' : online ? 'Retry payment' : 'Offline'}
              </button>
              <Link to={`/orders/${order._id}`} className="btn btn--secondary btn--full">
                View order details
              </Link>
              <button
                type="button"
                className="btn btn--ghost btn--full"
                onClick={() => setConfirmOpen(true)}
                disabled={busy || !online}
              >
                Cancel this order
              </button>
            </div>
          ) : (
            <div className="status-actions">
              <Link to="/products" className="btn btn--primary btn--full">
                Browse the catalog
              </Link>
              <Link to="/orders" className="btn btn--secondary btn--full">
                My orders
              </Link>
            </div>
          )}

          <p className="muted payment-disclaimer">
            Cancelling an unpaid order releases its reserved stock. Paid orders cannot be cancelled from this page.
          </p>
        </>
      )}

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel this order?"
        description="Reserved stock and your pickup slot will be released."
        footer={
          <div className="sheet__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmOpen(false)}>
              Keep order
            </button>
            <button type="button" className="btn btn--danger" onClick={cancelOrder} disabled={busy}>
              {busy ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        }
      >
        <p className="muted">
          You can always place the order again later. If the gateway eventually confirms a payment for this order, the
          server reconciliation job will flag it for the administrator.
        </p>
      </Sheet>
    </div>
  );
}
