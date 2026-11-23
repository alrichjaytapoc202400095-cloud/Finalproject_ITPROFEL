import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { initials } from '../../utils/format.js';
import Icon from '../ui/Icon.jsx';
import InstallButton from '../ui/InstallButton.jsx';

export default function TopBar() {
  const { user, isAdmin } = useAuth();
  const { cart } = useCart();

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand__mark" aria-hidden="true">
          <Icon name="book" size={20} />
        </span>
        <span className="brand__text">
          <strong>SPC</strong>
          <small>Book Store</small>
        </span>
      </Link>

      <div className="topbar__actions">
        <InstallButton compact />
        <Link
          to={user ? (isAdmin ? '/admin' : '/orders') : '/login'}
          className="icon-btn"
          aria-label={user ? `Account: ${user.name}` : 'Sign in'}
        >
          {user ? (
            <span className="avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
          ) : (
            <Icon name="user" />
          )}
        </Link>
        {!isAdmin && (
          <Link
            to="/cart"
            className="icon-btn icon-btn--badge"
            aria-label={`Cart, ${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`}
          >
            <Icon name="bag" />
            {cart.itemCount > 0 && (
              <span className="count-badge" aria-hidden="true">
                {cart.itemCount > 99 ? '99+' : cart.itemCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
