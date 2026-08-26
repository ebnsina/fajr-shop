# Fajr Shop — working rules

Read `docs/plan.md` first. It holds the architecture, the phase order, and every
deliberate shortcut marked with a `ponytail:` note. If a change contradicts the
plan, change the plan in the same commit and say why.

`docs/` and `data/` are gitignored on purpose — plans and roadmaps never reach
the public repo. Keep `CHANGELOG.md` current with every user-facing change.

## Accessibility is not optional

**Every interface must satisfy WAI-ARIA and WCAG 2.2 AA. A change that fails
this is not finished, regardless of how it looks.**

Non-negotiable, checked before any UI change is called done:

- **Contrast.** Text and meaningful icons clear **4.5:1** (3:1 for text at 18.66px
  bold or 24px+). Check both light and dark, and check the *badge* and *muted*
  colours specifically — those are where it slips. Status badges use
  `$lib/components/Badge.svelte`; do not hand-roll a coloured pill.
- **Semantics before ARIA.** Use the real element. `<button>` for actions,
  `<a>` for navigation, `<nav>`/`<ul>`/`<li>` for menus, `<table>` with `<th>`
  for tables, `<details>` for disclosures. ARIA is a patch for gaps the platform
  leaves, not a substitute for markup — and a wrong role is worse than none.
- **Every control has an accessible name.** An icon-only button needs
  `aria-label`; an input needs a real `<label>`; decorative SVG gets
  `aria-hidden="true"`.
- **Keyboard reachable and visibly focused.** Nothing is mouse-only, focus order
  follows reading order, and the focus ring is never removed — it is defined once
  in `app.css` and applies to everything.
- **State is announced, not just coloured.** Current nav item carries
  `aria-current="page"`; errors use `role="alert"`; colour is never the only
  signal (pair it with text or an icon).
- **Never nest interactive elements**, and never nest a `<form>` inside a
  `<form>` — associate distant controls with the `form` attribute instead.
- **Respect the user's settings.** Honour `prefers-color-scheme`, and do not
  animate through `prefers-reduced-motion`.

Storefront pages carry the same bar. BD shoppers are overwhelmingly on small
Android screens over slow connections, so touch targets stay at least 44px and
nothing important depends on hover.

## Two regions, one product

South Asia and the Gulf are different businesses, and the product says so rather
than translating one into the other.

- **`region` drives the storefront theme.** `bazar` for South Asia — saturated
  orange, dense grid, everything scannable on one screen, because it competes
  with Daraz. `gulf` for the Middle East — deep green and gold, roomier grid,
  higher basket, looser leading because Arabic runs ~25% longer than English.
- **Name what the merchant already uses.** Steadfast and bKash in Dhaka; Aramex,
  mada, Tabby and Tamara in Dubai. Naming the wrong ones loses the sale faster
  than a missing feature.
- **The Gulf displays tax-inclusive prices** — it is legally required there and
  wrong in Bangladesh. `vatInclusivePricing` follows the region.
- **Never claim Arabic or RTL until the catalogue exists.** The Gulf demos are
  English-first with bilingual product titles, which is what plan §14 committed
  to. Marketing copy says so plainly.
- **Phone validation covers every market we sell into**, not just Bangladesh. A
  Dubai merchant being told their own number is invalid is the worst first
  impression the form can make.

## Two apps, two audiences

`apps/web` is the merchant's — storefront plus admin, deployed once **per
merchant**. `apps/marketing` is **fajr.shop itself**, deployed once by us. They
share no database and no deploy; do not add marketing routes to `apps/web`.

- **Marketing copy lives in `apps/marketing/src/lib/content.ts`** — plans,
  prices, roadmap, `CONTACT`, and the per-route `META`. Never hardcode a price
  or a phone number into a page; the pricing table in `plan.md` §19 is a summary
  and goes stale, `content.ts` does not.
- **Title and description are set once, by the layout**, from `META`, and
  mirrored into the `og:`/`twitter:` twins. A page that sets its own `<title>`
  will drift from its share card — and in BD the share card is how the site
  travels, because the link gets pasted into WhatsApp.
- **A new form is a new `kind`, not a new table.** The feature request on the
  roadmap is a lead with `kind: 'feature'` — the same `record()`, the same
  webhook, the same per-form rate limit, the same `(phone, kind)` upsert, so one
  person can ask for a demo and request a feature without either overwriting the
  other. Adding a table for it would mean a second migration, a second failure
  path and a second place to look when someone asks who wrote in.
