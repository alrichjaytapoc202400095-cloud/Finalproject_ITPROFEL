import { Link } from 'react-router-dom';
import { pesos } from '../api/client.js';

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product._id}`} className="card product-card">
      <div className="thumb">{product.title.slice(0, 2).toUpperCase()}</div>
      <h3>{product.title}</h3>
      <p className="muted">{product.author || '—'}</p>
      <div className="row space">
        <strong>{pesos(product.priceCents)}</strong>
        {product.isPreOrder && new Date(product.releaseDate) > new Date() ? (
          <span className="badge warn">Pre-order</span>
        ) : product.stock > 0 ? (
          <span className="badge">{product.stock} in stock</span>
        ) : (
          <span className="badge danger">Out of stock</span>
        )}
      </div>
      {product.courseCode && <span className="badge soft">{product.courseCode}</span>}
    </Link>
  );
}
