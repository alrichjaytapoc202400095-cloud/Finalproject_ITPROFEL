import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { initials } from '../../utils/format.js';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import InstallButton from '../ui/InstallButton.jsx';
import Sheet from '../ui/Sheet.jsx';

function navClass({ isActive }) {
  return isActive ? 'bottom-nav__link is-active' : 'bottom-nav__link';
}

export default function BottomNav() {
  const { user, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the account sheet whenever the route changes.
  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    setAccountOpen(false);
    logout();
    navigate('/');
  }

  const items = isAdmin
    ? [
        { to: '/', label: 'Home', icon: 'home', end: true },
        { to: '/products', label: 'Shop', icon: 'shop' },
        { to: '/admin', label: 'Admin', icon: 'shield' },
        { to: '/admin/orders', label: 'Orders', icon: 'receipt' },
      ]
    : [
        { to: '/', label: 'Home', icon: 'home', end: true },
        { to: '/products', label: 'Shop', icon: 'shop' },
        { to: '/ai-assistant', label: 'AI', icon: 'sparkles' },
        { to: '/cart', label: 'Cart', icon: 'bag', badge: cart.itemCount },
      ];

  return (
    <>
      <nav className="bottom-nav" aria-label="Primary">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navClass} aria-label={item.label}>
            <span className="bottom-nav__icon">
              <Icon name={item.icon} size={21} />
              {item.badge > 0 && (
                <span className="count-badge count-badge--nav" aria-hidden="true">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className="bottom-nav__link"
          onClick={() => setAccountOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={accountOpen}
        >
          <span className="bottom-nav__icon">
            {user ? (
              <span className="avatar avatar--nav" aria-hidden="true">
                {initials(user.name)}
              </span>
            ) : (
              <Icon name="user" size={21} />
            )}
          </span>
          <span className="bottom-nav__label">{user ? 'Account' : 'Sign in'}</span>
        </button>
      </nav>

      <Sheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title={user ? 'Your account' : 'Welcome'}
        description={user ? user.email : 'Sign in to check out, track orders and use AI discovery.'}
      >
        {user ? (
          <div className="account-sheet">
            <div className="account-sheet__identity">
              <span className="avatar avatar--lg" aria-hidden="true">
                {initials(user.name)}
              </span>
              <div>
                <strong>{user.name}</strong>
                <p className="muted">
                  {isAdmin ? 'Store administrator' : 'Customer'}
                  {user.student?.status === 'verified' && (
                    <Badge tone="success" className="account-sheet__badge">
                      Verified student
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            <div className="stack account-sheet__links">
              <Link to="/orders" className="menu-link">
                <Icon name="receipt" size={19} />
                <span>My orders</span>
                <Icon name="chevronRight" size={17} className="menu-link__chevron" />
              </Link>
              <Link to="/ai-assistant" className="menu-link">
                <Icon name="sparkles" size={19} />
                <span>AI book discovery</span>
                <Icon name="chevronRight" size={17} className="menu-link__chevron" />
              </Link>
              {isAdmin && (
                <>
                  <Link to="/admin" className="menu-link">
                    <Icon name="shield" size={19} />
                    <span>Admin dashboard</span>
                    <Icon name="chevronRight" size={17} className="menu-link__chevron" />
                  </Link>
                  <Link to="/admin/products" className="menu-link">
                    <Icon name="shop" size={19} />
                    <span>Manage products</span>
                    <Icon name="chevronRight" size={17} className="menu-link__chevron" />
                  </Link>
                </>
              )}
              <div className="menu-link menu-link--static">
                <Icon name="plus" size={19} />
                <span>Install the app</span>
                <InstallButton />
              </div>
            </div>

            <button type="button" className="btn btn--secondary btn--full" onClick={handleLogout}>
              <Icon name="logout" size={18} />
              Sign out
            </button>
          </div>
        ) : (
          <div className="stack">
            <Link to="/login" className="btn btn--primary btn--full">
              Sign in
            </Link>
            <Link to="/register" className="btn btn--secondary btn--full">
              Create an account
            </Link>
            <p className="muted">
              A verified student account automatically receives the student discount at checkout.
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}
