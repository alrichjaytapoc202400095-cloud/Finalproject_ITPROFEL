import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { catalogApi, checkoutApi } from '../api/endpoints.js';
import { getToken } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { createIdempotencyKey } from '../utils/idempotency.js';
import { describeError, fieldErrors } from '../utils/errors.js';
import { hasErrors, validateCheckout } from '../utils/validation.js';
import { pesos } from '../utils/format.js';
import Alert from '../components/ui/Alert.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Field from '../components/ui/Field.jsx';
import Icon from '../components/ui/Icon.jsx';
import OrderSummary from '../components/cart/OrderSummary.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import StickyActionBar from '../components/layout/StickyActionBar.jsx';

export default function Checkout() {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, loading, refresh, offlineSnapshot } = useCart();
  const { online } = useNetworkStatus();
  const { notify } = useToast();

  const [slots, setSlots] = useState([]);
  const [slotsError, setSlotsError] = useState('');
  const [form, setForm] = useState({
    method: 'pickup',
    pickupSlotId: '',
    name: user?.name || '',
    phone: '',
    address: '',
    couponCode: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  // One idempotency key per checkout attempt. The submit button is disabled
  // while in flight, so a double tap never creates two orders.
  const idempotencyKey = useRef(createIdempotencyKey());

  useEffect(() => {
    const controller = new AbortController();
    catalogApi
      .pickupSlots({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setSlots(data);
      })
      .catch((caught) => {
        if (caught.name === 'AbortError') return;
        setSlotsError('Pickup slots could not be loaded. Delivery is still available.');
      });
    return () => controller.abort();
  }, []);

  // Re-sync the cart when the screen opens so stock mistakes surface early.
  useEffect(() => {
    if (online) refresh({ silent: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setServerError('');
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (busy) return;
    if (!online) {
      setServerError('You are offline. Reconnect to place and pay for your order.');
      return;
    }

    const nextErrors = validateCheckout(form);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      setServerError('');
      notify('Please fix the highlighted fields.', { tone: 'error' });
      return;
    }

    setBusy(true);
    setServerError('');

    try {
      const payload = {
        method: form.method,
        ...(form.couponCode.trim() ? { couponCode: form.couponCode.trim().toUpperCase() } : {}),
        shipping: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.method === 'delivery' ? form.address.trim() : 'Campus pickup',
        },
        ...(form.method === 'pickup' ? { pickupSlotId: form.pickupSlotId } : {}),
      };

      const data = await checkoutApi.place(payload, {
        token: getToken(),
        idempotencyKey: idempotencyKey.current,
      });

      if (!data?.checkoutUrl) throw new Error('The payment session did not return a checkout URL.');
      // Hosted gateway page (PayMongo test mode). Totals are server-computed.
      window.location.assign(data.checkoutUrl);
    } catch (caught) {
      const fields = fieldErrors(caught);
      if (Object.keys(fields).length > 0) setErrors((previous) => ({ ...previous, ...fields }));
      setServerError(describeError(caught));
      setBusy(false);

      if (['OUT_OF_STOCK', 'OUT_OF_STOCK_CONFLICT', 'PRODUCT_UNAVAILABLE'].includes(caught.code)) {
        refresh({ silent: true }).catch(() => {});
      }
    }
  }

  if (!loading && cart.items.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Checkout" backTo="/cart" backLabel="Back to cart" />
        <EmptyState
          title="Nothing to check out"
          description="Your cart is empty. Add a book before placing an order."
          actionLabel="Browse the catalog"
          actionTo="/products"
        />
      </div>
    );
  }

  return (
    <div className="page page--with-action-bar">
      <PageHeader title="Checkout" subtitle="Confirm delivery and payment" backTo="/cart" backLabel="Back to cart" />

      {(!online || offlineSnapshot) && (
        <Alert kind="info">
          Checkout requires a live connection. Your cart is saved and will be ready when you reconnect.
        </Alert>
      )}

      <form className="checkout-form stack" onSubmit={placeOrder} noValidate>
        <section className="form-section" aria-labelledby="fulfilment-heading">
          <h2 id="fulfilment-heading">Fulfilment</h2>
          <div className="choice-grid" role="radiogroup" aria-label="Fulfilment method">
            <label className={`choice-card ${form.method === 'pickup' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="method"
                value="pickup"
                checked={form.method === 'pickup'}
                onChange={() => update('method', 'pickup')}
              />
              <Icon name="store" size={20} />
              <span>
                <strong>Campus pickup</strong>
                <small>Free · choose a slot</small>
              </span>
            </label>
            <label className={`choice-card ${form.method === 'delivery' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="method"
                value="delivery"
                checked={form.method === 'delivery'}
                onChange={() => update('method', 'delivery')}
              />
              <Icon name="truck" size={20} />
              <span>
                <strong>Home delivery</strong>
                <small>Shipping fee applies</small>
              </span>
            </label>
          </div>

          {form.method === 'pickup' ? (
            <Field
              label="Campus pickup slot"
              required
              error={errors.pickupSlotId}
              hint={slotsError || 'Pickup slots are capacity-limited and confirmed by the server.'}
            >
              {(aria) => (
                <select
                  {...aria}
                  value={form.pickupSlotId}
                  onChange={(event) => update('pickupSlotId', event.target.value)}
                >
                  <option value="">Choose a slot…</option>
                  {slots.map((slot) => (
                    <option key={slot._id} value={slot._id} disabled={slot.remaining < 1}>
                      {slot.date} · {slot.timeWindow} ({slot.remaining} left)
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : (
            <Field
              label="Delivery address"
              required
              error={errors.address}
              hint="Street, barangay, city and landmark."
            >
              {(aria) => (
                <textarea
                  {...aria}
                  rows={3}
                  value={form.address}
                  onChange={(event) => update('address', event.target.value)}
                  placeholder="123 Mabini St., Brgy. Poblacion, Batangas City"
                  maxLength={300}
                  autoComplete="street-address"
                />
              )}
            </Field>
          )}
        </section>

        <section className="form-section" aria-labelledby="contact-heading">
          <h2 id="contact-heading">Contact</h2>
          <Field label="Contact name" required error={errors.name}>
            {(aria) => (
              <input
                {...aria}
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                autoComplete="name"
                maxLength={120}
              />
            )}
          </Field>
          <Field label="Mobile number" required error={errors.phone} hint="Format: 09171234567">
            {(aria) => (
              <input
                {...aria}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="09171234567"
                autoComplete="tel"
                maxLength={15}
              />
            )}
          </Field>
        </section>

        <section className="form-section" aria-labelledby="coupon-heading">
          <h2 id="coupon-heading">Coupon</h2>
          <Field
            label="Coupon code (optional)"
            error={errors.couponCode}
            hint="The server validates expiry, minimum spend and usage limits when the order is placed."
          >
            {(aria) => (
              <input
                {...aria}
                value={form.couponCode}
                onChange={(event) => update('couponCode', event.target.value.toUpperCase())}
                placeholder="WELCOME10"
                maxLength={30}
                autoCapitalize="characters"
              />
            )}
          </Field>
          {user?.student?.status === 'verified' && (
            <p className="inline-note inline-note--success">
              <Icon name="check" size={15} /> Verified student discount will be applied automatically.
            </p>
          )}
          {user?.student?.status === 'pending' && (
            <p className="inline-note">
              <Icon name="clock" size={15} /> Student verification is pending. The discount applies once approved.
            </p>
          )}
        </section>

        {serverError && <Alert kind="error">{serverError}</Alert>}

        <OrderSummary itemCount={cart.itemCount} subtotalCents={cart.subtotalCents}>
          <p className="summary-note">
            <Icon name="lock" size={15} /> Final price, discounts and shipping are computed by the server. You will be
            redirected to the secure payment page.
          </p>
        </OrderSummary>

        <p className="muted checkout-terms">
          By placing the order you agree to the campus bookstore pickup and refund policy. Test-mode payments do not
          charge real money.
        </p>

        <StickyActionBar label="Place order">
          <div className="sticky-action-bar__totals">
            <span className="muted">Subtotal</span>
            <strong>{pesos(cart.subtotalCents)}</strong>
          </div>
          <button
            type="submit"
            className="btn btn--primary sticky-action-bar__main"
            disabled={busy || !online}
            aria-busy={busy}
          >
            {busy ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Icon name="lock" size={17} />}
            {!online ? 'Offline' : busy ? 'Placing order…' : 'Place order & pay'}
          </button>
        </StickyActionBar>
      </form>

      <p className="muted checkout-edit">
        Need to change quantities? <Link to="/cart">Return to cart</Link>
      </p>
    </div>
  );
}