- **A link looks like a link.** `.link` is text with an arrow that steps up and
  to the right on hover — hidden at rest, so a column of them stays a clean
  column. It is drawn (`$lib/Arrow.svelte`), not a glyph and not a font: the
  weight and baseline of ↗ vary by face, and a whole pixel font for one
  character that its latin subset may not even contain is not a trade worth
  making.
- **The contact form is a sentence, not a stack of boxes.** The same six answers
  a form would ask for, written the way a person would say them, with inline
  fields. Labels still exist for a screen reader — they are `sr-only`, not
  absent — and validation messages gather under the sentence rather than hanging
  off a field, where they would push the words around as you type.
- **A dialog is `<dialog>`.** The platform gives the focus trap, Escape, the
  inert page behind and the top layer; the trigger is an `<a href="/contact">`
  that JavaScript upgrades, so with no script the visitor still reaches a form
  rather than a dead button. A failed submit reopens the dialog with the words
  they typed still in it.
- **The marketing site has its own database**, separate from any shop's:
  `LEADS_DATABASE_URL`, one `lead` table, upserted on `(phone, kind)` so a repeat
  submission bumps `touches` instead of duplicating. A failed write never blocks
  the visitor — it logs and carries on, so the lead survives in the log.
- **Demo credentials live in `$lib/server/`, never in `$lib/content.ts`**, which
  ships to the browser. A gate in front of client-readable secrets is decoration.
- **Unshipped phases carry a coming-soon badge and a plain sentence** that they
  are not in any plan and will be quoted before they are. Never imply a roadmap
  item is buyable today.

## Non-negotiables from the project guidelines

- **Comments are one line, two at most.** No exceptions, no JSDoc blocks.
- **Never hardcode config or fall back for a missing env var** — throw, with the
  variable named in the message. A wrong default is worse than a stopped page.
- **Icons are Lucide** (`@lucide/svelte`) in `apps/marketing`; `apps/web` is still
  on Hugeicons and has not been swept. Validation is **Valibot** everywhere.
  Lucide ships raw `.svelte` files, so it must stay in `ssr.noExternal`.
- **Three identities, on purpose, and they share no components.** The admin is a
  tool — Mona Sans, blue, compact, boxed. Storefront themes carry the merchant's
  own colour. `apps/marketing` has the system below. Reusing an admin component
  on the marketing site is what makes it look like a dashboard.

### `apps/marketing` design tokens

Everything is defined once, in `src/app.css`. `@theme` holds the raw values (and
so mints the Tailwind utilities); `:root` holds aliases that point at them. If a
value appears twice, one of them is a bug waiting to drift.

| Token | Value | Job |
| --- | --- | --- |
| `--font-display` | Trench Slab | Every heading, weight **500**, `-0.4px` tracking, `1.15` leading |
| `--font-sans` | Chubbo | All prose |
| `--font-mono` | Tabular | **Buttons and figures only** (`.num`) |
| `--text-hero` / `--text-section` / `--text-lead` | fluid clamps | The whole type scale; no ad-hoc sizes on headings |
| `--color-primary-*` | 50→900 blue | 600 fills and carries white at 5.7:1; 700 is the smallest text that clears 4.5:1 on paper |
| `--color-warn-ink/line/tint/wash` | warm browns | A risk, a shortfall, an order held back — **never** a call to action or decoration |
| `--color-whatsapp` / `--color-whatsapp-ink` | `#25d366` / `#075e54` | The only borrowed brand colour, and only on WhatsApp controls. The bright mark is for icons and dots — white on it is 1.9:1 and fails — so a WhatsApp button is the **outline** style — green border, dark-green label at 8.6:1 on paper — never a solid green block competing with the primary action beside it |
| `--color-void` / `--color-bone` | `#0f1420` / `#fff` | Ink and paper |
| `--color-line` / `--color-line-strong` / `--line-soft` | 10% / 20% / 6% ink | The three hairline weights, and there are only three |
| `--color-strong/body/muted/faint` | ink → `#79839a` | The four text tones, in order of loudness |
| `--color-raised` / `--color-sunken` | `#fff` / `#f4f6f8` | The two surface steps. There is no third, and no shadow |
| `--radius-control` / `--radius-surface` / `--radius-panel` / `--radius-pill` | 2px / 6px / 12px / 999px | **The whole shape scale.** A control (button, field, badge, chip) is 2px; a surface (tile, screen, card) is 6px; a surface holding other surfaces (a stack card) is 12px; a count or a status is a pill. No fifth value — a stray `rounded-3xl` is what makes a page look assembled rather than designed. The only exception in the codebase is the phone bezel, which is 26px and says why |
| `--measure-lead` / `--measure-page` | `58ch` / `76rem` | Reading measure, and the page container (`.wrap`) |
| `--pad` / `--sec-y` | fluid clamps | Page gutter and section rhythm |
| `--ease-out` / `--ease-out-quint` | `cubic-bezier(0.23, 1, 0.32, 1)` | The one curve; there is no `ease-in` on this site |

