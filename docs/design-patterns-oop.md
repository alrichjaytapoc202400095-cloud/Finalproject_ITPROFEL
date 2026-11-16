# SPC Book Store — Design Patterns & OOP

Eight patterns are implemented **in the live request path** (not just named).
For each one: the problem, the files, the collaborators and flow, the trade-off,
and one rejected alternative.

| Pattern | Type | Where in the live path |
|---|---|---|
| MVC | Architectural | every request |
| Singleton | Creational | every DB access |
| Factory Method | Creational | checkout + webhook |
| Façade | Structural | checkout + webhook |
| Proxy | Structural | AI assistant |
| Decorator | Structural | every route |
| Observer | Behavioral | every order transition |
| Strategy | Behavioral | every checkout with a coupon |

---

## 1. MVC (architectural, mandatory)

- **Problem.** Without separation, Express route handlers grow into
  god-functions that validate, query the database, and format responses —
  impossible to test or trace.
- **Files.** `src/routes/` (routers + middleware only), `src/controllers/`
  (call service, format envelope), `src/services/` (business rules),
  `src/models/` (Mongoose persistence). See `src/routes/index.js`,
  `src/controllers/checkoutController.js`, `src/services/checkoutService.js`,
  `src/models/Order.js`.
- **Flow.** `POST /checkout` → route validates body → controller calls
  `container.checkoutService.placeOrder()` → service uses models → controller
  wraps the result in `{ success: true, data }`.
