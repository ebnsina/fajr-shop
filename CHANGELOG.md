# Changelog

## Unreleased

- `fajr seed` fills an empty shop with a Bangladeshi demo catalog: 10 departments, 45
  categories, about 3,400 products and 15,000 variants from familiar brands, with drawn pictures,
  banners and home-page highlights.
- Brands, home-page highlights, newsletter sign-up and a dashboard overview in the API.
- Storefront layout in the style Bangladeshi shoppers know: hotline bar, a brand-colored header
  with a big search box and the bag, a category row, hero slides with side banners, round category
  pictures, Featured / On sale / New arrivals sections, boxed product cards with "% off", a fuller
  footer, and a bottom bar on phones.
- Banners (big slides, beside the slides, across the page), category pictures and a "featured"
  switch, all managed from the dashboard.
- Typeface: Sora for headings and text, self-hosted.
- Cart: guests and signed-in customers each have a bag that always shows today's prices; a line
  that can't be bought (sold out, not enough stock, no longer for sale) is marked and left out of
  the subtotal. A guest's bag joins the customer's on sign-in (`POST /v1/cart/merge`).
- Storefront: "Add to bag" on product pages, a bag drawer with quantity and remove, and a bag
  page. All of it also works without JavaScript.
- Catalog: categories (nested), products with up to three options (size, color…) and a price and
  stock per combination, photos, search, filters (category, price, in stock, option) and sorting.
- Stock changes are recorded with a reason and who made them; a product form can't overwrite a
  sale that happened while it was open.
- Dashboard: products list and editor, categories, stock adjustments, logo upload.
- Storefront: home, all products, category and product pages, search, sitemap.xml and robots.txt,
  each with its own title, description, canonical link and Open Graph tags; products carry
  schema.org data for search engines. Filters work without JavaScript.
- Validation messages are plain sentences, never the validator's own wording.
- Accounts and sign-in: customers register with email or phone; the shop owner is created with
  `fajr create-admin`. Sessions use short-lived access tokens and single-use refresh tokens.
- API keys with scopes, for integrations, created and revoked from the dashboard.
- Activity log of every change made in the dashboard or through a key.
- Admin dashboard: sign in, store settings (name, brand color, contact details, VAT rate, BIN),
  API keys, activity. The brand color is applied across the app.
- API foundation: `GET /v1/health` and `GET /v1/store` (the shop's name, branding, currency and
  VAT settings, cacheable with an ETag). Every error uses one shape with a stable `code`.
