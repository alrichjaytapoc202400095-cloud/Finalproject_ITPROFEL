import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, pesos, getToken } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    method: 'delivery',
    pickupSlotId: '',
    name: user?.name || '',
    phone: '',
    address: '',
    couponCode: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/pickup-slots').then(setSlots).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function placeOrder(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      method: form.method,
      ...(form.couponCode ? { couponCode: form.couponCode } : {}),
      shipping: { name: form.name, phone: form.phone, address: form.address },
      ...(form.method === 'pickup' ? { pickupSlotId: form.pickupSlotId } : {}),
    };
    try {
      // Idempotency key (L2-08): a double click safely returns the same order.
      const idempotencyKey = `web-${user.id}-${Date.now()}`;
      const data = await api('/checkout', {
        method: 'POST',
        body,
        token: getToken(),
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      window.location.assign(data.checkoutUrl); // hosted gateway page (PayMongo test mode)
    } catch (err) {
      setError(err.details ? `${err.message} ${Object.values(err.details).join(' ')}` : err.message);
      setBusy(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <>
        <h1>Checkout</h1>
        <p className="muted">Your cart is empty. <button className="btn small secondary" onClick={() => navigate('/')}>Browse catalog</button></p>
      </>
    );
  }

  return (
    <>
      <h1>Checkout</h1>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <form onSubmit={placeOrder} className="panel" style={{ flex: 2, minWidth: 300 }}>
          <h2>Fulfillment</h2>
          <div className="row wrap">
            <label style={{ margin: 0 }}>
              <input type="radio" checked={form.method === 'delivery'} onChange={() => setForm({ ...form, method: 'delivery' })} /> Delivery
            </label>
            <label style={{ margin: 0 }}>
              <input type="radio" checked={form.method === 'pickup'} onChange={() => setForm({ ...form, method: 'pickup' })} /> Campus pickup (no shipping fee)
            </label>
          </div>

          {form.method === 'pickup' ? (
            <>
              <label>Campus pickup slot</label>
              <select value={form.pickupSlotId} onChange={(e) => setForm({ ...form, pickupSlotId: e.target.value })} required>
                <option value="">Choose a slot…</option>
                {slots.map((s) => (
                  <option key={s._id} value={s._id} disabled={s.remaining < 1}>
                    {s.date} · {s.timeWindow} ({s.remaining} of {s.capacity} left)
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label>Delivery address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder="Street, barangay, city" />
            </>
          )}

          <h2>Contact</h2>
          <label>Contact name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="09XXXXXXXXX" />

          <h2>Coupon</h2>
          <label>Coupon code (optional)</label>
          <input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
          {user?.student?.status === 'verified' && (
            <p className="alert success">Verified student discount is applied automatically on the server.</p>
          )}
          <Alert kind="error">{error}</Alert>
          <button className="btn" style={{ marginTop: 16, width: '100%' }} disabled={busy}>
            {busy ? 'Placing order…' : 'Place order and pay (test mode)'}
          </button>
        </form>

        <div className="summary" style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ marginTop: 0 }}>Order items</h2>
          {cart.items.map((i) => (
            <div className="row space" key={i.productId}>
              <span>{i.title} × {i.qty}</span><span>{pesos(i.lineTotalCents)}</span>
            </div>
          ))}
          <div className="row total"><span>Subtotal</span><span>{pesos(cart.subtotalCents)}</span></div>
          <p className="muted">Final totals (discounts + shipping) are calculated on the server.</p>
        </div>
      </div>
    </>
  );
}