- **Trade-off.** Easier: testing each layer, finding any rule ("where is
  pricing? → services/pricingService.js"). More complex: more files and a
  dependency-injection container (`services/container.js`).
- **Rejected alternative.** putting logic in route handlers (what the Week 11
  workshop templates do) — rejected because the rubric traces business rules to
  services and routes would become untestable.

## 2. Singleton (creational)

- **Problem.** Opening a MongoDB connection per request exhausts connections.
- **Files.** `src/config/db.js` — a module that caches one `mongoose.connect()`
  promise and exports `{ connect, disconnect }`; every service shares it.
  `server.js` calls `connect()` once.
- **Flow.** All models bind to the single default connection; the webhook
  handler and the sweeper use the same instance.
- **Trade-off.** Easier: one place to configure timeouts/dbName. More complex:
  tests must reset the cache between databases (`db.disconnect()` in tests).
- **Rejected alternative.** a global `mongoose` import everywhere — rejected:
  untestable, no controlled initialization, and the "global junk drawer" the
  rubric warns about.

## 3. Factory Method (creational)

- **Problem.** Checkout and webhook code must not know which gateway
  (`paymongo` or `maya`) is configured, and adding a third gateway must not
  touch the checkout flow.
- **Files.** `src/patterns/factories/PaymentProviderFactory.js` (map of concrete
  classes → instance), `src/patterns/providers/PayMongoProvider.js`,
  `src/patterns/providers/MayaProvider.js`.
- **Collaborators.** `services/container.js` calls `PaymentProviderFactory.create()`
  once; the resulting abstract-type instance is injected into `CheckoutService`
  and `PaymentService`, which only see `PaymentProvider`.
- **Flow.** `placeOrder()` → `paymentProvider.createCheckoutSession(order)` →
  the factory-selected concrete class performs the real HTTP call.
- **Trade-off.** Easier: swapping providers with one env var
  (`PAYMENT_PROVIDER=maya`); tests can mock fetch. More complex: two extra
  indirection files.
- **Rejected alternative.** an `if (provider === 'paymongo')` inside the
  checkout service — rejected because that couples checkout code to gateways and
  would need editing for every new provider.

## 4. Façade (structural)

- **Problem.** Processing a paid webhook touches signature verification, raw
  body parsing, event deduplication, gateway retrieval, amount/currency checks,
  state transitions and stock bookkeeping. Routes cannot contain that.
- **Files.** `src/services/paymentService.js` — `handleWebhook(rawBody, headers)`
  and `verifyAndMarkPaid(order)` are the façade methods;
  `src/controllers/paymentController.js` is a thin caller.
- **Flow.** Controller → **one** `handleWebhook()` call → everything else stays
  inside the façade.
- **Trade-off.** Easier: the webhook route is 3 lines and demo-safe; gateway
  details cannot leak into controllers. More complex: the façade is the most
  intricate file in the system (that complexity exists somewhere regardless).
- **Rejected alternative.** exposing gateway calls from controllers with helper
  utils — rejected: duplicate verification logic and no single "who calls what".

## 5. Proxy (structural)

- **Problem.** The AI endpoint must not pay for identical repeated calls, must
  bound input size, and must log usage — without the AI service knowing.
- **Files.** `src/patterns/proxy/AIProxy.js` (same `ask()` interface as the real
  client, adds 5-minute cache + logging + 500-char bound);
  `src/patterns/proxy/GeminiClient.js` (real Gemini REST call, 15 s timeout).
  Wired in `src/services/container.js`.
- **Flow.** `aiService.ask()` → `aiProxy.ask()` → cache hit returns instantly,
  otherwise the real client is called and the result cached.
- **Trade-off.** Easier: cost control and a demo-able "cache hit" log line.
  More complex: stale answers up to 5 minutes for an unchanged question.
- **Rejected alternative.** caching inside `aiService` — rejected: the service
  would mix retrieval logic with transport concerns; the proxy keeps the real
  client swappable.

## 6. Decorator (structural)

- **Problem.** Every route needs async error forwarding and request timing, and
  adding that inside each handler would duplicate code everywhere.
- **Files.** `src/patterns/decorator/wrap.js` — `wrap(handler)` adds try/catch →
  central error handler plus timing log, without editing the handler. The auth
  (`middleware/auth.js`), role (`middleware/roles.js`) and validation
  (`middleware/validate.js`) middlewares are the same idea: behavior wrapped
  around existing handlers.
- **Flow.** `router.post('/checkout', authenticate, validate(...), wrap(checkoutController.checkout))`.
- **Trade-off.** Easier: uniform error handling + one-line middleware stacks.
  More complex: behavior is less visible at the handler definition site.
- **Rejected alternative.** try/catch inside every controller — rejected as
  boilerplate that reviewers would flag as duplication.

## 7. Observer (behavioral)

- **Problem.** When an order changes status we must write status history, notify
  the customer, and possibly more later (email, SMS) — and adding a reaction
  must not modify the order service every time.
- **Files.** `src/patterns/observers/orderEventBus.js` (EventEmitter singleton),
  `src/patterns/observers/subscribers.js` (notification + audit listeners),
  emitted from `src/services/orderService.js` (`bus.emit('order.statusChanged')`)
  and `inventoryService.js` (`reservation.released`).
- **Flow.** `transition()` saves status + history, emits the event; two
  subscribers react (customer notification, logging). Nothing else changes.
- **Trade-off.** Easier: new side-effects = new listener, zero edits to the
  order flow. More complex: listener failures are asynchronous — they log
  instead of failing the request.
- **Rejected alternative.** calling notification code directly from
  `orderService` — rejected: every new feature would edit the core service
  (fragile, merge-conflict magnet).

## 8. Strategy (behavioral)

- **Problem.** Coupons can be percentage or fixed-amount; more types may come.
  Duplicating discount math with `if/else` in pricing invites rounding bugs.
- **Files.** `src/patterns/strategies/DiscountStrategy.js` (base + two concrete
  strategies), `src/patterns/strategies/select.js` (runtime selection),
  consumed by `src/services/couponService.js`.
- **Flow.** `validateAndCompute()` → `select(coupon)` → `strategy.apply(base)`
  → capped discount. Rounding: `Math.round(amount × percent / 100)`.
- **Trade-off.** Easier: a new coupon type = one new class. More complex: three
  small files instead of one function.
- **Rejected alternative.** a switch statement in `pricingService` — rejected:
  mixing pricing composition with discount algorithms couples two concepts that
  change for different reasons.

---

# OOP: abstract class, inheritance, composition, encapsulation

## Abstract base class (T-16)

`src/patterns/providers/PaymentProvider.js`:

- Cannot be instantiated directly — `new.target === PaymentProvider` throws.
- Three operations **must** be implemented by subclasses:
  `createCheckoutSession(order)`, `retrievePayment(reference)`,
  `verifyWebhookSignature(rawBody, header)`. If a subclass forgets one, calling
  it throws `createCheckoutSession() is not implemented by X`.

## Inheritance and polymorphism (T-17)

`PayMongoProvider` and `MayaProvider` extend `PaymentProvider` and are used
**only through the base type**: `CheckoutService` and `PaymentService` receive
`paymentProvider` and never check which concrete class they hold. Switching
`PAYMENT_PROVIDER=maya` changes runtime behavior with zero code changes — that
is polymorphism, selected by the factory.

## Composition (T-18)

`src/services/checkoutService.js` is constructed with collaborators
(`services/container.js`):

```js
new CheckoutService({ pricingService, inventoryService, pickupService,
                      couponService, cartService, paymentProvider })
```

It **has-a** pricing service, inventory service, pickup service, coupon
service, cart service and a payment provider — it inherits from nothing.
`AIProxy` also holds the real Gemini client (`has-a`), not `extends`.

## Encapsulation (T-19)

- Order `status` is mutated only inside `OrderService.transition()`; routes and
  controllers cannot set it. Every write passes the state-machine check.
- Cart totals and order totals are computed inside services; clients cannot
  inject money values (checkout ignores them).
- `AIProxy#cache` is a private module detail; `CouponService` hides redemption
  counting behind `redeem()`.

## Justified design (T-20)

**Why inheritance fits the provider hierarchy.** All payment providers share the
same contract and differ in HTTP details; the abstract class removes duplicated
signature/session logic and makes the swap invisible to callers. It is a stable
"is-a" relationship with one small hierarchy (no deep chains).

**Why composition everywhere else.** Services like checkout are behaviors built
from parts that change independently (pricing rules, inventory rules, gateways).
Inheriting from a "base checkout" would create a fragile base class: any change
to the base ripples to subclasses, and a deep hierarchy would be impossible to
trace during the defense. Composition also lets tests inject fakes
(`inventoryService`, mocked provider) — visible in `tests/api.test.js`.

**Risk we accept.** Provider subclasses could drift (PayMongo gets a fix Maya
misses); the base class contract and integration tests for the shared flow
(webhook signature rejection, amount verification) are the guardrail.