Three faces, all self-hosted from `src/lib/fonts/` as single variable woff2
files — the CSP has no external font origin, so a CDN link would simply not
load. **The display face is meant to be Oddval** (TypeMates), which is licensed
and on no registry; Trench Slab stands in until someone buys it. Do not swap it
for a Google font and call it done.

- **Say where once, and never count the regions.** `WHERE` in `content.ts` is
  the single place the geography is stated, and the band that renders it is the
  only one that names a city, a country or a courier. Everywhere else says what
  happens, not where — repeating a merchant's own city in six paragraphs does
  not prove we know their market, it reads as a template with the place name
  substituted in. Nothing says "two markets", "both" or "either": the count
  comes from `REGIONS`, the in-build note comes from each region's own `status`,
  and the globe chains a hop between every consecutive pair. Adding a third
  region is a row of data, not a rewrite.
- **The hero does not switch.** The story is told from the home market's point
  of view, with the second region in its own band further down. A region toggle
  above the fold reflows the whole hero under the reader's cursor, which is a
  layout shift they did not ask for.
- **The hero holds the whole fold.** `.sec-hero` is `100svh` less the header,
  with the heading big and the paragraph under it deliberately small — the
  headline is the thing being read at that size, not the explanation. The
  headline runs the full measure so each half of its turn is one line: two
  lines, never three.
- **The hero words are centred and the admin runs off the bottom.** `.stage`
  clips the dashboard so only its top third is on screen — a queue of orders
  with one of them held back, which is the whole pitch in one picture. It
  **dissolves** at the cut (`mask-image`, the one mask on the site, and not a
  decorative fill): a hard edge there reads as the next section landing on top
  of the hero rather than as a screen carrying on past the fold. `.lift`
  leans it back and stands it up as you scroll, driven by `scroll(root block)`
  rather than `view()`: it is already in view at load, so a view timeline would
  have nothing left to run. No script, and flat under `prefers-reduced-motion`.
- **The landing page is one story, told in order.** `STORY` and `CLOSE` in
  `content.ts` hold the beats: the shop that grew, the parcels that came back,
  the half we built, the storefront, the work after the order. Sections are
  chapters with a chapter label, not a features index — if a change makes a
  section stop following from the one above it, the change is wrong.
- **Features are a bento wall, and every wall has a picture.** `.bento` with
  `.tile` / `.tile-wide` / `.tile-tall`; the first tile is wide and carries the
  screen. **The spans live on `.bento > .tile`, not on `.tile`** — a tile is
  just a surface, and one that silently claims two columns of whatever grid it
  lands in made every other call site remember `col-auto` to undo it.
- **The index is a table, not three lists.** `.index` is one grid with
  `grid-auto-flow: column` and fixed rows, so row four of the first column lines
  up with row four of the third and the cells share their rules. Three separate
  lists side by side leave ragged bottoms and gutters, which is what makes a
  summary look like leftovers.
- **A mockup is finished or it is not in.** Grey placeholder boxes read as a
  wireframe next to a hero that is a real screen: the storefront carries real
  product names, prices, colour swatches, a cart count and a category nav; the
  checkout carries a filled-in name, number and address, a chosen payment method
  and an order summary. If a screen would need lorem ipsum, it needs content
  instead.
