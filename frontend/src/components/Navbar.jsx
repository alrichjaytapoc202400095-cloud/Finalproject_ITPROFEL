import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">📚 SPC Book Store</Link>
      <div className="nav-links">
        <NavLink to="/" end>Catalog</NavLink>
        {user && <NavLink to="/assistant">AI Assistant</NavLink>}
        {user && user.role !== 'admin' && <NavLink to="/cart">Cart ({cart.itemCount})</NavLink>}
        {user && <NavLink to="/orders">Orders</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logout ({user.name.split(' ')[0]})
          </button>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
