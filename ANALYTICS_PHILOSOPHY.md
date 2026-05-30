# Analytics Philosophy

A focused sub-philosophy of [DEEP_LINKING_PHILOSOPHY.md](./DEEP_LINKING_PHILOSOPHY.md)
and [UTM_PHILOSOPHY.md](./UTM_PHILOSOPHY.md), covering how a deployed surface
measures itself — what events get captured, how identity is stitched across
properties, how pageviews map to URLs, and how the journey contract stays
readable once it's running.

This document is the portable rulebook for product analytics in any property
we ship — the eslint docs site, the registry, the Nuxt blog, the landing page,
the storybook, future product front-ends. It distills the same concepts as
PostHog's published best-practices, with our own opinions where they were
under-specified.

**PostHog is named, not abstracted.** We use `posthog-js` directly in every
property; there is no shared wrapper package and no vendor-neutral interface.
The shared layer is this document plus the ESLint rules in
`eslint-plugin-conventions` that enforce naming and taxonomy. Each property
gets a small `lib/posthog.ts` (~30 lines) holding the opinionated init and a
`lib/utm.ts` (~40 lines) holding `buildUtmHref`. Duplication is intentional
— low maintenance, no cross-repo versioning, contracts enforced statically.

**PostHog is a platform, not just analytics.** One `posthog.init()` turns on
custom events, autocapture, pageviews, session replay (with default
masking), web vitals (`capture_performance`), exception capture
(`capture_exceptions`), feature flags, surveys, and experiments. The
principles below govern how those signals get configured; they do not
restrict which features are enabled.

---

## The core rule

> **One project measures every property. Events are typed and snake_case.
> Identity stitches across subdomains via cookie and across root domains via
> signed query-param hand-off. Pageviews fire on route change, exactly once.
> Journeys are only as readable as the URLs they cross.**

Three tests, in order:

1. **Single-project test.** Can a Path / Funnel in PostHog span
   `ofriperetz.dev` → `eslint.interlace.tools` → `ds.interlace.tools` without
   losing the person? If no, identity stitching is broken.
2. **Naming test.** Does `posthog.capture(…)` accept any string the developer
   types? If yes, the catalog will explode. Event names must come from a
   typed union, and the build fails on misspellings.
3. **Cold-load test.** A cold-loaded URL must fire exactly one `$pageview`
   with the destination URL, not the referrer's, and exactly one — never zero
   (SPA without manual capture) and never two (layout + page double-fire).
   Anything less makes cohort analysis lie.

---

## The 10 principles

Ordered by leverage. Earlier principles, when violated, do the most damage.

### 1. One project for every property

A single PostHog project measures all six properties (blog, landing, eslint
docs, serverless docs, design system, storybook). Each event carries an `app`
property identifying the source surface. Multiple projects look organised, but
they prevent the only analyses worth running — cross-property funnels,
attribution, return-visitor cohorts.

**Mechanics:**
- One `phc_*` project token, stored as `NEXT_PUBLIC_POSTHOG_KEY` /
  `NUXT_PUBLIC_POSTHOG_KEY` per app.
- Every `capture()` call adds `{ app: 'eslint_docs' }` (or the slug for the
  surface) via a default-properties hook at init time.
- Filter views by `app =` in saved insights; never split projects.

### 2. Reverse-proxy the ingest endpoint

Every property exposes `/ingest/*` as a same-origin proxy to PostHog. This
survives ad-blockers, keeps cookies first-party, and lets the existing strict
CSP stay strict (no third-party `connect-src` host to allowlist).

**Mechanics:**
- Next.js: `rewrites()` mapping `/ingest/:path*` →
  `https://us.i.posthog.com/:path*` (and `/ingest/static/:path*` →
  `https://us-assets.i.posthog.com/static/:path*`).
- Nuxt: equivalent `routeRules` proxy.
- `posthog.init({ api_host: '/ingest' })` — never the public PostHog host
  directly.

### 3. Three vendor-neutral primitives; events are typed

Every property exposes the same three primitives from `lib/analytics.ts`:

```ts
export function identify(distinctId: string, props?: Record<string, unknown>): void;
export function track<E extends TrackedEventName>(name: E, props: TrackedEventMap[E]): void;
export function pageview(url?: string, props?: Record<string, unknown>): void;
```