- **The pictures are the product's own screens, drawn in the page.** `.screen`,
  `.screen-bar`, `.screen-row`, `.meter` and `.phone` build an order queue, a
  courier ranking, a reconciliation and a checkout out of real markup and real
  type. Drawn illustrations of parcels and vans read as clip art next to a
  product like this one; a screenshot of the actual interface does not.
- **The markets get a whole screen, and it is a globe.** `$lib/Globe.svelte`
  projects `MARKETS` orthographically onto a dot matrix of land (`$lib/land.ts`,
  generated once from Natural Earth 110m), over a graticule, with the two
  regions labelled and the hop between them drawn. It turns on its own, spins on
  drag, and swings to whichever market is picked. **Dots, not filled coastline:**
  orthographic puts both hemispheres on one disc, so polygons need the far side
  clipped and every visible run closed along the limb — two attempts at that arc
  filled the ocean instead of the land. A dot is either in front of the horizon
  or it is not drawn. The buttons under it are the accessible control and drive
  the same selection; the SVG is `aria-hidden`, so nothing depends on being able
  to point at a sphere.
- **The five chapters are a stack, not a list of sections.** Each `.stack-card`
  sticks under the header while the next slides over it, parked 14px lower than
  the one before, so the pile itself is the progress bar — with `01 / 05` and a
  filling rule on every card. `position: static` under `prefers-reduced-motion`.
  Two rules keep it working, and both were learned the hard way:
  **a card has to fit the screen** — `max-block-size: calc(100svh - header -
  offset)`, because a pinned card taller than the viewport can never be scrolled
  to the bottom of, and the next card starts covering it before it has been
  read. That is why the feature tiles live in their own section below the stack
  rather than inside a chapter. And **a sticky child only sticks while its
  container is on screen**, so `.stack` carries an `::after` spacer; without it
  the last card has no range left and scrolls past like an ordinary section
  while the four above it stack.
- **Motion is everywhere and never gates content.** Every page carries it, not
  just the landing page — an animated home page followed by a static pricing
  page reads as two different sites. `.reveal`, `.stagger` and
  `.rise` are scroll-driven (`animation-timeline: view()`) behind `@supports`;
  a block with shared borders (the index table) reveals as one piece — staggering
  its cells slides the rules apart;
  `.enter` is the one load animation, for the hero, which has no scroll to
  drive it yet. All of it sits behind `prefers-reduced-motion`.
- **The footer is revealed, not scrolled to.** `.page-body` is opaque and one
  layer above `.site-footer`, which is pinned to the bottom, so the last scroll
  slides the page off it. Pure CSS — no scroll listener, nothing to hydrate.
- **Motion follows the animation skills' standards** (`.agents/skills/animate`,
  `review-animations`). The ones that bite here: `ease-out` for anything
  entering, never `ease-in`; UI transitions under 300ms and hover feedback at
  ~160ms; hover motion gated behind `@media (hover: hover) and (pointer: fine)`,
  because a tap fires a false hover; stagger between 30 and 80ms; only
  `transform` and `opacity` animated; `:active` presses scale to 0.97; and
  reduced motion keeps the fade while dropping the travel rather than removing
  the feedback entirely.
- **`balance` for headings, `pretty` for prose, and never a `ch` value chosen to
  force a line count.** `.display` carries `text-wrap: balance` — it evens the
  line lengths of a short block and browsers ignore it past about six lines, so
  it belongs on headings and nowhere else. `body` carries `text-wrap: pretty`,
  which fixes the one-word last line without re-ragging the paragraph and has no
  line cap. The measure is `--measure-lead`, set by what is comfortable to read;
  how many lines that produces is a consequence of the viewport, not a target.
- **A reveal mask has to clear its own descenders.** `.mask-line` clips with
  `overflow: hidden`, so it carries `padding-block-end` with a matching negative
  margin — on the *box*, not the inner span, where the two cancel out and every
  y, g and p in a headline loses its tail.
- **Motion never gates content.** Scroll reveals are CSS `animation-timeline`
  behind `@supports`, so an unsupporting browser just shows the section. Never
  hide content behind a class that JavaScript has to remove — a failed
  hydration then leaves the page permanently blank.
- **Restraint is the look.** Flat surfaces, one hairline, one accent, and space.
  Elevation is the surface stack, never a shadow — never a `box-shadow`. No gradient fills, glows, grain, gradient borders or
  gradient text — stacking effects reads as trying, which is the opposite of
  expensive. If a change adds an effect rather than removing one, it is probably
  the wrong change.
