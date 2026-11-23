import { pesos } from '../../utils/format.js';
import BookCover from '../product/BookCover.jsx';
import Icon from '../ui/Icon.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';

// One cart line as a mobile card (no desktop tables).
export default function CartLine({ item, onChange, onRemove, pending = false }) {
  const maxQty = Math.max(item.stock || 1, 1);

  return (
    <article className="cart-line" aria-busy={pending}>
      <BookCover
        product={{ title: item.title, author: item.author }}
        className="cart-line__cover"
      />
      <div className="cart-line__body">
        <div className="cart-line__top">
          <h2 className="cart-line__title">{item.title}</h2>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            onClick={() => onRemove(item.productId)}
            disabled={pending}
            aria-label={`Remove ${item.title} from cart`}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
        <p className="cart-line__author">{item.author || 'SPC Book Store'}</p>
        <div className="cart-line__footer">
          <QuantityStepper
            value={item.qty}
            min={1}
            max={maxQty}
            disabled={pending}
            label={`Quantity for ${item.title}`}
            onChange={(qty) => onChange(item.productId, qty)}
          />
          <div className="cart-line__price">
            <strong>{pesos(item.priceCents * item.qty)}</strong>
            <span className="muted">{pesos(item.priceCents)} each</span>
          </div>
        </div>
        {item.stock <= 5 && item.stock > 0 && (
          <p className="cart-line__stock">Only {item.stock} left in stock</p>
        )}
      </div>
    </article>
  );
}
