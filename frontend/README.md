# SPC Book Store — Frontend PWA

Mobile-first React + Vite frontend for the St. Peter's College campus bookstore.
It consumes the existing Express `/api/v1` backend and is installable as a PWA.

> **Frontend-only repository layer.** This app contains no Express server,
> database driver, or secret. Every piece of data is fetched from the REST API
> through `src/api/`.

---

## Quick start

Requirements: **Node.js 18+** and npm, plus the backend API running on
`http://localhost:5000`.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:5000`, so no CORS setup is
needed locally. Leave `VITE_API_BASE_URL` empty in development.

```bash
# Production build + local preview (preview also proxies /api)
npm run build
npm run preview      # http://localhost:4173
```

The backend can run without MongoDB: if `backend/.env` has `MONGO_URI=` it
starts `mongodb-memory-server` and seeds the demo catalog automatically.

### Demo accounts

| Role     | Email            | Password    |
| -------- | ---------------- | ----------- |
| Customer | `juan@spc.edu`   | `Juan#1234` |
| Customer | `maria@spc.edu`  | `Maria#1234`|
| Admin    | `admin@spc.edu`  | `Admin#1234`|

---

## Environment

Copy `.env.example` to `.env` only when you need to override the API origin.

| Variable             | Required | Purpose                                                                 |
| -------------------- | -------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL`  | Prod     | API origin **without** a trailing slash and **without** `/api/v1`.      |
|                      |          | Empty in dev → the Vite proxy forwards `/api` to `localhost:5000`.      |

Example production value:

```env
VITE_API_BASE_URL=https://spc-bookstore-api.vercel.app
```

The backend's `CORS_ORIGINS` must include the deployed frontend origin. For
local preview the backend `.env` in this repo already allows
`http://localhost:4173` and `http://127.0.0.1:4173`.

No secret keys belong in this app: only the public API URL is exposed to the
browser.

---

## Routes

| Path                | Access        | Notes                                              |
| ------------------- | ------------- | -------------------------------------------------- |
| `/`                 | Public        | Hero, search, categories, featured books           |
| `/products`         | Public        | URL-driven search / filters / sort / pagination    |
| `/products/:id`     | Public        | Detail, stock, pickup, add-to-cart                 |
| `/ai-assistant`     | Signed in     | Grounded AI discovery with fallback product results|
| `/cart`             | Signed in     | Server-authoritative cart with optimistic updates  |
| `/checkout`         | Signed in     | Validated form, idempotent order creation          |
| `/payment/success`  | Signed in     | Polls authoritative payment status                 |
| `/payment/cancelled`| Signed in     | Explains cancellation and allows retry             |
| `/orders`           | Signed in     | Order history (also handles legacy `?paid=1`)      |
| `/orders/:id`       | Signed in     | Order detail + cancel / retry payment              |
| `/login`            | Guests only   | Controlled form + validation                       |
| `/register`         | Guests only   | Controlled form + validation                       |
| `/admin/*`          | Admin only    | Card-based management screens                      |
| anything else       | Public        | Custom 404                                         |

Admin routes: `/admin`, `/admin/products`, `/admin/coupons`, `/admin/orders`,
`/admin/pickup-slots`, `/admin/students`.

Legacy links are preserved: `/product/:id` redirects to `/products/:id`,
`/assistant` redirects to `/ai-assistant`, and the backend's
`/orders?paid=1&order=…` / `?canceled=1&order=…` return URLs are reconciled by
`useOrderReturn`.

---

## React syllabus coverage

| Topic                               | Where it is demonstrated                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Semantic HTML                       | `header`, `nav`, `main`, `section`, `article`, `footer`, labelled forms, skip link       |
| Modular components & props          | `src/components/**` (layout, product, cart, ui) driven by props                          |
| `useState` / props                  | Every form, filter sheet, sheet, stepper, quantity and admin card                        |
| `useEffect` + `AbortController`     | Home, Catalog, Product detail, Orders, Admin screens; all aborted on unmount/navigation  |
| Conditional rendering & lists       | Loading / empty / error / cached states; `.map` grids and order timelines                |
| Context API                         | `AuthContext` (session), `CartContext` (server cart), `ToastContext`, `NetworkStatusContext` |
| Controlled forms & validation       | Login, Register, Checkout, admin create/edit forms via `Field` and `utils/validation.js` |
| Lazy routes & protected routing     | `React.lazy` + `Suspense` in `App.jsx`; `RequireAuth`, `RequireAdmin`, `RedirectIfAuthenticated` |

Hooks in `src/hooks/`: `useApiQuery`, `useOnlineStatus`, `useDebounce`,
`useDocumentTitle`, `useInstallPrompt`, `useOrderReturn`.

---

## API integration rules

- One client, one prefix: `src/api/client.js` prepends `/api/v1` to every call.
- Envelopes are parsed once:
  - success → `{ success: true, data, meta }`
  - error → `{ success: false, error: { code, message, details }, requestId }`
- **Money is integer centavos** everywhere; formatting happens only in
  `src/utils/format.js`.
