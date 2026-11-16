import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, pesos, getToken } from '../api/client.js';
import Alert from '../components/Alert.jsx';

const STATUS_LABELS = {
  pending_payment: 'Waiting for payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (searchParams.get('paid')) setNotice('Payment page completed. The order is confirmed when the gateway webhook is verified — use "Check payment status" if it still shows as pending.');
    if (searchParams.get('canceled')) setNotice('You returned from the payment page without paying. You can retry payment below.');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const data = await api('/orders', { token: getToken() });
      setOrders(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function open(order) {
    try {
      const data = await api(`/orders/${order._id}`, { token: getToken() });
      setDetail(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancel(order) {
    if (!window.confirm('Cancel this unpaid order?')) return;
    try {
      await api(`/orders/${order._id}/cancel`, { method: 'POST', token: getToken() });
      setDetail(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function retryPay(order) {
    try {
      const data = await api(`/orders/${order._id}/pay`, { method: 'POST', token: getToken() });
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      setError(e.message);
    }
  }

  // Reconciliation path (L2-06): ask the backend to verify the payment with the gateway.
  async function checkStatus(order) {
    setError('');
    try {
      const data = await api(`/payments/status/${order._id}`, { token: getToken() });
      setNotice(`Gateway says: ${data.gateway?.status || 'unknown'}. Order status: ${data.order.status}.`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <h1>My orders</h1>
      <Alert kind="info">{notice}</Alert>
      <Alert kind="error">{error}</Alert>
      {orders.length === 0 && <p className="muted">No orders yet.</p>}
      <table>
        <thead>
          <tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td><strong>{o.orderNumber}</strong></td>
              <td>{new Date(o.createdAt).toLocaleString()}</td>
              <td>{pesos(o.totalCents)}</td>
              <td><span className={`badge ${o.status === 'paid' ? '' : o.status === 'pending_payment' ? 'warn' : 'soft'}`}>{STATUS_LABELS[o.status]}</span></td>
              <td>
                <div className="row wrap" style={{ gap: 6 }}>
                  <button className="btn small secondary" onClick={() => open(o)}>Details</button>
                  {o.status === 'pending_payment' && (
                    <>
                      <button className="btn small" onClick={() => retryPay(o)}>Pay</button>
                      <button className="btn small secondary" onClick={() => cancel(o)}>Cancel</button>
                      <button className="btn small secondary" onClick={() => checkStatus(o)}>Check payment status</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {detail && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="row space">
            <h2 style={{ margin: 0 }}>{detail.order.orderNumber}</h2>
            <button className="btn small secondary" onClick={() => setDetail(null)}>Close</button>
          </div>
          <p className="muted">{STATUS_LABELS[detail.order.status]} · {detail.order.method === 'pickup' ? `Campus pickup` : `Delivery to ${detail.order.shipping?.address}`}</p>
          <table>
            <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Line total</th></tr></thead>
            <tbody>
              {detail.order.items.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.title}</td><td>{pesos(i.priceCents)}</td><td>{i.qty}</td><td>{pesos(i.priceCents * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="summary" style={{ marginTop: 12 }}>
            <div className="row"><span>Subtotal</span><span>{pesos(detail.order.subtotalCents)}</span></div>
            {detail.order.studentDiscountCents > 0 && <div className="row"><span>Student discount</span><span>−{pesos(detail.order.studentDiscountCents)}</span></div>}
            {detail.order.discountCents > 0 && <div className="row"><span>Coupon {detail.order.coupon?.code}</span><span>−{pesos(detail.order.discountCents)}</span></div>}
            <div className="row"><span>Shipping</span><span>{pesos(detail.order.shippingFeeCents)}</span></div>
            {detail.order.payment?.amountMismatch && <div className="alert error">Amount mismatch flagged: {detail.order.payment.mismatchNote}</div>}
            <div className="row total"><span>Total</span><span>{pesos(detail.order.totalCents)}</span></div>
          </div>
          <h2>Status history</h2>
          <ul>
            {detail.history.map((h, idx) => (
              <li key={idx} className="muted">{new Date(h.at).toLocaleString()} · {STATUS_LABELS[h.from]} → {STATUS_LABELS[h.to]} {h.note ? `· ${h.note}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
