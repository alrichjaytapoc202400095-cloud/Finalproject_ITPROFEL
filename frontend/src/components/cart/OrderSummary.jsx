import { pesos } from '../../utils/format.js';

function Row({ label, value, strong = false, negative = false }) {
  return (
    <div className={`summary-row${strong ? ' summary-row--strong' : ''}`}>
      <span>{label}</span>
      <span>
        {negative ? '−' : ''}
        {value}
      </span>
    </div>
  );
}

// All values come from the server response; the client only formats them.
export default function OrderSummary({
  itemCount,
  subtotalCents,
  studentDiscountCents = 0,
  discountCents = 0,
  couponCode,
  shippingFeeCents,
  totalCents,
  showTotals = false,
  children,
}) {
  return (
    <section className="order-summary" aria-label="Order summary">
      <h2>Order summary</h2>
      <Row label={`Items (${itemCount || 0})`} value={pesos(subtotalCents)} />
      {studentDiscountCents > 0 && (
        <Row label="Student discount" value={pesos(studentDiscountCents)} negative />
      )}
      {discountCents > 0 && (
        <Row label={`Coupon${couponCode ? ` ${couponCode}` : ''}`} value={pesos(discountCents)} negative />
      )}
      {showTotals && shippingFeeCents !== undefined && (
        <Row
          label="Shipping"
          value={shippingFeeCents === 0 ? 'Free (pickup)' : pesos(shippingFeeCents)}
        />
      )}
      {showTotals && (
        <Row label="Total" value={pesos(totalCents)} strong />
      )}
      {!showTotals && <Row label="Subtotal" value={pesos(subtotalCents)} strong />}
      {children}
    </section>
  );
}
