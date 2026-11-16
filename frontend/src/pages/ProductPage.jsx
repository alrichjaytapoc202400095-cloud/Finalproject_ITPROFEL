import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, pesos, getToken } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api(`/products/${id}`).then(setProduct).catch((e) => setError(e.message));
  }, [id]);

  async function add() {
    setError('');
    setAdded(false);
    try {
      await addItem(id, qty);
      setAdded(true);
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !product) return <Alert kind="error">{error}</Alert>;
  if (!product) return <p className="muted">Loading…</p>;

  const preOrder = product.isPreOrder && new Date(product.releaseDate) > new Date();

  return (
    <div className="panel" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <div className="thumb" style={{ width: 180, height: 220, fontSize: 34 }}>{product.title.slice(0, 2).toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 260 }}>
        <h1>{product.title}</h1>
        <p className="muted">by {product.author || '—'} · {product.category?.name}</p>
        {product.courseCode && <span className="badge soft">{product.courseCode}</span>}
        <p style={{ margin: '12px 0' }}>{product.description || 'No description.'}</p>
        <p><strong style={{ fontSize: 20 }}>{pesos(product.priceCents)}</strong></p>
        <p>
          {preOrder ? (
            <span className="badge warn">Pre-order · available {new Date(product.releaseDate).toDateString()}</span>
          ) : product.stock > 0 ? (
            <span className="badge">{product.stock} in stock</span>
          ) : (
            <span className="badge danger">Out of stock</span>
          )}
        </p>
        {!preOrder && product.stock > 0 && getToken() && (
          <div className="row" style={{ marginTop: 12 }}>
            <select value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 80 }}>
              {Array.from({ length: Math.min(product.stock, 10) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button className="btn" onClick={add}>Add to cart</button>
            <button className="btn secondary" onClick={() => { add().then(() => navigate('/cart')); }}>Buy now</button>
          </div>
        )}
        {!getToken() && <p className="muted" style={{ marginTop: 12 }}>Sign in to add items to your cart.</p>}
        <Alert kind="success">{added && 'Added to your cart.'}</Alert>
        <Alert kind="error">{error}</Alert>
      </div>
    </div>
  );
}