- **Type is chosen per theme, and must cover the theme's script.** Mona Sans and
  Geist Mono are the admin's; Trench Slab, Chubbo and Tabular are
  marketing's; storefront themes pick their
  own — Hind Siliguri for Bengali, Cairo for Arabic. A Latin face with a system
  fallback for Bangla or Arabic is not acceptable. Self-host via `@fontsource`:
  the CSP has no external font origin, so Google Fonts will not load.
- **Use `Intl`** for every date, number and currency, and pass the store's own
  locale — never a default. A `bn-BD` fallback printed dirhams in Bengali digits
  on every Gulf shop. `moneyFor(store)` exists so a call site cannot forget.
- **Customer-written text is moderated before it is public.** Reviews and
  questions land pending and appear only once the merchant acts on them.
- **Permission checks belong on the server.** The sidebar hides what a role
  cannot do, but hiding is not enforcing — use `requirePermission` in the action.
- **User-facing text is plain language** — no jargon, no error codes, no stack
  traces. Every route handles 404, 500, network failure and empty state.
- **The logo is one mark, drawn once.** `$lib/Mark.svelte` — Fajr is dawn, so
  it is a sun breaking a horizon — with the same shape in `favicon.svg`, and the
  wordmark set in the display face. Two drawings of a logo drift.
- **The share card is a real image.** `static/og.png` at 1.9:1, referenced with
  an absolute URL built from `SITE_URL`: a relative `og:image` is ignored by
  every crawler that matters, and a link pasted into WhatsApp is how this site
  travels here.
- **Keep meta and Open Graph current for every route.** In `apps/marketing` that
  is `META` in `content.ts`; in `apps/web` a route returns `meta` from its load
  (`$lib/meta.ts`). The layout renders it — a page that writes its own
  `<svelte:head>` title emits a second `og:title` and breaks the share card.
- **Nothing user-facing hardcodes the shop's name, tagline or promises.** Every
  deploy is a different merchant; store name, tagline, announcement bar and
  support hours all come from settings.
- **CSP belongs to SvelteKit** (`kit.csp` in `vite.config.ts`), never a
  hand-written header — only SvelteKit can nonce its own hydration script. A
  hand-rolled `default-src 'self'` silently killed every bit of admin JS once.

- **Form controls are styled once**, in the storefront layout for the shop and
  `app.css` for the admin. A page that restyles its own inputs will drift.
- **Address is two dependent fields**, not one free-text box a courier has to
  guess at: a searchable first level and a second that lists only what belongs
  to it. `subAreasOf` and `hasSubAreas` in `@fajr/schemas` own that mapping.

- **Couriers, gateways and SMS come from the integrations table, not the
  environment.** `courierFor`, `providerFor` and `smsProvider` all read the
  merchant's saved config, so adding a provider is a new adapter plus a
  catalogue entry — never a redeploy. A test fails if the catalogue lists
  something no adapter can build.

- **The API is the product, not a wrapper.** Every storefront capability is a
  documented endpoint with a stable error code and a plain-language message; the
  spec comes from the same Zod the handler validates with, so it cannot drift.
  A client holds its cart by token — a mobile app has no cookie jar.

## The rest

- **Money is integer minor units.** Never a float, never a bare `price`.
  Currency travels with the amount on anything an order references.
- **Reads and writes are marked at the call site** — `db.read` / `db.write`.
- **`core` owns every write.** Route handlers call it; they never write SQL.
- **No correlated subqueries in Drizzle's `sql` template.** An interpolated
  column renders as a bare name and silently binds to the wrong table. Use a
  join and a group-by. This has caused three separate wrong-answer bugs here.
- **Side effects go through the outbox**, in the same transaction as the thing
  that caused them. Nothing calls SMS, a courier or an ad platform inline.
- **Anything external is idempotent** — a unique key and an upsert.
- **Logical CSS properties only** (`ps-`/`pe-`/`ms-`/`me-`, `text-start`), so
  Arabic needs no second pass.
- **Non-trivial logic leaves one runnable check behind.** Tests share one
  database, so DB-backed suites run with `--test-concurrency=1` and each suite
  deletes only the rows it created — never a `LIKE` sweep.
- **Verify by running it**, not by reading the diff. Typecheck passing is not
  evidence a page renders.
