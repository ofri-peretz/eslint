# Error & Empty-State Philosophy

A focused sub-philosophy of [UX_PHILOSOPHY.md](./UX_PHILOSOPHY.md), expanding
principle #1 (Adoption is friction subtraction) into the failure path. Most
products are judged by their happy paths and saved by their error paths. An
error state that names the cause, names the fix, and preserves state is
indistinguishable from a feature; an error state that says "Something went
wrong" is indistinguishable from a bug.

Pairs with [LOADING_PHILOSOPHY.md](./LOADING_PHILOSOPHY.md): loading,
error, and empty are the three states every async surface owes the user.

---

## The core rule

> **Every async surface owns five states — idle, loading, success, empty,
> error — and every one is designed. Errors name the cause and the fix.
> Empties teach the next action. Retry preserves context. CLS=0 across all
> state transitions.**

Three tests, in order:

1. **Can the user act on this error?** If the message doesn't suggest *what to
   do*, rewrite it. "Failed to load" is half a message.
2. **Does the empty state teach the next step?** A blank list is a missed
   teaching moment. Empty is the friendliest place to onboard.
3. **Does retry preserve the world?** State that vanishes on retry is the
   regression. Form fields, scroll position, filters, selections — all persist.

---

## The 10 principles

Ordered by leverage.

### 1. Error boundary at every async seam

Every component that fetches data, mounts a portal, or runs effects sits
behind an error boundary. The default `<ErrorBoundary>` catches and renders a
"something went wrong + retry" surface; specialized routes can override.

**Mechanics:** Wrap any `Suspense` boundary in an `ErrorBoundary`. React
error-boundary contract: `componentDidCatch` or `useErrorBoundary` from
react-error-boundary.

### 2. Error messages name cause and fix

Two lines minimum:

| Line       | Owns                                                            |
| ---------- | --------------------------------------------------------------- |
| Cause      | What happened, in user terms                                    |
| Fix        | What to do — action label, retry button, or link to help        |

| ❌                          | ✅                                                                       |
| --------------------------- | ------------------------------------------------------------------------ |
| "Something went wrong"      | "We couldn't reach the server. Check your connection and try again."     |
| "Error 500"                 | "Our server hit an unexpected error. The issue has been reported."       |
| "Invalid"                   | "This email is already registered. Sign in instead?"                     |

### 3. Empty is a first-class state

Empty is not the absence of design; it's the most teachable state. A "no
items yet" screen is the best onboarding surface — the user is engaged,
attentive, and one click away from their first success.

**Mechanics:**
- Empty state has: illustration / icon, headline, body explaining what fills
  this surface, primary CTA to fill it.
- "Filtered to nothing" is a *different* empty: headline names the active
  filter, primary CTA is "Clear filters."
- "Permission denied" is a *different* empty: explains why, links to docs or
  support.

### 4. Retry preserves the world

When the user retries — explicitly via a button or implicitly via a network
recovery — all state survives. The form they were filling, the scroll position
they were at, the filters they applied, the row they had selected.

**Mechanics:**
- Mutations stash the request payload before sending; retry replays it.
- Queries cache the last good response and show it under a "stale" badge
  during retry.
- React Query / SWR: `keepPreviousData: true` and `retry: 3` on transient
  errors.

### 5. Error surface taxonomy

Pick the right surface for the failure scope:

| Scope                 | Surface                                                   |
| --------------------- | --------------------------------------------------------- |
| Page-level (route)    | Full-page error component with retry CTA                  |
| Section-level (card)  | Inline error replacing the section content                |
| Field-level (form)    | Per-field error message under the input                   |
| Action-level (button) | Toast / status pill near the button; button unblocks      |
| Background            | Telemetry-only — never interrupt the user                 |

A 500 on a background mutation should not toast every screen.

### 6. Loading is not error; show both

If you don't differentiate "loading" from "errored", the user can't tell
slow-network from broken-API. Three states minimum: `loading | error | empty
| success`. Skeleton during loading; explicit error after a timeout (3s for
most surfaces, 10s for heavy ones).

**Mechanics:** see [LOADING_PHILOSOPHY.md](./LOADING_PHILOSOPHY.md) for the
skeleton contract.

### 7. Error message tone is neutral, not apologetic

Apologies in error UI ("So sorry!", "Oops!") are a tax on the user's time.
State the cause; offer the fix; move on. Reserve apologies for
account-level / billing-level failures where empathy is actually due.

| ❌                                  | ✅                                                       |
| ----------------------------------- | -------------------------------------------------------- |
| "Oops! Something went wrong :("     | "We couldn't load that. Try again or report the issue." |
| "Sorry for the inconvenience"       | "Service paused for maintenance. Back at 15:00 UTC."     |

### 8. Stack traces stay in dev tools

Production users never see a stack trace. Errors carry a `correlationId` the
user can copy + paste into a support form; the trace lives in observability
tooling.

**Mechanics:** Sentry / Datadog / equivalent captures the trace; UI displays
only `correlationId`.

### 9. CLS=0 across transitions

Loading → error → success must not shift adjacent content. Reserve space
matching the destination geometry. Skeletons match exact dimensions;
error/empty surfaces match too.

**Cross-link:** [LAYOUT_PHILOSOPHY.md](./LAYOUT_PHILOSOPHY.md) §6 *Reserve
space; never let content jump*.

### 10. Build with the ecosystem

`react-error-boundary` for boundary primitives. `@tanstack/query` or
`swr` for query/mutation state and retry policy. Sentry / Datadog for
observability. We don't ship a "smart" error-state library — we ship error
component primitives that compose into those.

---

## How this gets used

When designing or reviewing an async surface, ask:

1. Is there an error boundary at the right level?
2. Does every error message name cause AND fix?
3. Is the empty state designed as a teaching moment?
4. Does retry preserve state?
5. Is the error surface scoped correctly (page / section / field / action)?
6. Is loading visually distinct from error and from empty?
7. Is the tone neutral, not apologetic?
8. Does the user see a `correlationId`, never a stack trace?
9. Is CLS=0 across all state transitions?
10. Does the implementation reach for `react-error-boundary` + a query lib,
    not invent its own?

If any answer is no, the surface is not yet shippable.

---

## Living document

When a failure pattern arises this doc didn't anticipate, edit it first,
then ship.
