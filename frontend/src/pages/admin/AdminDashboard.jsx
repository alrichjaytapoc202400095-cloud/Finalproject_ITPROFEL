import { Link } from 'react-router-dom';
import { adminApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { describeError } from '../../utils/errors.js';
import { pesos } from '../../utils/format.js';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

export default function AdminDashboard() {
  const { token } = useAuth();
  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => adminApi.dashboard({ token, signal }),
    [token]
  );

  if (loading && !data) {
    return (
      <div className="stack" aria-busy="true">
        <div className="stat-grid">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="skeleton--stat" />
          ))}
        </div>
        <Skeleton className="skeleton--block" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Dashboard unavailable" message={describeError(error)} onRetry={refetch} />;
  }

  const lowStock = data.lowStock || [];

  return (
    <div className="stack">
      <section className="stat-grid" aria-label="Store totals">
        <article className="stat-card">
          <span className="stat-card__icon" aria-hidden="true"><Icon name="receipt" size={18} /></span>
          <p className="muted">Paid orders</p>
          <strong>{data.totalPaidOrders}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon" aria-hidden="true"><Icon name="tag" size={18} /></span>
          <p className="muted">Gross sales</p>
          <strong>{pesos(data.grossSalesCents)}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--warn" aria-hidden="true"><Icon name="clock" size={18} /></span>
          <p className="muted">Pending orders</p>
          <strong>{data.pendingOrders}</strong>
        </article>
      </section>

      <section className="panel" aria-labelledby="low-stock-heading">
        <div className="section__header">
          <h2 id="low-stock-heading">Low stock (≤ 5)</h2>
          <Link to="/admin/products" className="text-link">Manage stock</Link>
        </div>
        {lowStock.length === 0 ? (
          <p className="muted">Nothing is running low right now.</p>
        ) : (
          <ul className="admin-list">
            {lowStock.map((product) => (
              <li key={product._id}>
                <div>
                  <strong>{product.title}</strong>
                  <p className="muted">{product.courseCode || 'General'}</p>
                </div>
                <span className="badge badge--danger">{product.stock} left</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading">Quick actions</h2>
        <div className="admin-quick-grid">
          <Link to="/admin/products" className="menu-link"><Icon name="shop" size={18} /> Products</Link>
          <Link to="/admin/orders" className="menu-link"><Icon name="receipt" size={18} /> Orders</Link>
          <Link to="/admin/students" className="menu-link"><Icon name="users" size={18} /> Student queue</Link>
          <Link to="/admin/pickup-slots" className="menu-link"><Icon name="clock" size={18} /> Pickup slots</Link>
        </div>
      </section>
    </div>
  );
}
