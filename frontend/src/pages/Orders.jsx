import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ordersApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useToast } from '../context/ToastContext.jsx';
import { describeError } from '../utils/errors.js';
import { formatDate, formatDateTime, pesos } from '../utils/format.js';
import Badge, { OrderStatusBadge } from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { ListSkeleton } from '../components/ui/Skeleton.jsx';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending_payment', label: 'To pay' },
  { value: 'paid', label: 'Paid' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  useDocumentTitle('My orders');
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [payingId, setPayingId] = useState(null);

  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => ordersApi.list({ limit: 50 }, { token, signal }),
    [token]
  );

  // Backwards-compatible landing for backend redirect URLs (?paid=1 / ?canceled=1).
  useEffect(() => {
    const orderRef = searchParams.get('order') || searchParams.get('orderId') || '';
    const suffix = orderRef ? `?order=${encodeURIComponent(orderRef)}` : '';
    if (searchParams.get('paid')) navigate(`/payment/success${suffix}`, { replace: true });
    else if (searchParams.get('canceled') || searchParams.get('cancelled')) {
      navigate(`/payment/cancelled${suffix}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orders = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (filter === 'all') return list;
    return list.filter((order) => order.status === filter);
  }, [data, filter]);

  async function retryPayment(order) {
    setPayingId(order._id);
    try {
      const result = await ordersApi.retryPayment(order._id, { token });
      if (!result?.checkoutUrl) throw new Error('The payment session did not return a checkout URL.');
      window.location.assign(result.checkoutUrl);
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
      setPayingId(null);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="My orders"
        subtitle="Track payment, pickup and delivery status"
        backTo="/"
        backLabel="Back to home"
      />

      <div className="chip-row chip-row--filter" role="tablist" aria-label="Filter orders by status">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={filter === option.value}
            className={`chip ${filter === option.value ? 'is-selected' : ''}`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState title="Could not load your orders" message={describeError(error)} onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No orders yet' : 'No matching orders'}
          description={
            filter === 'all'
              ? 'When you place an order it will appear here with its live server status.'
              : 'Try a different status filter to see your other orders.'
          }
          actionLabel={filter === 'all' ? 'Start shopping' : 'Show all orders'}
          actionTo={filter === 'all' ? '/products' : undefined}
          onAction={filter === 'all' ? undefined : () => setFilter('all')}
          icon="receipt"
        />
      ) : (
        <div className="stack order-list" aria-live="polite">
          {orders.map((order) => (
            <article className="order-card" key={order._id}>
              <Link to={`/orders/${order._id}`} className="order-card__link">
                <div className="order-card__top">
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <p className="muted">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="order-card__meta">
                  <span>
                    <Icon name={order.method === 'pickup' ? 'store' : 'truck'} size={15} />
                    {order.method === 'pickup' ? 'Campus pickup' : 'Home delivery'}
                  </span>
                  <span>{order.items?.length || 0} title{(order.items?.length || 0) === 1 ? '' : 's'}</span>
                </div>
                <div className="order-card__footer">
                  <span className="muted">Total</span>
                  <strong className="price">{pesos(order.totalCents)}</strong>
                </div>
              </Link>

              <div className="order-card__actions">
                {order.status === 'pending_payment' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => retryPayment(order)}
                      disabled={payingId === order._id}
                    >
                      {payingId === order._id ? 'Opening…' : 'Pay now'}
                    </button>
                    <Link to={`/orders/${order._id}`} className="btn btn--secondary btn--sm">
                      Details
                    </Link>
                  </>
                ) : (
                  <Link to={`/orders/${order._id}`} className="btn btn--secondary btn--sm">
                    View details
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {data?.meta?.total > orders.length && filter === 'all' && (
        <p className="muted orders-note">
          Showing {orders.length} of {data.meta.total} orders. Older orders are available from the administrator.
        </p>
      )}
    </div>
  );
}
