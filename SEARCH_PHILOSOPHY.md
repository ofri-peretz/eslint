# Search Philosophy

A focused sub-philosophy of [UX_PHILOSOPHY.md](./UX_PHILOSOPHY.md),
expanding Principle #1 (friction subtraction) and Principle #5
(discoverability beats memory). Search is the **first navigation
mechanism** for power users on a technical site — they hit `/`
before they read the sidebar. Top-1% sites have search you reach for
*instead of* Google, because it returns the right answer faster than
the SERP can.

This document binds: what's indexed, how results rank, the keyboard
contract, and the rules that distinguish "search" from "find-in-page."

---

## The core rule

> **Search is the navigation primitive for readers who already know
> what they want.** It must be faster than scrolling, faster than
> clicking through the sidebar, and faster than Google. If any of
> the three is faster, the reader stops using us.

Three corollaries:

1. **Latency budget: < 100ms from keypress to first results.** This
   is the INP target for the search surface. Anything slower feels
   broken.
2. **Index everything readers might type, including the things we
   don't think of as content.** Rule names, CWE codes, OWASP codes,
   article titles, plugin names, headings, types, error messages.
3. **Surface metadata in results, not just titles.** The
   discriminator between "the right SQL injection rule" and "the
   wrong one" is the CWE code visible in the autocomplete row.

---

## What's indexed

The full surface area:

| Document type | Title source | Body source | Metadata in result |
| --- | --- | --- | --- |
| **Rule page** | Rule name (`no-none-algorithm`) | First paragraph + headings | Plugin name, severity, CWE, OWASP, fixable badge |
| **Plugin page** | Plugin display name | Tagline + rule count | Install count, GitHub stars, version |
| **Article** | Article title | Description + first paragraph | Tags, reading time, published date |
| **Heading** (in any doc) | Heading text | First paragraph after | Parent page title (breadcrumb) |
| **Type definition** | Type name | JSDoc comment | Module path, kind (interface/type/class) |
| **Tag page** | `#jwt`, `#security`, ... | List of matching items | Item count |
| **CWE / OWASP page** | `CWE-798: Use of Hard-coded Credentials` | Description | Matching rule count |
| **Changelog entry** | Version + date | First paragraph | Plugin, breaking-change badge |

The index is **regenerated at build time**. No runtime indexing, no
fetch-on-keystroke. The static JSON ships with the site (gzipped to
~80KB max — index size is its own budget).

---

## Result ranking

A reader who types `sql` should get, in order:

1. **Exact-name matches** — a rule literally named `no-sql-injection`
2. **Title prefix matches** — articles titled "SQL Injection
   Prevention..."
3. **Tag matches** — anything tagged `#sql`
4. **CWE / OWASP code matches** — CWE-89 (SQL Injection)
5. **Body matches** — paragraphs mentioning SQL

Within each tier, secondary sorts:

- **Rules** beat articles beat headings (specificity wins; readers
  searching technical sites want the canonical answer first).
- **Higher-traffic pages** beat lower-traffic (when telemetry is
  available) — recency-decayed.
- **Newer over older** when content is otherwise equivalent (a
  three-year-old article on the same topic ranks below a recent one).

The ranking algorithm is **explicit and testable**, not an opaque
similarity score. A `ranking.test.ts` golden-file test holds the
top-5 result for ~30 canonical queries; changes to the ranking
function require the golden file to update.

---

## The keyboard contract

A power-user surface. Every action keyboard-accessible.

| Key | Action |
| --- | --- |
| `/` (slash) | Open search from anywhere |
| `Cmd+K` / `Ctrl+K` | Same; macOS / Windows convention |
| `Esc` | Close search; if results focused, return to input |
| `↑` / `↓` | Navigate results |
| `Enter` | Open the focused result |
| `Cmd+Enter` / `Ctrl+Enter` | Open in new tab |
| `Tab` | Move to facet filters (rule / article / tag) |
| `Shift+Tab` | Reverse |

The slash key is the universal trigger. **Forbidden** to override `/`
when the focus is in a textarea/input — let the field consume it.

The search surface is a portal-rendered modal, focus-trapped. When
closed, focus returns to the element that opened it.

---

## Result row anatomy

What a result row looks like:

```
+---------------------------------------------------------------+
| 🛡  jwt/no-none-algorithm                              [CWE-327]|
|    Reject JWT verification with the "none" algorithm.          |
|    Plugin: @interlace/eslint-plugin-jwt   Severity: error      |
+---------------------------------------------------------------+
```

Mandatory parts:

- **Type icon** (24×24, semantic — shield for security rule, book for
  article, hash for tag). Color from the COLOR_PHILOSOPHY status
  tokens where applicable.
- **Title** (highlighted matching characters in `mark` element with
  brand-accent background).
- **One-line description** (line-clamped at 1 line on desktop,
  2 lines on mobile).
- **Metadata row** — at minimum the source (plugin/article/etc.),
  plus discriminating attributes (CWE for security rules, tags for
  articles).
- **Right-aligned badge** (CWE code, severity level, version
  number) — the *most-distinguishing* piece of metadata for the
  type.

Forbidden parts:

- Avatar / author photo (visual noise; reader chose by relevance,
  not by author)
- Date for non-time-sensitive content (rules don't have dates;
  articles do)
- Snippet / excerpt longer than one line (kills scan-ability;
  keep it tight)

---

## Faceted filters

In the search modal, optional filters narrow the index:

- **Type**: rules / articles / tags / changelog (multi-select)
- **Plugin**: filter to a specific plugin's surface
- **Tags**: any tag from the indexed set (multi-select)
- **CWE / OWASP**: scoped to security rules

