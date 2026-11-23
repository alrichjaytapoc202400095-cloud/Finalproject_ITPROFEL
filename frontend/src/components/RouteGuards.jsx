import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './ui/Icon.jsx';

function SessionLoader() {
  return (
    <div className="session-loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p className="muted">Checking your session…</p>
    </div>
  );
}

// Client-side convenience only. The Express API enforces auth and roles on
// every protected endpoint, so this never replaces server-side authorization.
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (user.role !== 'admin') {
    return (
      <section className="forbidden" role="alert">
        <span className="forbidden__icon" aria-hidden="true">
          <Icon name="lock" size={26} />
        </span>
        <h1>Administrator access only</h1>
        <p className="muted">
          Your account can browse and order books, but it cannot open store management tools.
        </p>
        <div className="forbidden__actions">
          <Link to="/" className="btn btn--primary">
            Back to storefront
          </Link>
          <Link to="/orders" className="btn btn--secondary">
            My orders
          </Link>
        </div>
      </section>
    );
  }

  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <SessionLoader />;
  if (user) return <Navigate to={isAdmin ? '/admin' : '/'} replace />;
  return <Outlet />;
}
