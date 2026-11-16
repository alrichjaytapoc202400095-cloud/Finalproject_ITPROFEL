# SPC Book Store 📚

**AI-enhanced campus bookstore e-commerce application** — the final integrative capstone for
IT PROFEL 1 (ITPE101) at St. Peter's College, Iligan City.

A complete, API-driven store: React storefront + admin UI, a Node/Express REST API that owns
every business rule, MongoDB, PayMongo **test-mode** payments with signed webhooks, and a
Gemini-powered **AI book assistant** grounded on the real catalog.

Campus-bookstore concept (Level 3 differentiation):

1. **Verified-student discount** — students submit their student info, an admin approves it, and
   a 5% discount is applied *by the server* at checkout.
2. **Campus pickup slots** — capacity-limited pickup windows, booked atomically, released on
   cancel/expire; pickup orders pay no shipping fee.
3. **Course-coded catalog + pre-orders** — filter by course code (e.g. `IT101`); unreleased
   pre-orders are rejected at cart/checkout.

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js (LTS) + Express 4, layered MVC (routes → controllers → services → models) |
| Database | MongoDB + Mongoose (all money as **integer centavos**) |
| Payments | PayMongo **Test Mode** (hosted checkout + HMAC-SHA256 signed webhooks); Maya sandbox provider included |
| AI | Google Gemini REST API, backend-only, validated + keyword fallback |
| Docs | OpenAPI 3 (`backend/openapi.yaml`) served as Swagger UI at `/api-docs` |
| Tests | Jest + Supertest — 12 integration tests over HTTP |
| Patterns | MVC, Singleton, Factory Method, Façade, Proxy, Decorator, Observer, Strategy (`docs/design-patterns-oop.md`) |

---

## 1. Prerequisites

- **Node.js 18+** (developed and tested on Node 24) and npm
- **MongoDB** — a local instance *or* a free MongoDB Atlas cluster.
  *Note: the automated test suite runs without any MongoDB (it spins up an in-memory one).*
- Optional, for the full demo: a **PayMongo** account (test-mode keys) and a **Gemini API key**
  (free tier). The app runs, seeds, and serves the catalog without them; checkout needs the
  PayMongo key and the AI answer needs the Gemini key (otherwise their documented fallbacks apply).

## 2. Repository structure

```
spc-bookstore/
  backend/            Express API (MVC), openapi.yaml, tests/, scripts/seed.js
  frontend/           React storefront + admin UI (Vite)
  docs/               architecture, database, patterns, business rules, AI, payments,
                      test plan, code review, contributions, concept statement
  postman/            Postman collection (46 requests, assertions) + example environment
  README.md           this file
  .gitignore
```

## 3. Backend setup

### Quick start from the repository root (Windows)

From the project root, install both apps' dependencies once, then start the backend and
frontend in separate PowerShell windows. The dev script waits for the backend health check
before opening the frontend, so the first catalog request does not race API startup:

```powershell
npm run install:all
npm run dev
```

The root-level `npm start`, `npm run seed`, and `npm test` commands forward to the backend.

```bash
cd backend
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
```

Edit `backend/.env` — `MONGO_URI` may be left **blank** in development: the API then
starts a temporary in-memory MongoDB and auto-seeds the demo catalog and accounts on
every boot. Set an Atlas/local URI for data that survives restarts. `JWT_SECRET` should
be a long random string (a dev fallback is used if unset). Everything else is optional.

| Variable | Default | Required for | Notes |
|---|---|---|---|
| `PORT` | `5000` | — | API port |
| `NODE_ENV` | `development` | — | set `production` when deployed |
| `MONGO_URI` | blank | everything | blank = temporary in-memory DB, auto-seeded on boot (not persistent). Set an Atlas/local URI for persistence. |
| `MONGO_DB_NAME` | `spcbookstore` | everything | seed/test commands use this database only |
| `JWT_SECRET` | dev fallback | auth | use a long random string; never commit the real one |
| `TOKEN_TTL_HOURS` | `2` | — | JWT expiry (short-lived tokens) |
| `FRONTEND_URL` | `http://localhost:5173` | payments | gateway success/cancel redirects |
| `CORS_ORIGINS` | `http://localhost:5173` | security | comma-separated allowed origins; no wildcard |
| `PAYMENT_PROVIDER` | `paymongo` | — | or `maya` |
| `PAYMONGO_SECRET_KEY` | — | checkout | `sk_test_...` from the PayMongo dashboard (**test mode**) |
| `PAYMONGO_WEBHOOK_SECRET` | — | webhooks | `whsec_...` from registering the webhook |
| `MAYA_*` | — | — | only if `PAYMENT_PROVIDER=maya` |
| `GEMINI_API_KEY` | — | AI answers | backend-only; without it the AI endpoint uses the keyword fallback |
| `GEMINI_MODEL` | `gemini-1.5-flash` | — | |
| `AI_TIMEOUT_MS` | `15000` | — | |
| `SHIPPING_FEE_CENTAVOS` | `5000` | — | ₱50.00 flat delivery fee (pickup = free) |
| `STUDENT_DISCOUNT_PERCENT` | `5` | — | Level 3 verified-student discount |
| `ORDER_EXPIRY_MINUTES` | `60` | — | unpaid orders expire and release stock |