Filters are URL-shareable. `/search?q=jwt&type=rule` is a real route
that opens the search surface pre-filtered. Aligns with
URL_PHILOSOPHY's contract: search state is in the URL.

---

## Empty / zero / many states

Three explicit states with designed copy:

### Empty (input is blank)

- "What are you looking for?" prompt, large.
- "Recent" section listing the last 5 queries from `localStorage`.
- "Popular" section listing the top 5 most-clicked results
  site-wide (refreshed via build-time analytics).
- One-line keyboard hint: "Press `↑` `↓` to navigate, `Enter` to
  open."

### Zero results

- "No results for `<query>`" with the query in code style.
- "Try" suggestions:
  - Spelling alternatives (Levenshtein distance ≤ 2).
  - Tag pages that exist with similar names.
  - "Browse all rules" / "Browse all articles" as fallbacks.
- "Or open an issue" with a link to GitHub — readers searching for
  things we don't have are *the highest-value signal we have* for
  what to write next. Treat them like beta testers, not failures.

### Many results

- Show top 8 by default, with "Show all N" (replace N with the count) if there are more.
- Show a result count at the top: "12 rules · 4 articles · 7 headings."
- Group by type when the type counts differ; flat list when
  ratios are similar.

---

## Build vs. adopt

Search is the area where we follow Principle #11 ("build with the
ecosystem") to the letter:

**Adopt**: Algolia DocSearch (free for open-source projects). Reasons:

- Index runs on Algolia infrastructure — no maintenance.
- Sub-50ms median latency from anywhere in the world.
- Fumadocs ships first-class DocSearch integration.
- Real-time index updates via crawler.
- Free for OSS docs sites — the canonical setup.

**Don't reinvent** unless DocSearch genuinely can't do the job.
DocSearch can do everything in this document except some advanced
ranking customizations; those exceptions justify a wrapper, not a
replacement.

**Wrap, don't replace**: our `<SiteSearch>` component wraps
DocSearch with:

- Custom result row template (the anatomy above with our metadata).
- The result-ranking weights from `ranking.test.ts`.
- The faceted filter strip.
- Our brand chrome.

The DocSearch crawler config (`docsearch.json`) lives in the repo
and is part of the deployment pipeline, not a separate concern.

---

## Mobile

A second-class citizen on mobile if we're not careful — most search
modals are desktop-keyboard-driven.

- **Trigger**: search icon in the top chrome, ≥ 44×44 touch target.
- **Modal becomes full-screen** on viewports < 640px.
- **Onscreen keyboard does not cover results** — modal positions
  results above the keyboard via `viewport-fit=cover` + sticky
  input.
- **Recent searches surface immediately** on tap (not after a
  keystroke). On mobile, the reader is more likely to want
  "where I was" than "what I'll type next."
- **Tap-and-hold on a result** opens in a new tab; on desktop
  this is `Cmd+Click` or `Cmd+Enter`.

---

## Telemetry

What we measure (privacy-respectingly):

- **Search usage rate**: opens / sessions. Target: > 30%.
- **Search-result CTR**: clicks / opens. Target: > 70%.
- **Click-through depth**: which rank position is most clicked.
  Tells us where ranking is wrong.
- **Zero-result queries**: a content backlog. The 50 most-frequent
  zero-result queries become the docs roadmap.
- **Cmd+K vs `/` vs icon-tap split**: tells us how power-user our
  audience is.

No PII, no IP collection. Aggregated, daily.

---

## What's forbidden

Hard bans.

- **Search that fetches per keystroke from an API.** Index is static
  and client-side; latency budget is < 100ms. No round trips.
- **Search results without metadata.** A list of titles is not
  enough. The reader must see *why* a result is the right one before
  clicking.
- **Live-updating result list as the reader types each character
  with no debounce.** Debounce 80-120ms. Below 80ms is jittery; above
  120ms feels laggy.
- **Search that hides on focus loss without explicit close.** Lose
  the modal because you tabbed to grab a value from elsewhere → bad.
  Modal stays open until `Esc` or backdrop click.
- **Result rows of variable height.** Each row is the same height
  (CLS=0 on result-list updates).
- **Image thumbnails in search results.** Latency-expensive,
  rarely-discriminating, accessibility-hostile.

---

## Implementation in this codebase

- **`<SiteSearch>`** in `@interlace/ui/blocks/search/` — the modal
  primitive. Wraps DocSearch.
- **`docsearch.json`** at the repo root — the crawler config (which
  pages to index, which selectors are titles vs. body, facet
  metadata).
- **`ranking.test.ts`** in `apps/docs/src/__tests__/` — golden-file
  test for the top-5 result of canonical queries.
- **Build-time index extraction** from rule MDX files: each rule
  page emits `{ title, plugin, cwe, owasp, severity, fixable, body }`
  to a JSON consumed by DocSearch.

---

## How this gets used

When adding or reviewing a search-surface change, ask:

1. **Latency**: < 100ms keypress → first results?
2. **Indexed**: is the new content type indexed at build, with the
   right title/body/metadata fields?
3. **Result row**: shows discriminating metadata, not just title?
4. **Keyboard**: works without a mouse; `/`, `↑/↓`, `Enter`,
   `Cmd+Enter`, `Esc`?
5. **Empty/zero/many states**: each has designed copy and next-action
   suggestions?
6. **Mobile**: full-screen modal, tap-friendly, recent searches
   surface immediately?
7. **Ranking**: are the canonical queries' top-5 results captured in
   the golden test?

If any answer is no, the surface is not yet shippable.

---

## Living document

Search is the surface that drives the long-tail of how readers find
us — every new content type that ships needs an index entry. When
something new ships without one, **edit this document first** to bind
the contract, then ship.
