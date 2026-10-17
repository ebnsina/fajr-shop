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

`401` with `unauthenticated` means sign in; `session_expired` means the token you sent is no
longer valid; `403 forbidden` means the account or key may not do this.

Deploying a new shop is documented when the deploy script lands.
