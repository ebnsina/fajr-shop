# Changelog

All notable user-facing changes to Fajr Shop.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Request a feature, from the roadmap.** A button under the roadmap opens a
  dialog asking what your shop needs; it is stored with the other enquiries as a
  lead of kind `feature`, so what merchants ask for twice is visible next to who
  asked. Works without JavaScript — the trigger falls back to the contact page —
  and a failed write still leaves the request in the log rather than losing it.

### Changed

- **Pricing and the demo index caught up with the rest of the site.** Plans,
  demo cards and the FAQ use the same tiles, chips, checklists and links as
  everything else, the last `dark:` variants are gone, and the demo credentials
  screen is no longer the one page still on the old classes.


- **A real logo, and a real share card.** The mark is a sun breaking a horizon —
  Fajr is dawn — used for the favicon and beside the wordmark, which is now set
  in the display face rather than in mono. Links pasted into WhatsApp finally
  carry an image: `og.png`, with the headline and the pitch on it.


- **The contact form reads as a sentence.** "I run ___, taking about ___ orders
  a month, and I am looking at ___. Call me on ___ — my name is ___." Six boxes
  in a stack asked for exactly the same thing and read as paperwork. The ways to
  reach a person are links now rather than three cards, and every link on the
  site carries an arrow that steps up and to the right when you point at it.


- **The marketing site is a different product from the admin now.** It is one
  story told in chapters — the shop that grew on a Facebook page, the parcels
  that came back, the operational half we built, the storefront, the work after
  the order — with every word in `STORY`/`WHERE`/`CLOSE` in `content.ts` rather
  than scattered through the markup.

  - **Light always**, white and cool grey, one working blue, and one warm ramp
    that only ever marks a risk or a shortfall. `dark:` is pinned to a class
    nothing sets, so a stray dark variant cannot half-flip a page.
  - **Three self-hosted faces**: Trench Slab for headings, Chubbo for prose,
    Tabular for buttons and figures — and nothing else, because mono on every
    label made a story read like a terminal.
  - **The hero is the admin itself.** Centred words over a real order queue —
    rail, morning counts, customer, area, courier, risk score — leaning back and
    running off the bottom of the fold, standing up as you scroll.
  - **Nothing counts the regions.** The copy no longer says "two markets" or
    "both"; the number of markets, which of them is still in build, and the hops
    drawn between them all come from `REGIONS`. A third one is a row of data.
  - **The markets get the whole screen**: a dot-matrix globe of real land that
    turns on its own, spins on drag, labels both regions and draws the hop
    between them. Pick a market on the sphere or from the row under it.
  - **The mockups are finished, not wireframed**: the storefront shows real
    products, prices and swatches, and the checkout is filled in with a name,
    an address and an order summary. Section labels are tinted chips rather than
    a leading dash, and what a plan includes is a checklist rather than rows
    separated by rules.
  - **The summary is an index**, not twelve more cards: one aligned grid of
    numbered rows with shared rules, and the checkout shown on an unfolded
    foldable — the phone this market actually wants — where the form and what
    you are paying sit on opposite halves.
  - **WhatsApp buttons are WhatsApp green.**
    they are the outline style in WhatsApp's green, so they read as WhatsApp
    without competing with the primary action beside them.
  - **The footer carries socials and the legal links**, and `/privacy` and
    `/terms` are real pages written from what the site actually does rather than
    boilerplate.
  - **One radius scale**: 2px controls, 6px surfaces, 12px panels, pills for
    counts and statuses. Ad-hoc 3px, 4px, 5px, 10px, 14px and `rounded-3xl`
    values are gone from every page.
  - **The chapters are dealt as a stack** — each sticks under the header while
    the next slides over it, numbered `01 / 05` with a rule that fills as you
    read. Every card fits the screen, so the twelve feature tiles moved into
    their own wall underneath rather than making each chapter twice the height
    of the viewport.
  - **Features are a bento wall** of tiles carrying the product's own screens,
    built in markup: courier ranking, COD reconciliation, one-page checkout, the
    message thread after delivery.
  - **The footer is revealed**, not scrolled to — the page slides off it.
  - **Motion follows a real standard**: strong `ease-out` curves, sub-300ms UI
    transitions, hover motion gated to real pointers, a press state on every
    button, 30–80ms stagger, and reduced motion that fades rather than nothing.
  - **Typography is set by what each thing is**: headings balance, prose uses
    `pretty`, and the lead's width is a reading measure rather than a number
    chosen to force a line count.

  Pricing, contact and the demo pages follow the same system. Icons are Lucide
  in this app; `apps/web` is still on Hugeicons.

### Added

- **The storefront API.** Shop settings and address shape, catalogue browse and
  search with facets, a full product with reviews and related items, a cart a
  client holds by token, checkout, and order tracking. Seventeen documented
  paths, with the OpenAPI spec generated from the same schemas the handlers
  validate against. This is what the mobile app will consume.

- **Unified inbox.** WhatsApp and Messenger arrive in one place, threaded per
  person per channel, with the customer's latest order shown before you open the
  thread. Webhooks are idempotent, so Meta's redeliveries never make a customer
  appear to ask twice. Suggested replies are drafted from that customer's own
  order and the shop's terms, each with the reason it was offered — staff send,
  edit or ignore; nothing goes out on its own.

- **Five couriers and four payment gateways.** Steadfast, Pathao, RedX and
  eCourier for South Asia; Aramex for the Gulf. SSLCommerz for Bangladesh; Tap,
  Tabby and Tamara for the Gulf. Alpha SMS and Twilio for messaging. All are
  connected from the integrations page — none read the environment any more, so
  a merchant sets up their own accounts without a redeploy.

