# SPC Book Store — System Architecture

Campus bookstore concept (St. Peter's College, Iligan City): verified-student
discounts, campus pickup slots, course-coded book lists, and pre-orders.

## 1. Context diagram (T-21)

```mermaid
flowchart TB
    subgraph CLIENT["Untrusted client side"]
        B["Customer / Admin browser"]
        R["React app (Vercel)<br/>storefront + admin UI"]
    end

    subgraph TRUSTED["Trusted backend (Render)"]
        E["Express API /api/v1<br/>routes → controllers → services → models"]
        D[("MongoDB Atlas<br/>catalog, users, carts, orders,<br/>coupons, reservations, events")]
    end

    P["PayMongo (TEST mode)<br/>hosted checkout + signed webhooks"]
    A["Google Gemini API<br/>product discovery"]

    B -->|"HTTPS"| R
    R -->|"HTTPS + JSON + Bearer JWT"| E
    E --> D
    E -->|"create checkout session<br/>(secret key stays here)"| P
    P -->|"signed webhook (HTTPS)"| E
    E -->|"prompt + candidate products"| A
    A -->|"validated JSON"| E
```

**Trusted vs untrusted.** The browser and the React app are untrusted: they can
send anything. Business rules (pricing, coupons, stock, roles, payment
verification) live only in the Express API, which is the only component that
talks to the database, the gateway secret key and the Gemini API key.

## 2. Layered architecture (T-01)

```
Request
  → routes/index.js          Express router + validation + role middleware
  → controllers/*.js         thin: call service, format envelope
  → services/*.js            business rules (pricing, checkout, orders, AI...)
  → models/*.js              Mongoose schemas / persistence
  → patterns/*.js            factories, providers, strategies, observers, proxy
Response
```

A live trace of `GET /api/v1/products`:
`routes/index.js` → `wrap(productController.list)` →
`productService.listPublic()` → `Product.find(...)` → response envelope.

## 3. Checkout sequence, including the missed-webhook path (T-22)

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer (React)
    participant API as Express API
    participant DB as MongoDB
    participant GW as PayMongo (test)
    participant WH as Webhook endpoint

    C->>API: POST /checkout (Idempotency-Key)
    API->>DB: load products (authoritative prices)
    API->>DB: validate coupon, compute totals (server-side)
    API->>DB: create order (pending_payment) + reserve stock atomically
    API->>GW: POST /checkout_sessions (secret key in backend)
    GW-->>API: checkout session id + hosted URL
    API->>DB: store payment {sessionId, reference}
    API-->>C: 201 { order, checkoutUrl }
    C->>GW: open hosted page, pay (GCash/test card)
    GW->>WH: signed webhook "payment.paid"
    WH->>WH: verify HMAC-SHA256 over RAW body
    WH->>DB: store event id (unique → replay = no-op)
    WH->>GW: retrieve session (verify status, amount, currency)
    WH->>DB: order pending_payment → paid + status history
    WH-->>GW: 200

    rect rgb(255, 240, 235)
    Note over C,DB: Missed-webhook path
    C->>API: GET /payments/status/:orderId (success page)
    API->>GW: retrieve session status/amount/currency
    API->>DB: mark paid if verified (same checks)
    end

    Note over API,DB: If never paid within ORDER_EXPIRY_MINUTES → status "expired", stock released
```

## 4. Class / module model (T-23)

```mermaid
classDiagram
    class PaymentProvider {
        <<abstract>>
        +createCheckoutSession(order)*
        +retrievePayment(reference)*
        +verifyWebhookSignature(rawBody, header)*
    }
    PaymentProvider <|-- PayMongoProvider
    PaymentProvider <|-- MayaProvider
    class PaymentProviderFactory {
        +create(name)$ PaymentProvider
    }
    class CheckoutService {
        -pricingService
        -inventoryService
        -pickupService
        -couponService
        -cartService
        -paymentProvider
        +placeOrder(user, body, idempotencyKey)
        +retryPayment(user, orderId)
    }
    class DiscountStrategy {
        <<abstract>>
        +apply(amountCents)*
    }
    DiscountStrategy <|-- PercentageDiscountStrategy
    DiscountStrategy <|-- FixedDiscountStrategy
    class AIProxy {
        -real: GeminiClient
        -cache
        +ask(payload)
    }
    AIProxy o-- GeminiClient
    CheckoutService o-- PaymentProvider
    CheckoutService o-- PricingService
    CheckoutService o-- InventoryService
    CheckoutService o-- PickupService
    CheckoutService o-- CouponService
    CouponService --> DiscountStrategy : selects at runtime
    OrderService --> OrderEventBus : emits events
    OrderEventBus --> NotificationSubscriber : reacts
```

## 5. Deployment topology

- **Frontend:** Vercel (React + Vite) — set `VITE_API_URL` to the API URL.
- **API:** Render (Node web service) — root `backend/`, start `npm start`.
- **Database:** MongoDB Atlas — network access limited to the API host.
- **Webhook:** register `https://<api-domain>/api/v1/payments/webhook` in the
  PayMongo dashboard; for local development use ngrok and re-register.
- Free tiers sleep: wake the API before the defense and keep a backup recording.