- Bearer token is stored in `localStorage` (`spc.token`) and re-validated with
  `/auth/me`; the server remains the authority.
- **Idempotency:** checkout sends a `crypto.randomUUID()` in `Idempotency-Key`
  via `utils/idempotency.js`, so a double tap returns the same order.
- **Payments are never marked paid on the client.** The success/cancelled pages
  call `GET /payments/status/:orderId`, then read the authoritative order.
- Cart mutations are server-authoritative; quantity/remove update optimistically
  and roll back on failure.
- AI answers are labelled as AI-assisted; HTTP 503 / provider failure shows a
  clear notice and grounded fallback products instead of invented titles.

---

## PWA & offline behaviour

`vite-plugin-pwa` (Workbox `generateSW`) generates `manifest.webmanifest` and
`sw.js` at build time.

- Manifest: 192 / 512 / maskable 512 PNG icons, `standalone`, theme
  `#5c111c`, start URL `/`, catalog and orders shortcuts.
- App-shell precache: HTML, JS, CSS, icons, manifest (51 entries, ~408 KiB).
- Runtime caching:
  - `GET /api/v1/products*`, `/categories`, `/pickup-slots` → **NetworkFirst**
    (4 s network timeout, 7-day cache).
  - Images → **CacheFirst** (30 days).
- **Never cached by the service worker:** auth, cart, checkout, orders, AI and
  admin mutations. `navigateFallbackDenylist` also keeps `/api/` navigations
  away from `index.html`.
- Offline UX:
  - A sticky offline banner explains what still works.
  - Cached catalog and saved cart remain browsable (cart snapshot in
    `localStorage`).
  - Add-to-cart, checkout, payment, AI and admin actions are disabled with
    helpful copy.
- Service worker updates automatically (`registerType: 'autoUpdate'`), and
  registration is manual in `src/main.jsx` so `offline-ready` can be surfaced.

### Icons

Icons live in `public/icons/` and were generated reproducibly with:

```powershell
pwsh frontend/scripts/generate-icons.ps1
```

---

## Responsive, accessibility & UX contract

Tested with Chrome DevTools mobile emulation at:

| Viewport  | Device class              | Result                                  |
| --------- | ------------------------- | --------------------------------------- |
| 360 × 800 | Small Android             | No document horizontal scroll           |
| 390 × 844 | iPhone 12/13/14           | No document horizontal scroll           |
| 412 × 915 | Pixel / large Android     | No document horizontal scroll           |
| 800 × 600 | Tablet / desktop window   | Centered 520 px shell, no page overflow |

Verified by a CDP harness that compares `document.documentElement.scrollWidth`
against `window.innerWidth` on every route (public, signed-in, admin, 404).
Chip rows, admin tabs and order filters are intentionally `overflow-x: auto`
inside their own containers; they never widen the page.

Other guarantees:

- Minimum **44 × 44 px** tap targets for interactive controls (including search
  fields, clear buttons, steppers and inline auth links).
- Sticky top bar, sticky action bars, bottom sheets and a 5-tab bottom nav.
- Visible focus styles, `aria-label`s, live regions for cart/result counts,
  skip link, and reduced-motion support.
- System fonts only — no web-font requests.
- `prefers-reduced-motion` respected.

---

## Lighthouse proof

Audited **19 Nov 2026** against the local production build
(`npm run build && npm run preview`, `http://localhost:4173`) using
**Lighthouse 11.7.1**, default mobile emulation (Moto G / slow 4G throttling).

| Page        | Performance | Accessibility | Best Practices | SEO | PWA |
| ----------- | :---------: | :-----------: | :------------: | :-: | :-: |
| `/`         | **96**      | **100**       | **100**        | **100** | **100** |
| `/products` | **93**      | **100**       | **100**        | **100** | **100** |
| `/login`    | **98**      | **100**       | **100**        | **92**  | **100** |

Required minimums: Performance ≥ 75, Accessibility ≥ 85, Best Practices ≥ 85,
SEO ≥ 80, PWA installability 100 % — all pages pass.

Key home metrics: LCP 2.6 s, CLS 0.001, TBT 60 ms. Products: LCP 2.9 s,
CLS 0.001, TBT 70 ms.

Full HTML reports are committed in [`docs/lighthouse/`](docs/lighthouse/):

- [`home.html`](docs/lighthouse/home.html)
- [`products.html`](docs/lighthouse/products.html)
- [`login.html`](docs/lighthouse/login.html)

> Lighthouse 12 removed the standalone PWA category, so these reports use
> Lighthouse 11 to show the installability score explicitly. PWA scoring still
> passes `installable-manifest` and service-worker checks.

Re-run them yourself:

```bash
npm run build
npm run preview
npx lighthouse@11.7.1 http://localhost:4173/ --view
```

---

## Deployment

Configs for Render, Vercel and Netlify are included.

### Render (API + static site, blueprint included)

The repository root contains [`render.yaml`](../render.yaml), which deploys the
API as a Node web service and this Vite app as a static site.

1. Push the repository to GitHub.
2. **Database (recommended):** create a free MongoDB Atlas M0 cluster, a database
   user, and allow Render's outbound traffic (`0.0.0.0/0` for the free tier).
   Copy the `mongodb+srv://…` connection string.