- **Delivery zones come from the country.** A new shop starts with zones that
  make sense where it sells — inside Dhaka, the suburbs, and everywhere else in
  Bangladesh; Dubai and Sharjah, the Northern Emirates, and the rest of the UAE.
  The charge is worked out from the area the customer picks, and the Gulf
  collects no advance because cash on delivery does not work that way there.

- **Dependent address fields.** The first field is a searchable combobox —
  district in Dhaka, emirate in Dubai — and the second lists only what belongs
  to it. Pick Dhaka and the area field searches Dhaka's forty-two thanas;
  change the district and it clears itself rather than keeping a stale area.
  Typing beats scrolling forty options on the phones this market runs on.
- **Form controls styled once for the whole storefront.** Inputs, selects,
  checkboxes, radios and textareas now match the theme everywhere, not just on
  checkout. One focus style throughout: neutral border, 2px accent ring, 2px
  offset. Touch targets stay at 44px, and every rule is logical-property based
  so RTL needs no second pass.

- **Integrations page.** Pick, connect, pause and remove couriers, payment
  providers, messaging, chat channels and analytics from one screen, filtered to
  the shop's own region. Secrets are masked once saved and never reach the
  browser; editing one field leaves the others intact, and pausing keeps the
  credentials.
- **Country profiles** for Bangladesh, Pakistan, the UAE, Saudi Arabia, Kuwait,
  Qatar, Bahrain and Oman — address levels, phone rules, tax treatment and what
  the advance-payment option is called in each market.

- **A real product page.** Image carousel with an optional video, details and
  specifications, customer reviews with a ratings breakdown and verified-purchase
  badges, questions and answers, and a "you may also like" row. Reviews and
  questions are moderated in the admin before anything appears publicly, and the
  page emits `aggregateRating` and `review` structured data.

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

- **The product page had no gallery**, because the seed only ever uploaded one
  image. Every product now carries three or four, and the thumbnail strip works.
- **The product photo filled the whole screen.** The gallery column is capped, so
  a 4:5 image can no longer be driven a metre tall by a wide viewport, and the
  buy column sticks alongside it instead of floating in whitespace.
- **Sold-out sizes were unreadable and unannounced** — at 35% opacity with a
  line through it, "L" rendered as "t", and a screen reader was told nothing.

- **The whole admin printed taka regardless of the shop's currency**, so a Dubai
  merchant read their revenue, order totals and delivery zones in ৳.

- **A Gulf customer could not check out at all.** Every phone was validated as
  Bangladeshi, so a UAE number was rejected outright. Phone rules, the address
  picker and its labels now follow the shop's own country.
- **A UAE shop showed Bangladeshi districts and offered bKash.** The address
  list, the payment labels and the delivery copy all come from the country now.
- **Orders were stamped BDT regardless of the shop's currency**, which would
  have made every report and invoice wrong on a Gulf deployment.
- **The storefront search box read "Search01FreeIcons"** — a bulk icon migration
  had replaced the word inside the placeholder, the label and the button.

- **Admin permissions were never enforced on the server.** The sidebar hid what
  a role could not do, but a direct POST reached the action regardless — a
  staff-role account could rename the shop, delete media or change payment
  settings. Every admin load and action is now behind a permission check, and a
  test fails if a route is added without one.

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
- **Every non-Bangladeshi shop printed prices in Bengali numerals.** The money
  formatter defaulted to `bn-BD` and six of seven call sites omitted the locale,
  so a Dubai storefront showed dirhams in Bengali digits. Formatting is now bound
  to the store and the locale can no longer be left out.

### Added

- **Request a feature, from the roadmap.** A button under the roadmap opens a
  dialog asking what your shop needs; it is stored with the other enquiries as a
  lead of kind `feature`, so what merchants ask for twice is visible next to who
  asked. Works without JavaScript — the trigger falls back to the contact page —
  and a failed write still leaves the request in the log rather than losing it.

### Changed

- **The marketing site is rebuilt on an editorial structure**: ink and bone with
  one accent, sections opening with a label and a hairline rule, numbered
  chapters separated by rules instead of cards, headings that rise into place
  behind their own edge, and a section rhythm measured in viewport height.

- **The marketing site has its own design system**, sharing nothing with the
  admin: Bricolage Grotesque over Inter Tight, an editorial type scale, pill
  buttons a size larger, and numbered rule-separated rows in place of boxed
  cards — because boxed cards are what made it read like a dashboard.

- **The landing page keeps the structure and drops the decoration.** A bento
  grid where the flagship feature gets twice the room, a marquee of the couriers
  and wallets each region already uses, and a hero sized as a headline — but
  flat surfaces, a single hairline, one accent, and no gradients, glows or
  grain.

- **The marketing site is redrawn.** Geist across display and text with tight
  tracking, one violet accent doing all the work, near-neutral surfaces and a
  properly dark dark mode. Buttons lift, cards raise, and sections fade in as
  they arrive — all of it dropped under `prefers-reduced-motion`.

- **The marketing site has its own identity.** Fajr means dawn, so the palette is
  that hour — saffron on indigo — with Fraunces for headlines and Instrument
  Sans for text. The admin deliberately stays neutral: it is the merchant's
  workspace, and their storefront owns the colour there.
- **The dashboard leads with what costs money.** Revenue against the previous
  thirty days with a sparkline, the return rate, and the COD couriers still owe
  you — then a single "needs you" queue covering calls, packing, unanswered
  messages, reviews and low stock. It says "—" rather than inventing a return
  rate from four parcels.

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
