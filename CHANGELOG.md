# Changelog

## Unreleased

- Accounts and sign-in: customers register with email or phone; the shop owner is created with
  `fajr create-admin`. Sessions use short-lived access tokens and single-use refresh tokens.
- API keys with scopes, for integrations, created and revoked from the dashboard.
- Activity log of every change made in the dashboard or through a key.
- Admin dashboard: sign in, store settings (name, brand color, contact details, VAT rate, BIN),
  API keys, activity. The brand color is applied across the app.
- API foundation: `GET /v1/health` and `GET /v1/store` (the shop's name, branding, currency and
  VAT settings, cacheable with an ETag). Every error uses one shape with a stable `code`.
