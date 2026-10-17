# Fajr Shop

A self-hosted shop for Bangladesh. Each shop gets its own install on its own server.

The API is the product. The storefront, the admin dashboard, mobile apps and any integration
all use the same public API, described in [`openapi.yaml`](openapi.yaml).

## Layout

```
openapi.yaml   the API contract; edit this first, then `make gen`
api/           Go API (chi, Postgres, sqlc, goose)
```

## Develop

Needs Go 1.26+, Postgres 17 and [sqlc](https://sqlc.dev).

```bash
cp .env.example .env     # point it at your Postgres
make migrate
make run                 # http://127.0.0.1:8080/v1/store
make test                # needs the fajr_shop_test database
```

## Using the API

- Every path starts with `/v1`.
- Errors are `{"error": {"code": "...", "message": "...", "fields": {...}}}`. Match on `code`; it
  never changes. `message` is English and may change.
- Money is an integer in minor units (poisha for BDT) with its `currency`.
- `GET /v1/store` returns the shop's name, branding, currency and VAT settings. Read it on start;
  it carries an `ETag`, so send `If-None-Match` and you get `304` when nothing changed.

Deploying a new shop is documented when the deploy script lands.
