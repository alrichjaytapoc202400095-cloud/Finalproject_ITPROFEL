# SPC Book Store — Payment Integration (PayMongo / Maya Test Mode)

## Configuration

1. Create a PayMongo account → **Developers → API keys** → copy the **Test mode
   secret key** (`sk_test_...`).
2. Put it in `backend/.env` (never in Git):
   `PAYMONGO_SECRET_KEY=sk_test_...`
3. Create a **webhook** in the dashboard pointing to
   `https://<your-api-domain>/api/v1/payments/webhook` with events
   `checkout_session.payment.paid`, `payment.failed`, `payment.expired`
   → copy `whsec_...` into `PAYMONGO_WEBHOOK_SECRET`.
4. Set `FRONTEND_URL` so success/cancel redirects point at the storefront.

The frontend holds **no** keys (L1-08). The secret key is used only inside
`src/patterns/providers/PayMongoProvider.js`.

## Switching to Maya Checkout (sandbox)

`PAYMENT_PROVIDER=maya` selects `src/patterns/providers/MayaProvider.js` through the
Factory Method — nothing else changes.

1. In `backend/.env`:
   ```env
   PAYMENT_PROVIDER=maya
   MAYA_PUBLIC_KEY=pk-...          # public key: create checkout
   MAYA_SECRET_KEY=sk-...          # secret key: read/verify status
   MAYA_BASE_URL=https://pg-sandbox.paymaya.com
   ```
   The repo's `.env` ships with Maya's published **shared sandbox keys** for quick trials;
   replace them with your own for formal testing.
2. Restart the API (`.env` is read once at boot).
3. Create uses `POST /checkout/v1/checkouts` (public key). Verification/reconciliation
   uses `GET /checkout/v1/checkouts/:checkoutId` (secret key). Maya amounts are decimal
   pesos at the boundary; the rest of the app stays in integer centavos.
4. Register an **HTTPS (port 443)** webhook in Maya Manager for `PAYMENT_SUCCESS`,
   `PAYMENT_FAILED`, `PAYMENT_EXPIRED` and `PAYMENT_CANCELLED`. Maya signs webhooks with
   RSA-SHA256 (`X-Maya-Webhook-Signature` + `X-Maya-Webhook-Timestamp`); the published
   sandbox keys are built in, and `MAYA_WEBHOOK_PUBLIC_KEYS` (pipe-separated PEM) can
   override them after a key rotation. Missing/expired signatures return
   `401 INVALID_WEBHOOK_SIGNATURE`.

## Checkout flow

1. `POST /api/v1/checkout` (with `Idempotency-Key` header) →
   `checkoutService.placeOrder()`:
   validates items → computes totals server-side → creates the order
   (`pending_payment`) → reserves stock atomically → books the pickup slot (if
   pickup) → calls `paymentProvider.createCheckoutSession(order)`.
2. PayMongo Provider: `POST /v1/checkout_sessions` with Basic auth
   (`base64(sk:)`), line items in centavos, `success_url`, `cancel_url`,
   `reference_number = orderNumber`.
3. The API stores `payment.sessionId` / `checkoutUrl` / `reference` and returns
   the hosted checkout URL. The React app redirects (`window.location.assign`).
4. The customer pays with GCash / Maya / test card on PayMongo's hosted page.

## Webhook processing (the only path that marks orders paid)

`POST /api/v1/payments/webhook` (mounted **before** `express.json` so the raw
body survives):

1. **Signature verification** — `Paymongo-Signature: t=<unix>,test=<hmac>` —
   HMAC-SHA256 over `t + '.' + rawBody` using the webhook secret, with a
   ±5-minute timestamp tolerance and timing-safe comparison. Fail → **401**
   `INVALID_WEBHOOK_SIGNATURE`, order untouched (S-07).
2. **Idempotency** — the event id is inserted into `webhookevents`
   (unique index). A replay returns `{ received: true, duplicate: true }` and
   changes nothing (L2-05).
3. **Verification with the gateway** — for `*.paid` events the backend calls
   `GET /v1/checkout_sessions/:id` and confirms `status === 'paid'`,
   amount == `order.totalCents`, currency == `PHP`. Any mismatch sets
   `payment.amountMismatch` + a note and the order is **not** marked paid (S-08,
   L2-09); admins see the flag in the orders table.
4. **Transition** — `pending_payment → paid` through the state machine, status
   history written, Observer notifications created, reservations consumed.
5. `*.failed / *.cancelled` → stock released, order stays retryable;
   `*.expired` → order → `expired` + stock released (L2-07).

## Missed-webhook reconciliation (L2-06)

- **Retrieve-on-return:** the success page sends the customer to
  `GET /api/v1/payments/status/:orderId`, which runs the same gateway
  verification and can mark the order paid.
- **Admin reconcile:** `POST /api/v1/admin/orders/:id/reconcile` does the same
  on demand (button "Verify with gateway" in the admin orders table).
- **Expiry sweep:** unpaid orders older than `ORDER_EXPIRY_MINUTES` become
  `expired` and release reserved stock (sweeper runs at boot + every 5 min).
- **Retry:** `POST /api/v1/orders/:id/pay` creates a fresh session for a
  pending order.

## Replay / negative tests (evidence)

- Invalid signature → 401, order unchanged — `tests/api.test.js`
  ("an invalid webhook signature returns 401...").
- Valid webhook replay → `duplicate: true`, exactly one `paid` transition —
  `tests/api.test.js` ("a valid webhook marks the order paid; replaying it does
  not duplicate anything").
- Missed webhook → recovered by the status endpoint — same file.

## Local development with webhooks

```bash
ngrok http 5000
# register https://<ngrok-domain>/api/v1/payments/webhook in the PayMongo dashboard
# update the domain whenever the tunnel changes
```

## Recording checklist for the defense

- [ ] Create a checkout from the storefront, pay in the hosted page.
- [ ] Show the webhook arriving in the server log (request + event id).
- [ ] Replay the webhook (curl) → `duplicate: true`, order unchanged.
- [ ] Send a bad-signature webhook → 401.
- [ ] Show a paid order's status history in the admin orders table.
