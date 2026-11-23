import { useMemo, useState } from 'react';
import { adminApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useToast } from '../../context/ToastContext.jsx';
import { describeError } from '../../utils/errors.js';
import { formatDateTime, pesos } from '../../utils/format.js';
import { ORDER_STATUS, ORDER_STATUS_FLOW } from '../../utils/constants.js';
import Badge, { OrderStatusBadge } from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { ListSkeleton } from '../../components/ui/Skeleton.jsx';

const FILTERS = ['all', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');

  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => adminApi.orders({ limit: 100 }, { token, signal }),
    [token]
  );

  const orders = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (filter === 'all') return list;
    return list.filter((order) => order.status === filter);
  }, [data, filter]);

  async function applyStatus(order) {
    const status = drafts[order._id];
    if (!status) {
      notify('Choose a next status first.', { tone: 'info' });
      return;
    }
    setBusy(order._id);
    try {
      await adminApi.setOrderStatus(order._id, status, { token });
      notify(`Order moved to ${ORDER_STATUS[status]?.label || status}.`, { tone: 'success' });
      setDrafts((previous) => ({ ...previous, [order._id]: '' }));
      refetch();
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  async function reconcile(order) {
    setBusy(`reconcile-${order._id}`);
    try {
      await adminApi.reconcileOrder(order._id, { token });
      notify('Gateway reconciliation requested.', { tone: 'success' });
      refetch();
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="stack">
      <div className="chip-row chip-row--filter" aria-label="Filter admin orders">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip ${filter === value ? 'is-selected' : ''}`}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'All' : ORDER_STATUS[value]?.label || value}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState title="Orders unavailable" message={describeError(error)} onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders in this view" description="Try another status filter." icon="receipt" />
      ) : (
        <div className="stack">
          {orders.map((order) => {
            const nextStatuses = ORDER_STATUS_FLOW[order.status] || [];
            return (
              <article className="admin-card" key={order._id}>
                <div className="admin-card__top">
                  <div>
                    <h2 className="admin-order-number">{order.orderNumber}</h2>
                    <p className="muted">
                      {order.user?.name || order.shipping?.name || 'Customer'} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="admin-card__facts">
                  <div><dt>Total</dt><dd>{pesos(order.totalCents)}</dd></div>
                  <div><dt>Items</dt><dd>{order.items?.length || 0}</dd></div>
                  <div><dt>Method</dt><dd>{order.method === 'pickup' ? 'Pickup' : 'Delivery'}</dd></div>
                </div>

                {order.payment?.amountMismatch && (
                  <p className="inline-note inline-note--error">
                    <Icon name="alert" size={15} /> Payment amount mismatch flagged.
                  </p>
                )}

                <div className="admin-order-actions">
                  <label className="sr-only" htmlFor={`status-${order._id}`}>Next status</label>
                  <select
                    id={`status-${order._id}`}
                    value={drafts[order._id] || ''}
                    onChange={(event) =>
                      setDrafts((previous) => ({ ...previous, [order._id]: event.target.value }))
                    }
                    disabled={nextStatuses.length === 0}
                  >
                    <option value="">{nextStatuses.length ? 'Next status…' : 'Final status'}</option>
                    {nextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {ORDER_STATUS[status]?.label || status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => applyStatus(order)}
                    disabled={busy === order._id || nextStatuses.length === 0}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => reconcile(order)}
                    disabled={busy === `reconcile-${order._id}`}
                  >
                    {busy === `reconcile-${order._id}` ? 'Checking…' : 'Verify payment'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="muted">
        Illegal status transitions are rejected by the API with HTTP 409. <Badge tone="muted">Server enforced</Badge>
      </p>
    </div>
  );
}
