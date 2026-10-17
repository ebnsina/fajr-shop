# Changelog

## Unreleased

- API foundation: `GET /v1/health` and `GET /v1/store` (the shop's name, branding, currency and
  VAT settings, cacheable with an ETag). Every error uses one shape with a stable `code`.