### Seed and reset (repeatable, T-09 / L1-13)

```bash
npm run seed        # upserts: 5 categories, 26 products, 3 coupons, 10 pickup slots,
                    # 1 admin + 2 customers. Safe to re-run (no duplicates).
npm run seed:reset  # drops ALL collections in MONGO_DB_NAME, then seeds again
```

The seed only ever touches the database named in `MONGO_DB_NAME` — never point it at production.

### Run

```bash
npm start        # node server.js → http://localhost:5000
npm run dev      # nodemon reload
```

- **Swagger UI:** http://localhost:5000/api-docs (renders `backend/openapi.yaml`)
- **Health probe:** http://localhost:5000/api/v1/health

## 4. Frontend setup

```bash
cd ../frontend
npm install
npm run dev      # http://localhost:5173  (proxies /api → localhost:5000)
```

`frontend/.env` is only needed when deployed: set `VITE_API_URL=https://<your-api-domain>`
(no trailing slash). Leave it empty in development.

## 5. Demo accounts (TEST-ONLY credentials)

| Role | Email | Password | What to demo |
|---|---|---|---|
| Administrator | `admin@spc.edu` | `Admin#1234` | catalog/stock/coupons/orders admin, student-verification queue, pickup slots |
| Verified student | `juan@spc.edu` | `Juan#1234` | automatic 5% student discount at checkout |
| Customer | `maria@spc.edu` | `Maria#1234` | no discount (not verified) |

Seeded coupons: `WELCOME10` (10%, min ₱500) · `BOOKS50` (₱50 off, min ₱300) · `EXPIRED5`
(deliberately expired — use it for the negative test). The **first account ever registered**
becomes the administrator (bootstrap rule); afterwards everyone registers as a customer.

> With `MONGO_URI` blank (the default in `backend/.env`), the 26-product catalog and the
> three accounts above are auto-seeded into the temporary in-memory database on every
> backend start. They are recreated each boot; set a real `MONGO_URI` for persistence.

> These credentials are for the sandbox demo only and are documented as required by D-10.
> Never reuse passwords from real life, and never commit a real `.env`.

## 6. Tests

```bash
cd backend
npm test         # Jest + Supertest: 12 integration tests over real HTTP
```

With `MONGO_URI`/`MONGO_URI_TEST` unset, the suite uses an **in-memory MongoDB**, so it runs on
any machine with no database setup. Each test cleans up after itself, so the suite is repeatable.
Expected result: `Tests: 12 passed, 12 total` (see `docs/test-plan.md` for the case table).

## 7. Postman collection

1. Import `postman/SPC Book Store.postman_collection.json` and
   `postman/environment.example.json` (select the environment).
2. Start the backend, seed it, then run the **Setup & Auth** folder first — the Login requests
   store `adminToken`/`customerToken` and the setup requests fill `productId`, `categoryId`,
   `pickupSlotId` etc. as collection variables. (No secrets are stored in the files.)
3. Run the whole collection. 46 requests across 9 folders, all with assertions, including the
   required negative cases (401 / 403 / 404 / 422 / 409 out-of-stock / expired coupon /
   invalid webhook signature / duplicate idempotency).

Checkout requests need the PayMongo test key; without it they return a designed, safe
`502 GATEWAY_UNAVAILABLE` rollback (the tests accept that), and everything else still runs.

## 8. Feature map (project levels)

- **Level 1 (core):** register/login with bcrypt+JWT, roles enforced by middleware, catalog with
  search/filter/sort/pagination, server-owned cart, checkout, order history + cancel, admin
  product/inventory/coupon/order management, dashboard, repeatable seed.
- **Level 2 (business logic):** coupons with full rules, server-recomputed pricing (tamper-proof),
  atomic stock reservation with rollback, order state machine (409 on illegal transitions),
  verified+idempotent webhooks, amount/currency verification, missed-webhook reconciliation,
  idempotency keys, payment retries and expiry sweep.
- **Level 3 (differentiation):** verified-student discount + campus pickup slots (+ course-code
  catalog and pre-order gating). Rules in `docs/business-rules.md`.
