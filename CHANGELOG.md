# Changelog

## Unreleased

- Product pages: "Buy now" (adds to the bag and goes there; checkout comes next) and "Order on
  WhatsApp", which opens a chat with the product and its link when the shop sets a WhatsApp
  number in store settings.
- Shop filters open and close with an animation; the price field's focus ring is no longer cut
  off. Sale prices show in the normal text color, with the old price struck through.
- Storefront fixes: the header bag is an icon only; the promise strip is separate cards with a
  colored icon on the right; home rows show five products and "View all" instead of scrolling;
  product photos' thumbnails keep their corners when picked; the bag drawer keeps its title and
  total in view while the items scroll; a new bag page with an order summary; custom dropdowns
  instead of the browser's (districts and categories are searchable); the shop's filter card
  stays beside the results.
- Product pages: Description and Details tabs, and similar products from the same category.
- Discount codes: a percentage (with an optional cap) or an amount off, with an optional
  minimum order, start and end, and a usage limit. Managed under Discounts in the dashboard;
  shoppers enter a code in their bag, which says how much more to add when the minimum isn't met.
  A guest's code comes along when they sign in. (`PUT/DELETE /v1/cart/discount`,
  `/v1/admin/discounts`; carts now have `discount`, `discount_total` and `total`.)
- Fixed: the dashboard's delivery, banner and discount pages crashed after a successful save.
- Shop filters: categories, brands and every option (size, color, capacity…) with how many
  products each choice has, price placeholders from the real range, in stock and on sale,
  and removable chips for the filters in use. Several brands or values of one option match any
  of them (`GET /v1/products/facets`, repeatable `brand` and `option`).
- Product pages have a photo gallery: thumbnails, arrows, swipe on phones. Demo products get
  four photos each, in flat colors.
- Polish: hero slides line up with the side banners, product rows scroll with arrows instead
  of a scrollbar, quantity and "Add to bag" are the same height, selected options have a thin
  border, and the sort box has the same focus ring as every other field.
- Delivery zones: group districts, set a charge for a base weight plus each extra kilo, an
  optional free-delivery amount and a delivery time. Shoppers see the charge for their district
  on the bag page and the zones on every product page. Variants have a weight.
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
