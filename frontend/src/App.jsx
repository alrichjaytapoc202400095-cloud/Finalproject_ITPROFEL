import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Guard from './components/Guard.jsx';
import Home from './pages/Home.jsx';
import ProductPage from './pages/ProductPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CartPage from './pages/CartPage.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import Assistant from './pages/Assistant.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Guard><CartPage /></Guard>} />
          <Route path="/checkout" element={<Guard><Checkout /></Guard>} />
          <Route path="/orders" element={<Guard><Orders /></Guard>} />
          <Route path="/assistant" element={<Guard><Assistant /></Guard>} />
          <Route path="/admin" element={<Guard adminOnly><Admin /></Guard>} />
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="footer">SPC Book Store · St. Peter's College Campus Bookstore</footer>
    </div>
  );
}
