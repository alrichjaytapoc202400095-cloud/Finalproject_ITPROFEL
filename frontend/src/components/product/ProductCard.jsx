import { Link } from 'react-router-dom';
import { formatDate, pesos } from '../../utils/format.js';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import BookCover from './BookCover.jsx';

export default function ProductCard({ product, onAdd, isAdding = false, addDisabled = false }) {
  const releaseDate = product.releaseDate ? new Date(product.releaseDate) : null;
  const isPreOrder = Boolean(product.isPreOrder && releaseDate && releaseDate > new Date());
  const inStock = product.stock > 0 && !isPreOrder;

  return (
    <article className="product-card">
      <Link to={`/products/${product._id}`} className="product-card__link">
        <BookCover product={product} />
        <div className="product-card__body">
          {product.courseCode && <span className="course-chip">{product.courseCode}</span>}
          <h3 className="product-card__title">{product.title}</h3>
          <p className="product-card__author">{product.author || 'SPC Book Store'}</p>
          <div className="product-card__meta">
            <strong className="price">{pesos(product.priceCents)}</strong>
            {isPreOrder ? (
              <Badge tone="warn">Pre-order</Badge>
            ) : product.stock > 0 ? (
              product.stock <= 5 ? (
                <Badge tone="warn">{product.stock} left</Badge>
              ) : (
                <Badge tone="success">In stock</Badge>
              )
            ) : (
              <Badge tone="danger">Out of stock</Badge>
            )}
          </div>
        </div>
      </Link>

      {onAdd && inStock && (
        <button
          type="button"
          className="product-card__add"
          onClick={() => onAdd(product)}
          disabled={isAdding || addDisabled}
          aria-label={`Add to cart: ${product.title}`}
        >
          {isAdding ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="plus" size={16} />}
          <span>{isAdding ? 'Adding' : 'Add to cart'}</span>
        </button>
      )}

      {isPreOrder && (
        <p className="product-card__note">Releases {formatDate(product.releaseDate)}</p>
      )}
    </article>
  );
}
