import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { pesos } from '../api/client.js';
import Alert from '../components/Alert.jsx';

export default function CartPage() {
  const { cart, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  async function change(productId, qty) {
    try {
      await updateItem(productId, qty);
    } catch (e) {
      alert(e.message);
    }
  }

  if (cart.items.length === 0) {
    return (
      <>
        <h1>Your cart</h1>
        <p className="muted">Your cart is empty. <Link to="/">Browse the catalog</Link>.</p>
      </>
    );
  }

  return (
    <>
      <h1>Your cart</h1>
      <table>
        <thead>
          <tr><th>Item</th><th>Price</th><th>Qty</th><th>Line total</th><th></th></tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr key={item.productId}>
              <td>
                <strong>{item.title}</strong>
                <div className="muted">{item.author}</div>
              </td>
              <td>{pesos(item.priceCents)}</td>
              <td>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn small secondary" onClick={() => change(item.productId, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                  {item.qty}
                  <button className="btn small secondary" onClick={() => change(item.productId, item.qty + 1)} disabled={item.qty >= item.stock}>+</button>
                </div>
              </td>
              <td>{pesos(item.lineTotalCents)}</td>
              <td><button className="btn small" onClick={() => removeItem(item.productId)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="summary" style={{ marginTop: 16 }}>
        <div className="row"><span>Items</span><span>{cart.itemCount}</span></div>
        <div className="row total"><span>Subtotal</span><span>{pesos(cart.subtotalCents)}</span></div>
        <p className="muted">Discounts, coupon and shipping are computed by the server at checkout.</p>
        <button className="btn" style={{ width: '100%' }} onClick={() => navigate('/checkout')}>Proceed to checkout</button>
      </div>
      <Alert>{null}</Alert>
    </>
  );
}
