# SPC Book Store — Database Design

MongoDB + Mongoose. All money is stored as **integer centavos** (never floating
point): `PHP 450.00 = 45000`.

## ERD (D-03)

```mermaid
erDiagram
    USER ||--o| CART : "owns"
    USER ||--o{ ORDER : "places"
    USER ||--o{ NOTIFICATION : "receives"
    CATEGORY ||--o{ PRODUCT : "groups"
    PRODUCT ||--o{ ORDER_ITEM : "snapshotted into"
    ORDER ||--|| PAYMENT : "has"
    ORDER ||--o{ ORDER_STATUS_HISTORY : "records"
    ORDER ||--o{ RESERVATION : "reserves"
    PRODUCT ||--o{ RESERVATION : "reserved by"
    PRODUCT ||--o{ STOCK_MOVEMENT : "audited"
    COUPON ||--o{ COUPON_REDEMPTION : "redeemed"
    ORDER ||--o{ COUPON_REDEMPTION : "used"
    PICKUP_SLOT ||--o{ ORDER : "hosts"
    WEBHOOK_EVENT }o--|| PROVIDER : "from"
    USER {
        string name
        string email UK
        string passwordHash "bcrypt, never plain text"
        string role "customer|admin"
        object student "number, course, year, status"
    }
    CATEGORY {
        string name UK
        string description
    }
    PRODUCT {
        string title
        string author
        string description
        int priceCents "min 0, integer"
        objectId category FK
        int stock "min 0, integer"
        string courseCode "indexed"
        bool isPreOrder
        date releaseDate
        bool isActive "soft delete"
    }
    CART {
        objectId user UK
        array items "product ref + qty"
    }
    COUPON {
        string code UK
        string type "percentage|fixed"
        int value
        int minSpendCents
        date expiresAt
        int usageLimit
        int usedCount
        int perCustomerLimit
        bool active
    }
    ORDER {
        string orderNumber UK
        objectId user FK
        array items "snapshot: title, author, priceCents, qty"
        string method "pickup|delivery"
        objectId pickupSlot FK
        object shipping
        int subtotalCents
        int studentDiscountCents
        int discountCents
        int shippingFeeCents
        int totalCents
        string currency "PHP"
        object coupon
        string status "state machine"
        object payment "provider, sessionId UK, reference"
        bool stockReleased
        string idempotencyKey "unique sparse"
    }
    ORDER_STATUS_HISTORY {
        objectId order FK
        string from
        string to
        string actor
        string note
        date at
    }
    STOCK_MOVEMENT {
        objectId product FK
        int previousStock
        int newStock
        int delta
        string reason
        objectId actor FK
        date at
    }
    RESERVATION {
        objectId order FK
        objectId product FK
        int qty
        date expiresAt
        bool released
    }
    PICKUP_SLOT {
        string date "YYYY-MM-DD"
        string timeWindow
        int capacity
        int booked
        bool isActive
    }
    WEBHOOK_EVENT {
        string provider
        string eventId "unique with provider"
        string type
        string status
    }
    NOTIFICATION {
        objectId user FK
        string type
        string message
        bool read
    }
    COUPON_REDEMPTION {
        objectId coupon FK
        objectId user FK
        objectId order FK
    }
```

## Collections, constraints and indexes

| Collection | Key constraints / indexes |
|---|---|
| `users` | `email` **unique**; `role` index; `passwordHash` bcrypt only |
| `categories` | `name` unique |
| `products` | `category`, `isActive`, `courseCode` indexes; money fields integer ≥ 0 |
| `carts` | `user` unique (one cart per customer) |
| `coupons` | `code` unique |
| `couponredemptions` | unique `(coupon, order)`; `(coupon, user)` for per-customer limit |
| `orders` | `orderNumber` unique; `idempotencyKey` **unique sparse**; `payment.sessionId` **unique sparse**; `(user, createdAt)` index; status enum |
| `orderstatushistories` | `(order, at)` index — full audit of transitions |
| `stockmovements` | `(product, at)` index — previous/new value, delta, reason, actor |
| `reservations` | `order` index, `released` flag, `expiresAt` |
| `pickupslots` | unique `(date, timeWindow)` |
| `webhookevents` | unique `(provider, eventId)` — idempotent webhook storage |
| `notifications` | `(user, createdAt)` index |

## Integrity decisions

- **Money:** integers (centavos) only; Mongoose validators enforce `Number.isInteger`, `min: 0`.
- **Order items are snapshots** (`title`, `author`, `priceCents` copied): product edits never corrupt order history; deleting a product in an order is a *soft delete* (`isActive=false`), so no orphan items.
- **Stock integrity:** reservation uses a conditional `findOneAndUpdate({_id, stock: {$gte: qty}}, {$inc: {stock: -qty}})` — atomic, no overselling; failed checkouts roll back; `stockReleased` on the order guarantees release runs exactly once.
- **Webhook idempotency:** unique `(provider, eventId)` makes replays no-ops at the database level.
- **Status integrity:** status changes only through `OrderService.transition`, which validates the state machine and writes history.

## Seed and reset (T-09, L1-13)

```bash
cd backend
npm run seed         # upsert: 5 categories, 26 products, 3 coupons, 10 pickup slots,
                     # admin + 2 customers (re-running creates no duplicates)
npm run seed:reset   # wipe this database, then seed
```

The commands only touch the database named in `MONGO_DB_NAME`. Seed data
includes one deliberately expired coupon (`EXPIRED5`) and one pre-order product
for negative tests.
