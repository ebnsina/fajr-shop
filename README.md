# Fajr Shop

A self-hosted shop for Bangladesh. Each shop gets its own install on its own server.

The API is the product. The storefront, the admin dashboard, mobile apps and any integration
all use the same public API, described in [`openapi.yaml`](openapi.yaml).

## Layout

```
openapi.yaml   the API contract; edit this first, then `make gen`
api/           Go API (chi, Postgres, sqlc, goose)
web/           SvelteKit storefront and admin dashboard, built with Sina UI
```

## Develop

Needs Go 1.26+, Postgres 17, [sqlc](https://sqlc.dev), Node 22.17+ and pnpm.

```bash
cp .env.example .env     # point it at your Postgres (a non-superuser role)
make migrate
FAJR_ADMIN_NAME="Shop owner" FAJR_ADMIN_EMAIL=owner@example.com FAJR_ADMIN_PASSWORD=… \
  sh -c 'set -a; . ./.env; set +a; cd api && go run ./cmd/fajr create-admin'
make run                 # API on http://127.0.0.1:8090
cd web && pnpm install && cd ..
make web                 # dashboard on http://localhost:5173/admin
make check               # everything CI runs; needs the fajr_shop_test database
```

Fonts: Familjen Grotesk (headings, SIL OFL) is bundled from npm. Synonym (body) loads from
Fontshare's API: its licence allows self-hosting only for your own site, not bundling it into
software installed for other businesses, so each shop fetches it from Fontshare.

The web app reads `FAJR_API_URL` (where it reaches the API). In production also set
`BODY_SIZE_LIMIT=11M`, or photo uploads through the dashboard stop at the adapter's 512 KB default.

The web app never shows a token to the browser: its server keeps the access and refresh
tokens in httpOnly cookies and refreshes them itself.

## Using the API

- Every path starts with `/v1`.
- Errors are `{"error": {"code": "...", "message": "...", "fields": {...}}}`. Match on `code`; it
  never changes. `message` is English and may change.
- Money is an integer in minor units (poisha for BDT) with its `currency`.
- `GET /v1/store` returns the shop's name, branding, currency and VAT settings. Read it on start;
  it carries an `ETag`, so send `If-None-Match` and you get `304` when nothing changed.

### Signing in

| Client | How |
| --- | --- |
| Mobile app, SPA | `POST /v1/auth/login` → `access_token` (15 minutes) and `refresh_token` (30 days). Send `Authorization: Bearer <access_token>`. When it expires, `POST /v1/auth/refresh`; each refresh token works once, and using one twice signs that session out everywhere. |
| Integrations | An API key from the dashboard (Developers → API keys), sent the same way: `Authorization: Bearer fsk_…`. A key can only do what its scopes allow. |

### Catalog

- `GET /v1/products` lists what's for sale. Filter with `q`, `category` (includes subcategories),
  `min_price`/`max_price` (poisha), `in_stock`, and `option=Color:Red` (repeatable; one variant must
  match them all). Sort with `newest`, `price_asc`, `price_desc` or `name`. Follow `next_cursor`.
- `GET /v1/products/{slug}` has the options, each variant's price and stock, and the photos.
- Stock is changed only with `POST /v1/admin/variants/{id}/stock-adjustments`, which records why.

### Cart

- `PUT /v1/cart/items/{variant_id}` with `{"quantity": n}` sets a line (`0` removes it).
- Signed in: the cart follows the access token. Guest: the first `PUT` returns `token`; send it as
  `X-Cart-Token` from then on. After sign-in, `POST /v1/cart/merge` with that token.

`401` with `unauthenticated` means sign in; `session_expired` means the token you sent is no
longer valid; `403 forbidden` means the account or key may not do this.

Deploying a new shop is documented when the deploy script lands.
