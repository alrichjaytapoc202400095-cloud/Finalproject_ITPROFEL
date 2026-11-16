# SPC Book Store — Code Review Record (D-12)

Each member opens at least one pull request that another member reviews
(T-26). The three substantive findings below were actually made during
development and the fixes are in the code.

## Finding 1 — Rollback bug in inventory reservation (correctness)

- **Where:** `backend/src/services/inventoryService.js`
- **Before:** the first draft pushed updated product docs into a `reserved`
  array for rollback, but the rollback loop read `doc.__qty`, a field that never
  existed — a partial failure between two line reservations would have
  **restored zero stock** while the order was deleted, silently leaking stock.
- **After:** rollback now tracks `{ productId, qty }` pairs and increments each
  product back exactly what was taken. `tests/api.test.js` covers the concurrent
  last-unit case (one 201 / one 409) and would fail if stock leaked.
- **Effect:** prevents a real inventory corruption bug; teaches the group to
  test rollback paths, not only success paths.

## Finding 2 — Order `payment` subdocument crashed order creation (validation)

- **Where:** `backend/src/models/Order.js`
- **Before:** `payment.provider` was `required` inside the subdocument, but
  orders are created **before** a payment session exists — every checkout
  failed with an opaque Mongoose `ValidationError` on `payment.provider`.
- **After:** provider is optional with an empty default; it is set only when
  the gateway session is created. Found while running the integration suite
  (checkout returned 422 with `payment.provider` details).
- **Effect:** checkout works; the model now matches the real lifecycle of an
  order (created first, paid later).

## Finding 3 — Cart totals computed on the client (security / L1-05, L2-02)

- **Where:** `frontend/src/pages/CartPage.jsx`, `Checkout.jsx` + backend
  `cartService` / `pricingService`
- **Before:** an early cart page multiplied `price × qty` in React and posted a
  proposed total to checkout — the exact "client-side pricing" the rubric caps.
- **After:** the server owns the cart (`GET /cart` returns computed
  `subtotalCents`) and checkout **ignores every money field** the client sends.
  Test 4 (`L2-02 checkout ignores client-sent prices...`) proves tampered
  `priceCents` values are discarded and the DB price wins.
- **Effect:** server-side pricing enforced end to end; UI keeps rendering only
  server-computed numbers.

## Review checklist used for PRs

- [ ] Business rule in a service, never in a route or controller
- [ ] Write endpoints validated (422 with field details)
- [ ] Money math in integer centavos only
- [ ] Error paths handled (gateway down, invalid AI output, stock conflict)
- [ ] New endpoint added to `openapi.yaml` + Postman collection
- [ ] Secrets never printed or committed

## Refactoring note (T-27)

**Responsibility moved: coupon math out of `PricingService`.**
- **Before:** percentage/fixed discount logic lived inside `pricingService.compute`
  as `if/else` branches (duplicated rounding rules, hard to extend).
- **After:** Strategy pattern — `patterns/strategies/DiscountStrategy.js` with
  `PercentageDiscountStrategy` / `FixedDiscountStrategy` selected at runtime by
  `strategies/select.js`; `pricingService` now only composes collaborators.
- **After tests:** the full integration suite passes unchanged — behavior is
  identical, structure is cleaner (`docs/design-patterns-oop.md` § Strategy).
