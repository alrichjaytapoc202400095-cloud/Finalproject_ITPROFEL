import { lazy } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import ScrollToTop from './components/layout/ScrollToTop.jsx';
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from './components/RouteGuards.jsx';

// Route-level code splitting keeps the first paint small.
const Home = lazy(() => import('./pages/Home.jsx'));
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const Assistant = lazy(() => import('./pages/Assistant.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess.jsx'));
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const OrderDetail = lazy(() => import('./pages/OrderDetail.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons.jsx'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'));
const AdminSlots = lazy(() => import('./pages/admin/AdminSlots.jsx'));
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents.jsx'));

function LegacyProductRedirect() {
  const { id } = useParams();
  return <Navigate to={`/products/${id}`} replace />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Catalog />} />
          <Route path="products/:id" element={<ProductDetail />} />
          {/* Backwards-compatible redirects for older links */}
          <Route path="product/:id" element={<LegacyProductRedirect />} />
          <Route path="assistant" element={<Navigate to="/ai-assistant" replace />} />

          <Route element={<RequireAuth />}>
            <Route path="ai-assistant" element={<Assistant />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="payment/success" element={<PaymentSuccess />} />
            <Route path="payment/cancelled" element={<PaymentCancelled />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="pickup-slots" element={<AdminSlots />} />
              <Route path="students" element={<AdminStudents />} />
            </Route>
          </Route>

          <Route element={<RedirectIfAuthenticated />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