`identify` sets the canonical person id. `track` captures a typed business
event — the first arg is constrained to the per-property `TrackedEventMap`
union so `track('articless_clicked', …)` doesn't compile. `pageview` captures
a `$pageview` (defaults to the current URL).

```ts
export interface TrackedEventMap {
  'articles:card_click': { articleId: number; position: number };
  'articles:search_submit': { q: string; resultCount: number };
  // …
}
```

**Mechanics:**
- The existing `apps/docs/src/lib/analytics.ts` is the canonical pattern for
  the typed event channel — extend it, don't replace it. Each property owns
  its own `TrackedEventMap` because events are app-specific.
- Add new events by editing the map first; the call site is forced to follow.
- The `posthog-js` instance is re-exported from `lib/posthog-init.ts`; consumers
  can call any PostHog method directly (feature flags, surveys,
  `posthog.capture(...)`) — the typed `track()` exists for the catalogue, not
  to gate access.
- The `conventions/analytics-event-naming` ESLint rule enforces principle 4
  (naming grammar) across every call shape — bare `track()`, `.capture()`
  (PostHog), `.track()` (Segment / Mixpanel / Amplitude). `.identify()` is
  exempt — its first arg is a person id, not an event name.

### 4. Naming: lowercase, snake_case, `category:object_action`

A fixed grammar makes events findable in the catalog three months later.

| Slot     | Rule                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Category | Surface or feature (`articles`, `homepage`, `rule_page`, `signup_flow`)                               |
| Object   | The thing that was acted on (`card`, `search`, `subscribe_button`)                                    |
| Action   | A verb from the fixed list: click, submit, view, add, remove, start, end, generate, send, cancel, fail |

`articles:card_clicked`, `homepage:hero_cta_clicked`, `rule_page:viewed`.

**Forbidden:**
- Past-tense verbs (`articles:cards_were_clicked`).
- Free-form action names outside the fixed list.
- Interpolated event names (`` `page_viewed_${slug}` ``) — destroys the
  catalog; put the slug in a property instead.

### 5. Person properties on the person, event properties on the event

Person properties (`$set`, `$set_once`) describe the person: locale, primary
surface, first referrer, internal-user flag. Event properties describe the
event: which card, which query, which placement. Mixing the two — putting the
active query on the person — overwrites itself and loses history.

**Mechanics:**
- `$set_once` for first-touch (first source, first landing page, first
  campaign, **first inferred visitor profile**).
- `$set` for current-state (preferred theme, locale, last-seen app,
  **last inferred visitor profile**, depth counters).
- Everything else lives on the event.

**Visitor-profile inference.** On the first `$pageview`, each property
classifies the visitor into a fixed vocabulary — `developer`,
`engineering_leader`, `recruiter`, `investor`, `founder`, `student`,
`curious`, `unknown` — from referrer, `utm_source`, and landing path. The
result is `$set_once`d as `first_visitor_profile`; depth signals (3+ rule
pages = confirmed developer, 3+ philosophy pages = confirmed
engineering_leader) `$set` a `confirmed_profile` once the threshold is
crossed. Ambiguous signals default to `unknown` rather than guessing
wrong — bad inference poisons every cohort downstream.

### 6. Pageview fires on route change, exactly once

SPAs do not fire a browser pageview between client-side navigations. Capture
`$pageview` manually on every route change — but exactly once. Firing twice
(layout + page, or router-listener + manual call) collapses Funnel
conversions; firing zero times produces a session with clicks but no
container.

**Mechanics:**
- Next App Router: capture in a single client component mounted at the root
  layout, reading `usePathname()` + `useSearchParams()`. Disable PostHog's
  default `capture_pageview: true`.
- Nuxt: `nuxt-posthog`'s built-in router integration; disable any duplicate
  manual capture.
- Storybook: capture on the manager's `STORY_RENDERED` channel event; do not
  capture inside the preview iframe (per-story volume blow-up for no signal).

### 7. URL normalisation before send

`$current_url` is normalised before send: strip consumed `utm_*` params,
strip `ph_distinct_id`, sort remaining query keys. Without normalisation,
Paths and Funnels split the same page into N URL variants and no aggregate
exists.

