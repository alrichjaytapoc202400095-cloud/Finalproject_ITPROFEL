# SPC Book Store — Individual Contribution Statement (D-13)

> Fill in the member names, adjust the module ownership to match your real
> Git history, and sign. Claims must match the repository history (T-28);
> keep commits small and attributable while you work.

## Member 1 — Name: ____________________ (Section/Group: ______)

- **Modules:** Authentication & roles (`authService`, `middleware/auth.js`,
  `middleware/roles.js`), admin dashboard + student verification queue
  (`adminService`, admin Students tab).
- **Endpoints:** `/auth/*`, `/admin/dashboard`, `/admin/students*`.
- **Patterns/OOP:** MVC layering enforcement; role middleware (Decorator-style).
- **Tests:** cases 1–3 (auth/roles) in `tests/api.test.js`.
- **Docs:** README setup section, `docs/business-rules.md` access-control rules.
- Signature: ____________________ Date: ________

## Member 2 — Name: ____________________

- **Modules:** Catalog & cart (`productService`, `cartService`, admin product
  management, stock movements).
- **Endpoints:** `/products*`, `/categories`, `/cart*`, `/admin/products*`.
- **Patterns/OOP:** encapsulation of cart totals; audited stock adjustments.
- **Tests:** case 5 (stock conflict), pre-order rule checks.
- **Docs:** `docs/database.md` (ERD + collections).
- Signature: ____________________ Date: ________

## Member 3 — Name: ____________________

- **Modules:** Checkout, pricing, coupons, order lifecycle
  (`checkoutService`, `pricingService`, `couponService`, `orderService`).
- **Endpoints:** `/checkout`, `/orders*`.
- **Patterns/OOP:** Strategy (discount strategies), Observer wiring, state
  machine (`orderService.transition`).
- **Tests:** cases 4, 6, 7, 11 (pricing, coupon, idempotency, cancel).
- **Docs:** `docs/design-patterns-oop.md`, `docs/business-rules.md`.
- Signature: ____________________ Date: ________

## Member 4 — Name: ____________________

- **Modules:** Payments & webhooks (`paymentService`, providers, factory),
  AI assistant (`aiService`, GeminiClient, AIProxy).
- **Endpoints:** `/payments/*`, `/ai/assistant`, `/admin/orders/:id/reconcile`.
- **Patterns/OOP:** abstract `PaymentProvider` + subclasses, Factory Method,
  Façade, Proxy; pickup slots feature.
- **Tests:** cases 8–10, 12 (webhook signature, replay, reconciliation, AI
  fallback).
- **Docs:** `docs/payment-integration.md`, `docs/ai-integration.md`,
  `docs/architecture.md`.
- Signature: ____________________ Date: ________

---

**Group statement.** We confirm each member contributed code, tests and
documentation as listed, that all commits are attributable in the repository
history, and that no secret, password or token was committed.
