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
- **Icons are Hugeicons** (`@hugeicons/svelte`), validation is **Valibot**,
  fonts are **Mona Sans** and **Geist Mono**. Never reach for another set.
- **Use `Intl`** for every date, number and currency. No hand-rolled formatters.
- **User-facing text is plain language** — no jargon, no error codes, no stack
  traces. Every route handles 404, 500, network failure and empty state.
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