**Mechanics:**
- Implemented in a `before_send` interceptor in `posthog.init`.
- Sticky params from URL_PHILOSOPHY principle 9 (debug flags, feature-flag
  overrides) are preserved.
- The strip happens in the captured payload only; the address bar handles
  its own UTM cleanup (see UTM_PHILOSOPHY principle 3).

### 8. Identity stitches across subdomains by cookie, across roots by query

Within `*.interlace.tools`, PostHog's `cross_subdomain_cookie: true` + cookie
domain `.interlace.tools` gives one anonymous `distinct_id` for the full
subdomain set. Across `ofriperetz.dev` ↔ `interlace.tools` (different
eTLD+1, no shared cookie), outbound links append `?ph_distinct_id=<current_id>`
and the landing handler calls `posthog.identify(id)` if the local anon id
differs.

**Mechanics:**
- `buildUtmHref()` from UTM_PHILOSOPHY appends `ph_distinct_id` automatically
  on cross-eTLD+1 outbound.
- Landing handler runs once on `$pageview` capture — reads the param, calls
  `identify`, then strips it via `replaceState`.
- Authenticated users (newsletter signup, etc.) get
  `posthog.identify(<hashed_email>)` — canonical ID supersedes the anon
  merge.

### 9. Respect DNT, GPC, and the internal-user filter

Tracking that ignores user preference burns trust faster than it earns
insight. This rule applies to every signal PostHog captures — custom events,
autocapture, pageviews, replay, web vitals, exceptions.

**Mechanics:**
- `navigator.doNotTrack === '1'` and
  `navigator.globalPrivacyControl === true` short-circuit `init` — PostHog
  never loads, nothing captures.
- **Local environment short-circuit.** When `window.location.hostname` is
  `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, or ends in `.local` /
  `.localhost`, `init` is skipped by default. Without this, every
  `pnpm dev` / `npm run dev` session would pollute production cohorts and
  funnels. To intentionally exercise the integration locally, set
  `localStorage.interlace_local_analytics = '1'` and reload — the
  short-circuit lifts for that browser only.
- Internal users mark themselves via `localStorage.interlace_internal = '1'`
  (set by a hidden setup page), which `$set`s `is_internal_user: true` on
  the person; every saved insight filters it out.
- Session replay is enabled by default with PostHog's default masking
  (`maskAllInputs: true`, `maskTextSelector: '*'` on sensitive surfaces).
  Per-property opt-out is via `session_recording: { enabled: false }` in
  that property's `lib/posthog.ts`.
- Sensitive surfaces (auth forms, payment forms when they exist) MUST add
  `data-ph-no-capture` to the form and `data-ph-mask` to inputs.

### 10. Frontend for journeys, backend for counts

Frontend events are best at sequences and intent (what was clicked, in what
order, from what referrer). Backend events are best at accurate counts (npm
installs, newsletter signups, API calls) — they're not lost to ad-blockers
and they fire even when the tab is closed mid-action. Don't ask the frontend
to be the source of truth for billable counts; don't ask the backend for the
click path that led to it.

**Mechanics:**
- Frontend captures `signup_flow:submit_clicked` (intent).
- The backend `/api/signup` captures `user_signed_up` (confirmation) with the
  same `distinct_id` propagated from the request header.
- Reports that mix the two cite both source events explicitly.

---

## How this gets used

When designing or reviewing an analytics integration, ask:

1. Does one project measure every property, with `app` on every event?
2. Does the property's ingest go through a same-origin reverse proxy?
3. Are event names a typed union, with `category:object_action` grammar?
4. Are person properties used for person state, event properties for event
   state?
5. Does `$pageview` fire exactly once per route change?
6. Is `$current_url` normalised before send?
7. Does identity stitch across `.interlace.tools` subdomains by cookie and
   across roots by query?
8. Are DNT, GPC, and the internal-user filter respected?
9. Are frontend events used for sequences and backend events for counts?
10. Does the rollout include a regression-lock test that the provider wraps
    every layout's root?

If any answer is no, the integration is not yet shippable.

---

## Living document

When an analytics pattern arises this doc didn't anticipate, edit it first,
then ship. Drift between principle and practice is the failure mode — and
analytics drift is invisible until a funnel returns nonsense numbers six
months later.
