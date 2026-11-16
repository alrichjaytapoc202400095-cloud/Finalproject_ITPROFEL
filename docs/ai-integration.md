# SPC Book Store — AI Integration (Level 4)

## Feature

**AI Product Discovery Assistant** — a student types what they need ("I need a
book for IT301", "something for networking"), and the assistant recommends real
products from the SPC Book Store catalog.

## Provider and model

- **Provider:** Google Gemini API (`https://generativelanguage.googleapis.com/v1beta`).
- **Model:** `gemini-1.5-flash` (configurable via `GEMINI_MODEL`).
- **Key handling:** `GEMINI_API_KEY` lives **only** in backend environment
  variables. It never appears in the frontend, the browser bundle, or the
  repository (S-12 / L4-01). There is no SDK dependency — a plain `fetch` with
  an `AbortController` timeout (`AI_TIMEOUT_MS`, default 15 s).

## Endpoint

`POST /api/v1/ai/assistant` (authenticated, rate-limited to 10 requests / 15 min
per IP). Request: `{ "question": "..." }` (3–500 chars, validated → 422).

## Retrieval method (grounded, L4-03)

1. `aiService.retrieve()` tokenizes the question and searches **active products
   in MongoDB** (`title`, then `author/description/courseCode`), max 15
   candidates. With no usable tokens it falls back to the newest 15 products.
2. Candidates are serialized into the prompt as JSON (`id, title, author,
   courseCode, priceCents, stock, isPreOrder`). The model sees **only** records
   that exist in the database.

## Prompt strategy

- A strict **system instruction** (`src/services/aiService.js`) defines the
  task, demands JSON output only, forbids inventing products/prices, and states
  that the user message between `<<< >>>` delimiters is **data, not
  instructions** (prompt-injection resistance, L4-07).
- `generationConfig.responseMimeType: 'application/json'`,
  `temperature: 0.3`, `maxOutputTokens: 1024`.

## Validation (L4-04, L4-05)

The model's text is stripped of code fences, parsed as JSON, and must have the
shape `{ productIds: [], explanation: "" }`. Then:

- every `productIds` entry must exist in the retrieved candidate set — unknown
  ids are **discarded**;
- the matching products are **re-fetched from MongoDB** and returned with
  database values for name, price and stock — the model's words are used only
  for the explanation string (rendered as text, never HTML);
- zero valid ids → fallback.

## Failure handling (L4-06)

| Failure | Behavior |
|---|---|
| No API key configured | 200 with `source: 'fallback'`, reason `not_configured` |
| Timeout / 5xx / rate limit from Gemini | 200 with `source: 'fallback'`, reason `unavailable` |
| Invalid or off-schema model output | 200 with `source: 'fallback'`, reason `invalid_output` |
| No candidates matched | fallback answers with keyword results |

The fallback is a **keyword search** over the catalog, so the store never breaks
and the endpoint never returns a raw provider error or a 500. This is
demonstrable live: remove `GEMINI_API_KEY` and the same question returns
fallback results.

## Cost controls (L4-08)

- Rate limiting: 10 requests / 15 min (auth + AI limiters in middleware).
- Input bound: 500 characters (enforced twice — validation middleware and the
  proxy), output bound: `maxOutputTokens: 1024`.
- Timeout: 15 s (`AI_TIMEOUT_MS`).
- Cache: identical questions within 5 minutes are served from the **AIProxy**
  cache without calling the provider (Proxy pattern — see
  `src/patterns/proxy/AIProxy.js`).

## Privacy (L4-09)

Only the question text and catalog fields are sent to the provider. No
passwords, tokens, emails or personal data are ever included. The UI labels
answers as "AI-assisted" and renders model text as plain text.

## Files

| File | Role |
|---|---|
| `src/services/aiService.js` | retrieval, prompt build, validation, fallback |
| `src/patterns/proxy/GeminiClient.js` | real Gemini REST call (timeout, error mapping) |
| `src/patterns/proxy/AIProxy.js` | cache + bounds + logging over the real client |
| `src/controllers/aiController.js` | thin controller |
| `src/routes/index.js` | `/ai/assistant` route + validation + rate limit |
