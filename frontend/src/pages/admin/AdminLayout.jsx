import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Icon from '../../components/ui/Icon.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/pickup-slots', label: 'Pickup slots' },
  { to: '/admin/students', label: 'Students' },
];

export default function AdminLayout() {
  useDocumentTitle('Store management');
  const { user } = useAuth();

  return (
    <div className="page admin-page">
      <PageHeader
        title="Store management"
        eyebrow="Administrator"
        subtitle={user?.email}
        backTo="/"
        backLabel="Back to storefront"
        action={
          <span className="admin-shield" aria-hidden="true">
            <Icon name="shield" size={19} />
          </span>
        }
      />

      <nav className="admin-tabs" aria-label="Store management sections">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <p className="admin-note">
        <Icon name="lock" size={14} /> Every action below is authorized and validated by the Express API.
      </p>

      <Outlet />
    </div>
  );
}
