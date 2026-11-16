# SPC Book Store — Test Plan and Results (D-11)

## How to run the automated suite

```bash
cd backend
npm test          # Jest + Supertest, integration tests over HTTP
```

The tests call the real Express app over HTTP. With `MONGO_URI` unset they use
an in-memory MongoDB, so they run on any machine; set `MONGO_URI_TEST` to run
against a dedicated test database instead. Each test cleans its collections, so
the suite is repeatable.

Last run (2026-11-12): **12 passed, 0 failed** (`PASS tests/api.test.js`).

## Automated cases (T-14/T-25)

| # | ID | Test | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | L1-01 | duplicate email registration | 409 `EMAIL_IN_USE` | 409 `EMAIL_IN_USE` | ✅ |
| 2 | L1-01 | wrong password login | 401 `INVALID_CREDENTIALS`, generic message | 401, "Email or password is incorrect." | ✅ |
| 3 | S-03 | customer token on `/admin/products` | 403 `FORBIDDEN` | 403 | ✅ |
| 4 | L2-02 | tampered client price ignored at checkout | server total (20000 + 5000 shipping) | 25000 centavos, DB snapshot | ✅ |
| 5 | L2-03 | two concurrent checkouts, stock 1 | exactly one 201, one 409 `OUT_OF_STOCK` | [201, 409] | ✅ |
| 6 | L2-01 | expired coupon | 422 `COUPON_EXPIRED` | 422 | ✅ |
| 7 | L2-08 | same idempotency key twice | second returns same order, `replayed: true` | 200 same `_id` | ✅ |
| 8 | S-07 | webhook with invalid signature | 401, order still `pending_payment` | 401, unchanged | ✅ |
| 9 | L2-05 | valid webhook then replay | paid once, replay `duplicate: true`, one history row | as expected | ✅ |
| 10 | L2-06 | missed webhook → status endpoint | gateway verifies, order → `paid` | as expected | ✅ |
| 11 | L1-07 | cancel unpaid order, cancel again | 200 cancelled then 409 `INVALID_STATUS_TRANSITION` | as expected | ✅ |
| 12 | L4-06 | AI without API key | 200, `source: 'fallback'`, DB products | fallback, DB price/stock | ✅ |

## Manual cases (used during the demo / Postman collection)

| # | Case | Steps | Expected | Result |
|---|---|---|---|---|
| M1 | Customer purchase (sandbox) | register → add to cart → checkout → pay on hosted page | webhook moves order to paid | ⏳ run before defense |
| M2 | Wrong-role access | use customer token in Swagger on `/admin/*` | 403 on every admin endpoint | ⏳ |
| M3 | Pickup slot capacity | create capacity-1 slot, two customers book it | second gets 409 `PICKUP_SLOT_FULL` | ⏳ |
| M4 | Student discount | verify a student, checkout as them | server applies 5% discount automatically | ⏳ |
| M5 | Pre-order rule | add unreleased pre-order to cart | 422 `PREORDER_NOT_RELEASED` | ⏳ |
| M6 | AI failure demo | clear `GEMINI_API_KEY`, ask the assistant | controlled fallback answer + keyword products | ⏳ |
| M7 | Expiry sweeper | leave an order unpaid past 60 min | order → `expired`, stock restored | ⏳ |
| M8 | Swagger | open `/api-docs`, execute a request | spec renders, request returns envelope | ⏳ |

Manual rows are checked live during the defense and recorded here afterwards.

## Postman / Bruno (T-12, T-13)

`postman/SPC Book Store.postman_collection.json` — **46 requests across 9
folders** (Setup & Auth, Catalog, Cart, Checkout, Orders, Payments, AI
Assistant, Admin, Negative & edge cases), every request carrying `pm.test`
assertions, including the required T-13 negative cases (unauthenticated 401,
forbidden 403, not-found 404, invalid input 422, out-of-stock 409, invalid
coupon, invalid webhook signature 401, duplicate idempotency). Import it plus
`postman/environment.example.json`, then run the **Setup & Auth** folder
first: its Login/setup requests fill the collection variables (tokens and
ids) that every other request uses.

## Known limitations

- Sandbox payments only (PayMongo test mode); no refunds.
- In-memory AI cache is per-process (resets on restart).
- Free-tier hosting sleeps; wake the API before the defense.
- The expiry sweeper runs in-process (every 5 minutes), not a separate scheduler.
