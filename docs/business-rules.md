# SPC Book Store — Business Rules

Every rule is enforced **on the server**. Each rule lists the endpoint that
enforces it and the exact error returned when violated.

## Catalog and cart

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R1 | Inactive products are hidden from customers and cannot be bought | `productService.listPublic/getPublic`, `cartService.addItem`, `checkoutService.resolveLines` | 404 `PRODUCT_NOT_FOUND` |
| R2 | Pre-order items cannot be purchased before `releaseDate` | `cartService.assertPurchasable` | 422 `PREORDER_NOT_RELEASED` |
| R3 | Cart quantities cannot exceed available stock | `cartService.addItem/updateItem` | 409 `OUT_OF_STOCK` |
| R4 | Cart and line totals are computed by the server, never accepted from the client | `cartService.getCart`, `pricingService.compute` | (client values ignored) |

## Pricing and money

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R5 | All money is integer centavos; rounding = round-to-nearest on percentage math | `utils/money.js`, models | 422 `VALIDATION_ERROR` (non-integer money) |
| R6 | Checkout recomputes subtotal, discounts, shipping and total from database records; client-sent prices/totals are ignored | `checkoutService.placeOrder` → `pricingService.compute` | (tampered values ignored — tested) |
| R7 | Shipping fee is a flat fee for delivery; **campus pickup has no shipping fee** | `pricingService.compute` | — |
| R8 | **Verified students** get an automatic `STUDENT_DISCOUNT_PERCENT` (default 5%) discount | `pricingService.compute` (needs `user.student.status === 'verified'`) | — (Level 3 feature 1) |

## Coupons (L2-01)

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R9 | Coupon must exist and be active | `couponService.validateAndCompute` | 422 `COUPON_INVALID` |
| R10 | Coupon must not be expired | same | 422 `COUPON_EXPIRED` |
| R11 | Subtotal (after student discount) must reach `minSpendCents` | same | 422 `COUPON_MIN_SPEND` |
| R12 | Total usage limit must not be exceeded | same | 422 `COUPON_EXHAUSTED` |
| R13 | Per-customer limit enforced via redemption records | same | 422 `COUPON_PER_USER_LIMIT` |
| R14 | Coupon discount applies to the amount AFTER the student discount | `pricingService.compute` | — |

## Stock and reservations (L2-03)

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R15 | Stock is decremented atomically only if `stock >= qty` | `inventoryService.reserveFor` | 409 `OUT_OF_STOCK` |
| R16 | Failed checkouts roll back reserved stock and never leak it | `reserveFor` catch + `checkoutService` rollback | — |
| R17 | Failed/cancelled/expired payments release reserved stock exactly once | `inventoryService.releaseFor` (guard: `order.stockReleased`) | — |
| R18 | Stock can never go below zero via admin adjustments | `productService.adjustStock` | 422 `STOCK_NEGATIVE` |
| R19 | Every stock change records previous value, new value, reason, actor, timestamp | `productService.adjustStock` → `StockMovement` | — |

## Campus pickup slots (Level 3 feature 2)

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R20 | Pickup orders must claim an active future slot | `checkoutService.placeOrder` | 422 `PICKUP_SLOT_REQUIRED`, 404 `SLOT_NOT_FOUND` |
| R21 | A slot can never exceed its capacity (atomic `$expr` update) | `pickupService.book` | 409 `PICKUP_SLOT_FULL` |
| R22 | Cancelling/expiring a pickup order releases the slot | `inventoryService.releaseFor` → `pickupService.release` | — |

## Order lifecycle (L2-04)

State machine — `orderService.TRANSITIONS`, enforced with 409:

```
pending_payment → paid | cancelled | expired
paid            → processing
processing      → shipped
shipped         → delivered
delivered / cancelled / expired → (terminal)
```

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R23 | Only the transitions above are allowed | `orderService.transition` | 409 `INVALID_STATUS_TRANSITION` |
| R24 | Every transition is recorded with actor + timestamp | `transition` → `OrderStatusHistory` + Observer | — |
| R25 | Customers may cancel only unpaid orders | `orderService.cancelByCustomer` | 409 `INVALID_STATUS_TRANSITION` |
| R26 | Customers see only their own orders | `orderService.getForCustomer` | 404 `ORDER_NOT_FOUND` |
| R27 | Unpaid orders expire after `ORDER_EXPIRY_MINUTES` and release stock | `paymentService.expireStaleOrders` (sweeper) | — |

## Payments and webhooks (L2-05..L2-09)

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R28 | Webhook signature must verify against the RAW body | `paymentService.handleWebhook` | 401 `INVALID_WEBHOOK_SIGNATURE` |
| R29 | Webhook events are stored with unique event id; replays are no-ops | `WebhookEvent` unique index | (returns `duplicate: true`) |
| R30 | An order is marked paid only after the gateway confirms status=**paid**, amount == `totalCents`, currency == PHP | `paymentService.verifyAndMarkPaid` | mismatch → order **flagged**, not paid |
| R31 | Amount mismatches are visible to the administrator | `order.payment.amountMismatch/mismatchNote`, admin orders table | — |
| R32 | Repeated checkout clicks with the same `Idempotency-Key` return the same order | `checkoutService.placeOrder` + unique index | — |
| R33 | The success redirect never marks an order paid by itself | return page only calls `GET /payments/status/:orderId` (R30 applies) | — |

## Access control (L1-02)

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R34 | Every `/admin/*` endpoint requires the admin role (server-side) | `middleware/auth.js` + `requireRole('admin')` | 401 `UNAUTHENTICATED` / 403 `FORBIDDEN` |
| R35 | The first registered account becomes the administrator (bootstrap); later registrations are customers | `authService.register` | — |
| R36 | Verified-student status is granted only by an admin | `adminService.setStudentVerification` | 403 for customers |

## AI assistant (Level 4)

| # | Rule | Enforced by | Violation error |
|---|---|---|---|
| R37 | Questions are 3–500 chars; 10 requests / 15 min per IP | validate + `middleware/rateLimits.ai` | 422 / 429 `RATE_LIMITED` |
| R38 | Recommended product ids must exist in the retrieved candidates; unknown ids discarded | `aiService.ask` | fallback to keyword search |
| R39 | Names, prices and stock are rendered from the database, never from model text | `aiService.ask` (products re-fetched by id) | — |
| R40 | AI outage/invalid output → controlled keyword fallback, never a 500 | `aiService.ask` catch | 200 `source: 'fallback'` |
