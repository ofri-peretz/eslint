# Data Table Philosophy

A focused sub-philosophy of [UX_PHILOSOPHY.md](./UX_PHILOSOPHY.md), expanding
principle #1 (Adoption is friction subtraction), #5 (Discoverability beats
memory), and #6 (Ease of use is performance) into the data-table surface.
Data tables are where SaaS dashboards live or die: a table that doesn't sort,
filter, paginate, or virtualize at scale is a table users actively avoid.

Pairs with [PAGINATION_PHILOSOPHY.md](./PAGINATION_PHILOSOPHY.md) (we already
codified URL-state pagination) and [LOADING_PHILOSOPHY.md](./LOADING_PHILOSOPHY.md)
(skeleton + retry contract).

---

## The core rule

> **Tables are a sort + filter + paginate + select + virtualize surface. All
> table state lives in the URL (`?sort=…&page=…&filter.status=open`). Rows
> render in ≤ 16ms with virtualization above ~50 rows. Selection is
> persistent across pagination. Loading / empty / error are first-class
> states, designed not absent.**

Three tests, in order:

1. **Refresh test.** Sort by a column, filter, paginate to page 3, refresh
   the browser. Does the same view return? If no, the table state isn't in
   the URL.
2. **Scale test.** Load 10,000 rows. Does the page render in under 100ms and
   scroll at 60fps? If no, virtualization is missing.
3. **Selection test.** Select rows on page 1, paginate to page 2, select
   more. Return to page 1. Are the original selections still checked? If no,
   selection isn't persistent.

---

## The 10 principles

Ordered by leverage.

### 1. State lives in the URL

Sort, filter, page, pageSize, column visibility, and grouping — all in the
query string per [DEEP_LINKING_PHILOSOPHY.md](./DEEP_LINKING_PHILOSOPHY.md).
The user can bookmark a filtered table, share it, refresh it.

| Concern              | URL shape                                    |
| -------------------- | -------------------------------------------- |
| Sort                 | `?sort=createdAt&dir=desc`                   |
| Multi-sort           | `?sort=status,createdAt&dir=asc,desc`         |
| Filter (single key)  | `?filter.status=open&filter.owner=ofri`      |
| Filter (multi-value) | `?filter.tag=red&filter.tag=urgent`          |
| Pagination           | `?page=3&pageSize=50`                        |
| Column visibility    | `?cols=name,status,owner` (allow-list)       |
| Grouping             | `?groupBy=status`                            |

Defaults stripped from URLs (URL philosophy R-3.2.5 / Deep-Linking #5).

### 2. Sorting is a column contract

Every sortable column declares `sortable: true` and its sort key (server-side
sort key, not the display name). Click toggles asc → desc → no-sort. The
table header shows the active sort direction with an arrow icon + screen
reader `aria-sort` attribute.

Multi-column sort is opt-in (shift-click), not default.

### 3. Filters are typed + composable

Each filter has a type (`text` / `select` / `dateRange` / `numberRange` /
`multiSelect`) that drives its UI primitive. The table accepts an array of
filter configs; the URL maps to them via the schema.

**Mechanics:**

- Filter state shape: `Record<filterKey, FilterValue>`.
- "Clear filter" affordance per filter + "Clear all" globally.
- Filter counts visible (`Status (3 active)`).

### 4. Pagination is classic, not infinite

Cross-link to [PAGINATION_PHILOSOPHY.md](./PAGINATION_PHILOSOPHY.md). Tables
default to **page-based pagination** with `page` + `pageSize` URL state.
Infinite scroll is forbidden on data tables — users need to bookmark page 3
and return.

Page-size options expose a small set: 10 / 25 / 50 / 100. `pageSize=100` is
the ceiling; larger requests go through bulk-export.

### 5. Selection is persistent across pages

Selecting rows on page 1, paginating to page 2, then returning: the page-1
selections survive. The selection state is keyed by row ID, not by index.

**Mechanics:**

- Header checkbox shows "select page" (default) or "select all matching
  filters" (opt-in).
- `aria-selected` on each row reflects state.
- The "selected" toolbar appears with sticky positioning above the table when
  selection > 0.

### 6. Virtualization above ~50 rows

Tables with more than ~50 rows virtualize via `@tanstack/react-virtual` or
equivalent. Below that threshold, full DOM is faster and simpler.

**Mechanics:**

- Fixed row height (or measured at first render).
- Sticky header survives scroll.
- Horizontal scroll for wide tables; pinned columns (left + right) are
  opt-in props, not the default.

### 7. Column resize + reorder is opt-in

Resizing and reordering columns are power-user features. Default tables
**do not** ship them. When opted in, the new widths/order persist via the
URL (`?cols=name,status:120,owner:200`).

This isn't free — column persistence + the headers' interactive layer cost
~5KB and add complexity. Default to off.

### 8. Loading / empty / error are first-class

Cross-link to [LOADING_PHILOSOPHY.md](./LOADING_PHILOSOPHY.md) and
[ERROR_PHILOSOPHY.md](./ERROR_PHILOSOPHY.md).

- **Loading:** skeleton rows matching the column layout, never a centered
  spinner. Skeleton row count matches expected pageSize.
- **Empty (no data ever):** illustration + "Create your first X" CTA.
- **Empty (filtered to nothing):** "No matches" + "Clear filters" CTA, not
  the same as no-data-yet.
- **Error:** inline error replacing the body with retry. Header + filters
  stay interactive; only the body re-fetches on retry.

### 9. Accessibility is a contract (cross-link to A11Y)

Cross-link to [A11Y_PHILOSOPHY.md](./A11Y_PHILOSOPHY.md).

- Semantic `<table>` with `<thead>` / `<tbody>` / `<th scope="col">`.
- Sortable columns expose `aria-sort` (`ascending` / `descending` / `none`).
- Row selection toggles announce ("Row 1 selected") via `aria-live`.
- Keyboard: arrow-key navigation between cells, Space to toggle selection,
  Enter to open the row (if applicable).
- Hit targets per A11Y §7 (≥ 24×24).

### 10. Build with the ecosystem

`@tanstack/react-table` for the headless table engine. `@tanstack/react-virtual`
for virtualization. Server-side sort / filter / pagination via the consumer's
API (the table itself doesn't fetch).

**Forbidden:**

- Hand-rolled virtualization.
- Client-only sort/filter on > 1,000 rows (push to the server).
- Table primitives that bundle a fetcher (the consumer owns data).

---

## How this gets used

When designing or reviewing a data table, ask:

1. Is all table state in the URL (sort / filter / page / cols / group)?
2. Are sortable columns declared with explicit sort keys + `aria-sort`?
3. Are filters typed, composable, with clear + clear-all affordances?
4. Is pagination classic with page + pageSize, no infinite scroll?
5. Is selection persistent across pagination, keyed by row ID?
6. Is virtualization wired above ~50 rows, at 60fps?
7. Are column resize/reorder opt-in, not default?
8. Are loading / empty / error states each designed (skeleton, two empty
   variants, inline error)?
9. Is the table semantic HTML with full keyboard + ARIA support?
10. Is the implementation built on `@tanstack/react-table` (or peer), not
    hand-rolled?

If any answer is no, the table is not yet shippable.

---

## Living document

When a table pattern arises this doc didn't anticipate, edit it first, then
ship.