3. In Render: **New + → Blueprint**, select the repository, and apply
   `render.yaml`. The blueprint runs `npm run seed` once after the API's first
   successful deploy, so Atlas is seeded automatically. If you ever need to
   reseed manually:
   ```powershell
   cd backend
   $env:MONGO_URI = "mongodb+srv://USER:PASS@cluster.mongodb.net/?retryWrites=true&w=majority"
   $env:MONGO_DB_NAME = "spcbookstore"
   npm run seed:reset
   ```
4. Fill the prompted values:
   | Service | Variable | Value |
   | --- | --- | --- |
   | API | `MONGO_URI` | Atlas connection string (blank = ephemeral in-memory DB) |
   | API | `FRONTEND_URL` | `https://<web-service>.onrender.com` |
   | API | `CORS_ORIGINS` | same origin as `FRONTEND_URL` (comma-separate custom domains) |
   | API | `MAYA_PUBLIC_KEY` / `MAYA_SECRET_KEY` | Maya sandbox keys |
   | Static | `VITE_API_BASE_URL` | `https://<api-service>.onrender.com` |
5. Wait for both deploys, then verify:
   - `https://<api-service>.onrender.com/health` → `{"status":"ok"}`
   - `https://<web-service>.onrender.com` loads and installs as a PWA.
6. Optional: register the payment webhook at
   `https://<api-service>.onrender.com/api/v1/payments/webhook`.

> **Free plan:** web services sleep after ~15 minutes of inactivity. The first
> request can take 30–60 s; wake the API before a demo. Atlas keeps data across
> restarts; the in-memory fallback reseeds on every boot.
>
> The backend redirects payment returns to `FRONTEND_URL/orders?paid=1…`, so
> `FRONTEND_URL` **must** be the deployed static-site origin.

### Vercel

1. Import the repository and set **Root Directory** to `frontend`.
2. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. Add `VITE_API_BASE_URL` in Project → Settings → Environment Variables.
4. Deploy. `vercel.json` provides the SPA rewrite (excluding `/api/*`) and
   long-lived caching for hashed assets, icons, and a no-cache `sw.js`.

### Netlify

1. New site from the repo; base directory `frontend`.
2. Build command `npm run build`, publish directory `dist`.
3. Add `VITE_API_BASE_URL` under Site configuration → Environment variables.
4. Deploy. `netlify.toml` provides the SPA fallback and the same cache headers.

After deploying, add the frontend origin to the backend's `CORS_ORIGINS`
(comma-separated), e.g. `https://your-site.vercel.app`.

---

## Project structure

```text
frontend/
  public/
    favicon.svg
    robots.txt
    icons/                  # 192, 512, maskable, apple-touch
  scripts/generate-icons.ps1
  src/
    api/                    # client.js (envelopes, abort, retry), endpoints.js
    components/
      cart/                 # CartLine, OrderSummary
      layout/               # AppShell, TopBar, BottomNav, banners, guards shell
      product/              # BookCover, ProductCard, ProductGrid
      ui/                   # Alert, Badge, Field, Sheet, Skeleton, EmptyState…
      RouteGuards.jsx
    context/                # Auth, Cart, NetworkStatus, Toast
    hooks/                  # abortable queries, online, debounce, install, returns
    pages/                  # public + account pages
    pages/admin/            # AdminLayout + 6 admin screens
    utils/                  # format, errors, validation, idempotency, constants
    App.jsx                 # lazy routes + protection
    main.jsx                # providers + service-worker registration
    styles.css              # mobile-first design system
  docs/lighthouse/          # committed Lighthouse HTML reports
  vite.config.js            # React + PWA/Workbox + dev/preview proxy
  vercel.json / netlify.toml
  .env.example
```

---

## Manual QA checklist

1. `npm run build` succeeds and `dist/sw.js` + `dist/manifest.webmanifest`
   exist.
2. DevTools → Application → Manifest: installable, 192/512/maskable icons.
3. DevTools → Application → Service Workers: activated and controlling.
4. Load `/products`, switch DevTools to **Offline**, reload: cached books still
   render and the offline banner appears; “Add to cart” is disabled.
5. Sign in, add a book, change quantity, remove it — totals match the server.
6. Double-submit checkout: the same order is returned (idempotency key).
7. Payment return page shows “verifying”, then the server-confirmed status only.
8. Admin account sees `/admin`; customer is redirected and never sees admin UI.
9. Deep-link `/products/:id` and `/orders/:id` directly (SPA rewrite).
10. Repeat steps at 360 × 800 and 800 × 600: no page-level horizontal scroll.

---

## Notes & constraints

- Product images come from the API. Seeded `imageUrl` values are empty, so
  `BookCover` renders a deterministic CSS gradient cover instead of a broken
  image.
- The frontend never imports backend code, database models, or gateway secrets.
- `frontend/dist/` is build output and is git-ignored by the root `.gitignore`.
- The backend is unchanged except for local testing CORS origins; its routes,
  validation, idempotency and payment verification remain the authority.
