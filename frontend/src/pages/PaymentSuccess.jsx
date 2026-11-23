import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useOrderReturn } from '../hooks/useOrderReturn.js';
import { formatDateTime, pesos } from '../utils/format.js';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import Alert from '../components/ui/Alert.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { OrderStatusBadge } from '../components/ui/Badge.jsx';

export default function PaymentSuccess() {
  useDocumentTitle('Payment status');
  const { order, loading, verifying, error, refresh } = useOrderReturn();
  const { online } = useNetworkStatus();

  const paid = order?.status === 'paid';
  const pending = order?.status === 'pending_payment';

  return (
    <div className="page payment-page">
      <PageHeader title="Payment status" backTo="/orders" backLabel="Back to orders" />

      {loading ? (
        <section className="status-hero status-hero--loading" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <h2>Confirming with the server…</h2>
          <p className="muted">We are checking the authoritative payment status. This page never marks an order paid on its own.</p>
        </section>
      ) : error ? (
        error.toLowerCase().includes('could not find') ? (
          <EmptyState
            title="Order not found"
            description="The return link did not include a valid order reference. Open your order history to check the latest status."
            actionLabel="Open my orders"
            actionTo="/orders"
            icon="receipt"
          />
        ) : (
          <ErrorState
            title="Could not verify the payment yet"
            message={error}
            offline={!online}
            onRetry={refresh}
          />
        )
      ) : (
        <>
          <section
            className={`status-hero ${paid ? 'status-hero--success' : 'status-hero--pending'}`}
            aria-live="polite"
          >
            <span className="status-hero__icon" aria-hidden="true">
              <Icon name={paid ? 'check' : 'clock'} size={28} />
            </span>
            <h1>{paid ? 'Payment confirmed' : 'Payment pending verification'}</h1>
            <p className="muted">
              {paid
                ? 'The gateway confirmed your payment with the store server. Your order is now paid.'
                : 'The gateway has not confirmed this payment yet. It can take a few moments after returning from PayMongo.'}
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
                <span>Items</span>
                <span>{order.items?.reduce((sum, item) => sum + item.qty, 0) || 0}</span>
              </div>
              <div className="summary-row">
                <span>Placed</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="summary-row">
                <span>Fulfilment</span>
                <span>{order.method === 'pickup' ? 'Campus pickup' : 'Home delivery'}</span>
              </div>
            </section>
          )}

          {pending && (
            <Alert kind="info">
              If you just paid, wait a few seconds and check again. The webhook from the gateway may still be in
              transit.
            </Alert>
          )}

          <div className="status-actions">
            {pending && (
              <button type="button" className="btn btn--primary btn--full" onClick={refresh} disabled={verifying || !online}>
                {verifying ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="refresh" size={17} />}
                {verifying ? 'Checking…' : 'Check payment status'}
              </button>
            )}
            {order && (
              <Link to={`/orders/${order._id}`} className="btn btn--secondary btn--full">
                View order details
              </Link>
            )}
            <Link to="/products" className="btn btn--ghost btn--full">
              Keep shopping
            </Link>
          </div>

          <p className="muted payment-disclaimer">
            Authoritative status is read from the Express API. This informational return page cannot mark an order as
            paid.
          </p>
        </>
      )}
    </div>
  );
}
