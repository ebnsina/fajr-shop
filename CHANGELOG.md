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
- **The customers page returned a 500.** It imported a value from `@fajr/core`,
  which pulled the database driver into the browser bundle. Segment labels now
  live in `$lib`, and a test fails if any component imports a core value again.
- **The admin showed "Fajr Shop" instead of the merchant's own store name.**
- **The enquiry forms rejected every Gulf phone number**, accepting only
  Bangladeshi mobiles.

### Changed

- **The landing page covers two regions.** South Asia and the Gulf swap the
  headline, the numbers, the currency and the couriers and wallets named — the
  Gulf is marked *in build* rather than implied to be finished.
- **Storefront themes are regional.** `bazar` for South Asia (saturated, dense,
  built to be scanned) and `gulf` for the Middle East (deeper palette, roomier,
  looser leading for Arabic). Typefaces cover their scripts: Hind Siliguri for
  Bengali, Cairo for Arabic.
- **Three Gulf demo shops** — Layali, Barq and Souq Yawmi — priced in dirhams,
  VAT-inclusive, with bilingual product titles.
- Demo URLs come from `DEMO_URL_TEMPLATE` instead of an assumed subdomain.

- The admin sidebar has a **Visit site** link, opening the storefront in a new tab.
- **Shop name, tagline, announcement bar and support hours are settings**, not
  hardcoded copy. The announcement strip hides itself when empty rather than
  promising something the merchant does not offer.
- **Every storefront page carries a full set of meta and Open Graph tags** —
  title, description, canonical, `og:` and `twitter:` twins, and an image that
  falls back to the shop's logo. They are rendered once by the layout, so no
  page can emit a second `og:title`. Cart, checkout, search and order pages are
  `noindex`.

- Icons are Hugeicons throughout.
- Client-side validation uses Valibot.