- **Level 4 (AI):** grounded Gemini assistant — retrieval from MongoDB, strict JSON validation,
  unknown ids discarded, keyword fallback when the provider is unavailable. `docs/ai-integration.md`.

## 9. API versioning (T-07)

The API is served under **`/api/v1`** (`backend/src/routes/index.js` is mounted there). Policy
for future breaking changes:

1. **Additive changes** (new optional fields, new endpoints) go into `/api/v1` directly and are
   added to `openapi.yaml` — existing clients cannot break.
2. **Breaking changes** (renamed/removed fields, changed semantics) get a **new version**:
   copy the router as `routes/v2.js`, mount both (`app.use('/api/v1', v1)`,
   `app.use('/api/v2', v2)`), migrate the frontend to v2, then deprecate v1 with a sunset date
   announced in `openapi.yaml` and this README before removing it.
3. The React app consumes only documented endpoints; the OpenAPI spec is the contract (T-24).

## 10. Deployment (recommended: Vercel + Render + Atlas)

1. **MongoDB Atlas:** create a free cluster + database user; allow network access from the API
   host. Copy the connection string into the API host's env vars.
2. **Render** (Express API): new Web Service from the repo, root directory `backend`,
   build `npm install`, start `npm start`, and add **all** backend env vars
   (`NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS=https://<vercel-domain>`,
   `FRONTEND_URL=https://<vercel-domain>`, `PAYMONGO_*`, `GEMINI_API_KEY`).
3. **Vercel** (React frontend): root directory `frontend`, build `npm run build`, output `dist`,
   env `VITE_API_URL=https://<render-app>.onrender.com`.
4. **PayMongo:** register the webhook URL
   `https://<render-app>.onrender.com/api/v1/payments/webhook` (HTTPS + domain name, not an IP),
   tick `checkout_session.payment.paid`, `payment.failed`, `payment.expired`, and store the
   `whsec_...` in Render's env.
5. **Seed the production database once** (e.g. from a local shell with the Atlas URI:
   `MONGO_URI=... npm run seed`) so demo data and accounts exist.
6. Local webhook testing: `ngrok http 5000` and register the tunnel URL (update the dashboard
   when the tunnel changes).

Both hosts serve HTTPS (S-14). Free tiers sleep after inactivity — **wake the API before the
defense** and keep a backup screen recording.

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:27017` | no local MongoDB running → start it, or set `MONGO_URI` to Atlas |
| Checkout returns `502 GATEWAY_UNAVAILABLE` | `PAYMONGO_SECRET_KEY` missing/invalid in `.env` (order is rolled back safely; just add the key) |
| AI always answers with the keyword fallback | `GEMINI_API_KEY` missing, or provider outage — see `docs/ai-integration.md` |
| `401` right after login works | token expired (2 h) or `JWT_SECRET` changed → sign in again |
| Webhook always `401` in local dev | ngrok URL not registered, or `PAYMONGO_WEBHOOK_SECRET` mismatch |
| Port already in use | change `PORT` and the frontend proxy target in `frontend/vite.config.js` |
| Tests fail locally | run `npm test` from `backend/` (they self-provision an in-memory DB) |

## 12. Documentation index

| File | Contents |
|---|---|
| `docs/architecture.md` | context diagram, layering, checkout + missed-webhook sequence, class model |
| `docs/database.md` | ERD (Mermaid), collections, constraints, indexes, seed/reset |
| `docs/design-patterns-oop.md` | 8 patterns with files/flows/trade-offs + abstract class, inheritance, composition, encapsulation |
| `docs/business-rules.md` | 40 rules → enforcing endpoint → exact error code |
| `docs/ai-integration.md` | Gemini configuration, grounding, validation, fallback, cost controls |
| `docs/payment-integration.md` | PayMongo test setup, webhook verification, replay tests, reconciliation |
| `docs/test-plan.md` | 12 automated cases with results + manual demo cases |
| `docs/code-review.md` | 3 substantive review findings + the documented refactor |
| `docs/contributions.md` | per-member contribution statement (fill in names + signatures) |
| `docs/concept-statement.md` | the campus-bookstore concept and its differentiated features |

## 13. Submission notes (C.4)

- Archive name: `ITPE101_FINAL_<SECTION>_<GROUPNAME>.zip`
- Exclude `node_modules/`, `dist/`, `.env`; include both `package-lock.json` files
- Test this README on a fresh clone before submitting; keep a backup demo recording
#   F i n a l p r o j e c t _ I T P R O F E L  
 #   F i n a l p r o j e c t _ I T P R O F E L  
 #   F i n a l p r o j e c t _ I T P R O F E L  
 