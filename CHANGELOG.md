# Changelog

All notable user-facing changes to Fajr Shop.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Storefront and admin.** Catalogue with variants, options and per-category
  attributes; cart, checkout and cash on delivery; order admin with saved views,
  invoices and packing slips.
- **COD operations.** Fraud scoring before the order is accepted, a verification
  call queue, courier routing by delivery success per thana, and COD payout
  reconciliation.
- **Marketing site** (`apps/marketing`) with landing, pricing and contact pages.
- **Six live demo shops** — fashion, kids, grocery, electronics, beauty and home
  — each seeded with a full catalogue and reachable behind a short KYC form.
- **Lead capture.** Demo and contact submissions are stored, deduplicated by
  phone and channel, and exportable as CSV.
- **Page builder** with ten block types, plus banners, menus and a blog.
- **Coupons, abandoned cart recovery, Facebook CAPI and product feeds.**
- **Reports** for sales, returns, courier performance and COD outstanding.
- **Bangla and English** across storefront and admin.

### Fixed

- **The admin never hydrated.** A hand-written Content Security Policy blocked
  SvelteKit's own inline script, so client-side navigation, the theme toggle,
  debounced search and the page builder's drag-and-drop were all dead in
  production. The policy now comes from SvelteKit, which nonces its own scripts.
- **Product images were blocked in development** by the same policy, because
  local object storage is served over plain http.

### Changed

- Icons are Hugeicons throughout.
- Client-side validation uses Valibot.
