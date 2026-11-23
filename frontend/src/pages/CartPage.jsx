import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useCart } from '../context/CartContext.jsx';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { describeError } from '../utils/errors.js';
import Alert from '../components/ui/Alert.jsx';
import CartLine from '../components/cart/CartLine.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Icon from '../components/ui/Icon.jsx';
import { ListSkeleton } from '../components/ui/Skeleton.jsx';
import OrderSummary from '../components/cart/OrderSummary.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import StickyActionBar from '../components/layout/StickyActionBar.jsx';
import { pesos } from '../utils/format.js';

export default function CartPage() {
  useDocumentTitle('Your cart');
  const { cart, updateItem, removeItem, loading, offlineSnapshot, pendingIds, isMutating } = useCart();
  const { online } = useNetworkStatus();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function changeQty(productId, qty) {
    try {
      await updateItem(productId, qty);
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    }
  }

  async function remove(productId) {
    try {
      await removeItem(productId);
      notify('Item removed from cart.', { tone: 'info' });
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    }
  }

  if (loading && cart.items.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Your cart" backTo="/products" backLabel="Back to catalog" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Your cart" backTo="/products" backLabel="Back to catalog" />
        <EmptyState
          title="Your cart is empty"
          description="Browse textbooks, reviewers and campus essentials, then add them here."
          actionLabel="Browse the catalog"
          actionTo="/products"
          icon="bag"
        />
      </div>
    );
  }

  return (
    <div className="page page--with-action-bar">
      <PageHeader
        title="Your cart"
        subtitle={`${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`}
        backTo="/products"
        backLabel="Back to catalog"
      />

      {(offlineSnapshot || !online) && (
        <Alert kind="info">
          Offline: this is your saved cart. Quantities and checkout will sync when you reconnect.
        </Alert>
      )}

      <div className="stack cart-list">
        {cart.items.map((item) => (
          <CartLine
            key={item.productId}
            item={item}
            onChange={changeQty}
            onRemove={remove}
            pending={Boolean(pendingIds[item.productId]) || isMutating}
          />
        ))}
      </div>

      <OrderSummary itemCount={cart.itemCount} subtotalCents={cart.subtotalCents}>
        <p className="summary-note">
          <Icon name="shield" size={15} /> Coupons, student discounts and shipping are calculated on the server at checkout.
        </p>
      </OrderSummary>

      <p className="muted cart-edit-note">
        Need more? <Link to="/products">Keep browsing</Link>
      </p>

      <StickyActionBar label="Checkout">
        <div className="sticky-action-bar__totals">
          <span className="muted">Subtotal</span>
          <strong>{pesos(cart.subtotalCents)}</strong>
        </div>
        <button
          type="button"
          className="btn btn--primary sticky-action-bar__main"
          onClick={() => navigate('/checkout')}
          disabled={!online || isMutating}
          title={!online ? 'Checkout is unavailable while offline' : undefined}
        >
          {online ? 'Checkout' : 'Offline'}
          {online && <Icon name="arrowRight" size={17} />}
        </button>
      </StickyActionBar>
    </div>
  );
}
