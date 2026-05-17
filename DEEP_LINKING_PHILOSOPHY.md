# Deep-Linking Philosophy

A focused sub-philosophy of [URL_PHILOSOPHY.md](./URL_PHILOSOPHY.md) and
[UX_PHILOSOPHY.md](./UX_PHILOSOPHY.md), expanding principle #2 ("Every URL is a
contract") into the SPA + router surface. A URL only counts as a contract if a
fresh tab pasted with that URL renders the same view as one navigated to from
inside the app. Anything less is broken deep linking.

This document is the portable rulebook for routing in any SPA we ship — apps
under `apps/`, the docs site itself, any future product front-end. It distills
the same concepts that the `snappy-client-dashboard` deep-links specification
codifies in RFC-2119 form, scoped to what's universal across React /
TanStack-Router / Next-Router consumers.

---

## The core rule

> **Every route is a contract. A URL pasted into a fresh tab MUST render the
> same view as one reached by internal navigation. Identity lives in the path,
> state in the query, scroll/tab in the fragment. Default values never appear
> in URLs. URLs never name imperatives.**

Three tests, in order:

1. **Cold-load equivalence.** Open the URL in a new browser tab. Does it
   render the same view as the in-app navigation? If no, the route is broken.
2. **Component placement.** Is resource identity in the path, filter / sort /
   view state in the query, scroll / tab in the fragment? Mixing roles is the
   most common bug.
3. **Imperative test.** If a link checker / prefetcher / Slack unfurl GETs
   this URL, does anything irreversible happen? If yes, the URL is
   non-conforming regardless of the path name. Mutations belong in the API,
   not the URL.

---

## The 10 principles

Ordered by leverage. Earlier principles, when violated, do the most damage.

### 1. Cold-load equivalence is non-negotiable

A user pasting any deep link into a fresh tab is the canonical test of
conformance. If the cold-loaded route renders an empty state, a 404, or a
"sign in to continue" interstitial that loses the destination, the contract is
broken.

**Mechanics:**
- The router must hydrate from the URL on initial render, not from
  app-internal state.
- Auth interstitials must capture the destination URL and resume after sign-in.
- Required data for the route must be fetched on cold load, not assumed
  pre-populated by an earlier in-app navigation.

### 2. History API only — no hash routing

`#/path`-style hash routing breaks SSR, breaks Twitter/LinkedIn unfurls,
breaks server-side analytics, and breaks any tool that reads the URL on the
server. Use `pushState` / `replaceState`.

The exception: in-page anchor jumps (`#section-id`) for scroll targets — these
are fragments, not routes.

### 3. URL components carry distinct roles

Each component owns a specific job. Mixing roles is the canonical bug.

| Component | Owns                                            | Example                  |
| --------- | ----------------------------------------------- | ------------------------ |
| Path      | Resource identity + hierarchy                   | `/projects/42/tasks/99`  |
| Query     | Filters, sorting, pagination, view-toggle state | `?status=open&sort=date` |
| Fragment  | Client-only state, scroll target, tab selection | `#comments`              |

`/projects?id=42` puts identity in the query — non-conforming. `/projects/42`
puts it in the path — conforming. Fix by moving the part to the right column.

### 4. URLs name resources, never imperatives

A path segment that reads as an action (`/delete`, `/promote`, `/refund`)
fails the imperative test — a prefetcher hitting the URL would imply the
action. Mutations belong to the API verb (POST / PATCH / DELETE), not the
URL grammar.

Named **views** are fine: `/projects/42/edit` is a dedicated edit *page* that
doesn't mutate on visit. The test: *does refreshing this URL break anything?*

### 5. Default values never appear in URLs

If the default sort is `created_desc`, the URL with no `sort` parameter renders
identically. The app **does not** auto-populate the default into the URL on
nav.

Defaults in the URL produce false "this view is configured" signals, double
the surface for caching / sharing, and make A/B-test attribution impossible.

### 6. Query parameters are order-independent

`?a=1&b=2` and `?b=2&a=1` produce identical views. Routers and `URLSearchParams`
guarantee this — the bug is usually in app code that compares URLs as strings.

**Mechanics:**
- Compare URLs as parsed objects, not as raw strings.
- Sort query parameters on canonical-URL construction (`<link rel="canonical">`).
- The shareable-URL contract: take the current URL → normalize keys to sorted
  order → that's the link to copy to the clipboard.

### 7. Booleans are present-or-absent (or `on`/`off`)

A flag with a true / false binary uses presence:

```text
/projects?archived       # archived = true
/projects                # archived = false (default)
```

When a third state is meaningful (explicit-off vs not-set), use `on` / `off` —
not `true` / `false` / `1` / `0`. `on`/`off` reads correctly in screenshots,
doesn't conflict with numerics elsewhere in the same URL, and aligns with
existing conventions like `?mode=preview`.

### 8. Identifiers — slug + ID, ID authoritative

A user-facing URL that includes a human-readable slug (`/projects/42-quarterly-review`)
is more shareable than an opaque ID (`/projects/42`). When both appear, **the ID
is authoritative**. Visiting `/projects/42-old-slug` resolves correctly and 301s
to the current slug.

This protects against rot when titles change and against link death when slugs
get rewritten.

### 9. Sticky parameters survive navigation

Some parameters represent global state — debug flags, experiment variants,
feature-flag overrides, locale switches. Navigation within the app **preserves**
them; only an explicit user action removes them.

**Mechanics:**
- Maintain a known sticky-key registry.
- Internal links that build URLs append sticky keys automatically.
- Removing a sticky parameter is an explicit "Reset" action.

### 10. Build with the ecosystem

React Router 7 / TanStack Router / Next App Router for the router. JSON Schema
(draft-07 or later) for the URL state contract. URL helpers
(`parseUrlFields` / `buildUrlFields`-shape API) for the construction-and-parsing
layer.

**Forbidden:**
- Hand-built URL strings via template literals (`` `/path?key=${value}` ``)
  for app-owned routes — they bypass encoding, defaults stripping, and the
  schema.
- Two parallel routing layers (router + manual `history.pushState`).
- "Smart" routing libraries that introduce their own URL grammar.

---

## How this gets used

When designing or reviewing a route, ask:

1. Does cold-load render the same view as internal navigation?
2. Is the router History-API-based, not hash-based?
3. Is identity in the path, state in the query, scroll/tab in the fragment?
4. Does any path segment read as an imperative?
5. Are defaults stripped from URLs?
6. Are query parameters order-independent on comparison?
7. Are booleans present-or-absent (or `on`/`off` when explicit)?
8. Are slugs paired with an authoritative ID?
9. Are sticky parameters preserved across navigation?
10. Does the router stack use a real router (no hand-built URL strings)?

If any answer is no, the route is not yet shippable.

---

## Living document

When a routing pattern arises this doc didn't anticipate, edit it first, then
ship. Drift between principle and practice is the failure mode — and bookmarks
are where the rot becomes visible.
