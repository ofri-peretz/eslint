# Keyboard Philosophy

Every page on this site must be fully operable with a keyboard alone — no
mouse, no trackpad, no touch. Keyboard users include power users (faster
than the mouse), screen-reader users (Tab is the primary navigation
verb), users with motor impairments who can't use a pointing device, and
users on transient input contexts (laptop on a plane, projector remote,
KVM-switched workstation). **If a feature is unreachable by keyboard, it
doesn't exist.**

This document is the sibling of [`UX_PHILOSOPHY.md`](UX_PHILOSOPHY.md),
[`CTA_PHILOSOPHY.md`](CTA_PHILOSOPHY.md), and
[`MOTION_PHILOSOPHY.md`](MOTION_PHILOSOPHY.md) — principles ordered by
**leverage**, each backed by **Mechanics** (what to do) and **Measure**
(how we know).

If you're about to ship an interactive control and can't point to the
principle behind its keyboard behavior, reconsider.

---

## 1. Every page has a skip link as its first focusable element

A keyboard user landing on `/` should be one Tab + Enter away from the
hero content — not 12 Tabs through the nav, search button, theme toggle,
sidebar, and breadcrumbs. The skip link is the single highest-leverage
keyboard affordance on the site.

**Mechanics**

- **First child of `<body>`.** Lives in
  [`apps/docs/src/app/layout.tsx`](apps/docs/src/app/layout.tsx) before
  `<RootProvider>`. Source-locked by
  [`apps/docs/src/__tests__/keyboard-affordances-lock.test.tsx`](apps/docs/src/__tests__/keyboard-affordances-lock.test.tsx).
- **Visually hidden until focused.** Use `sr-only focus:not-sr-only` so
  the link doesn't pollute layout but appears as a high-contrast brand
  pill the moment a Tab press lands on it.
- **Targets a stable id.** Always `href="#main-content"`. Every page
  exposes that id on its `<main>` landmark — or, when fumadocs renders
  `<main>` for us (home, articles), on a `<div id="main-content"
  tabIndex={-1}>` immediately inside.
- **The target must be programmatically focusable.** `tabIndex={-1}` is
  required so `location.hash = "#main-content"` actually moves focus
  there; without it the URL hash updates but focus stays on the skip
  link.

**Measure**: lock test asserts the skip link exists in the layout source
and that `id="main-content"` exists on every page's outermost wrapper.
Manual: with Safari Full Keyboard Access on, the FIRST Tab press on `/`
must reveal the skip pill in the top-left.

---

## 2. Every interactive control is reachable via Tab

Native HTML elements give you keyboard focus and activation for free.
Re-implementing what the platform ships is a maintenance tax that *also*
breaks accessibility — so use the natives.

**Mechanics**

- **Use real `<button>` for buttons** — never `<div onClick>` or
  `<span onClick>`. shadcn's `<Button>` and Base UI's `useRender`
  primitives both render real `<button>` underneath; trust them.
- **Use real `<a href>` for links** — Next.js `<Link>` renders an `<a>`,
  which is focusable and activatable with Enter for free.
- **Composite components like `<ShimmerButton as="span">` are only
  acceptable when wrapped in a focusable parent** (typically `<Link>`).
  Rendered DOM is `<a><span>` — the `<a>` is the focusable surface; the
  `<span>` is decorative chrome. Pattern lives at
  [`hero-section.tsx`](apps/docs/src/components/home/hero-section.tsx).
- **Form fields keep their native semantics.** Don't replace
  `<input type="checkbox">` with a styled `<div>` unless you're using
  Base UI / Radix primitives that handle the ARIA + keyboard contract.

**Forbidden**: `onClick` on a non-interactive element (`div`, `span`,
`p`) without `role` + `tabIndex={0}` + key handler. The cost-benefit
never favors rolling your own.

**Measure**: grep audit — `apps/docs/src` should contain ZERO `<div
onClick>` or `<span onClick>` patterns. (Currently passes.)

---

## 3. Every focused element is visibly focused

A focus ring the user can't see is the same as no focus indicator at
all. WCAG 2.4.7 (Focus Visible) is an AA requirement — and a basic act
of respect for keyboard users.

**Mechanics**

- **`focus-visible:ring-*` is mandatory** on every interactive element
  whose default ring is suppressed. The shadcn cva base sets
  `focus-visible:ring-[3px] focus-visible:ring-ring/50` — don't strip it
  at the call site.
- **Never `outline: none` without a replacement.** If you remove the
  default browser outline, you owe the user a visible focus state of
  *equal or better* contrast.
- **Skip-link target uses `outline-hidden`** because the wrapper is
  decorative — focus moves *through* it to the page content. The
  individual focusable controls inside (CTAs, links) carry their own
  rings.
- **Use semantic ring colors.** `focus-visible:ring-fd-ring` (fumadocs
  theme token) on chrome; `focus-visible:ring-purple-500` on branded
  controls. Both pass 3:1 against the surface they sit on.

**Measure**: keyboard-only walkthrough each release — every Tab stop
must be visible without looking at the mouse cursor. Lock test asserts
the layout doesn't ship a global `outline: none` reset.

---

## 4. No focus traps outside of modals

A focus trap (Tab cycles within a region, never out) is correct for a
modal dialog and incorrect for everything else. Most "trap" bugs come
from custom dropdowns or carousels that grab `keydown` and never release.

**Mechanics**

- **Modals trap and return.** When a `<Dialog>` opens, focus moves to
  the first focusable element inside; Tab cycles within; Escape closes
  and returns focus to the trigger. Base UI's `<Dialog>` ships this for
  free — don't replace it.
- **No custom keydown listeners that swallow Tab.** If you find yourself
  reading `e.key === 'Tab'` in a component that isn't a modal, you're
  almost certainly building a trap. Stop.
- **Dropdowns and command palettes use Base UI primitives.** They handle
  arrow keys + Escape + Enter; we don't reimplement.

**Measure**: spot-check release — open every dialog/dropdown, confirm
Escape closes, Tab cycles within when open, Tab exits when closed.

---

## 5. Tab order matches reading order

Visual order and DOM order must match. CSS `order`, `flex-direction:
row-reverse`, and `position: absolute` reorderings all break this — the
user reads left-to-right, top-to-bottom but Tabs through whatever order
the DOM happens to be in.

**Mechanics**

- **`tabIndex={0}` and `tabIndex={-1}` are the only allowed values.**
  - `tabIndex={0}` adds a non-focusable element to the natural Tab
    sequence.
  - `tabIndex={-1}` makes an element programmatically focusable (e.g.
    skip-link target) without inserting it into the Tab sequence.
  - **`tabIndex > 0` is forbidden.** Positive values create a
    parallel ordering layered on top of the DOM and almost always
    produce surprising tab paths.
- **Don't visually reorder.** Avoid `flex-direction: row-reverse` and
  `order: -1` unless the DOM also reflects that order. If you must
  reverse for layout reasons, reverse in the DOM too.

**Measure**: grep — `apps/docs/src` should contain ZERO `tabIndex={N}`
where `N > 0`. (Currently passes.)

---

## 6. Safari Full Keyboard Access — a documented expectation

Safari ships with **"Tab navigates only to form fields and links"** as
the default. Tab will *not* focus `<button>` elements (or any element
with `tabindex`) until the user enables "Press Tab to highlight each
item on a webpage" (Safari → Settings → Advanced → Accessibility, or
System Settings → Keyboard → Keyboard Navigation in macOS Sonoma+).

**This is a Safari preference, not a bug we can fix.** Chrome, Firefox,
and Edge all enable full keyboard navigation by default. Our job is to:

- **Build markup that responds correctly when FKA is on** — every
  interactive element is reachable; the skip link is the first stop;
  focus rings are visible. Principles 1–5 above.
- **Document the toggle for users.** A footnote in the contributing
  docs and the keyboard-shortcuts page explains how to enable FKA on
  Safari.
- **Don't paper over the default.** We don't add JS that fakes Tab
  focus on `<button>` for Safari users — that breaks the user's actual
  preference and is not the standard accessibility contract.

**Measure**: manual cross-browser check at release. The "with FKA on,
every Tab stop reaches the right element" path must work on Safari
(macOS), Chrome, Firefox, and Edge.

---

## How this gets used

When designing a new component, page, or interaction, ask, in order:

1. **#1 Skip link** — does this page have a skip link to `#main-content`?
2. **#2 Reachable** — is every interactive element a real `<button>` /
   `<a href>` / native form control? Or wrapped in one?
3. **#3 Visible** — does each focused element show a ring with ≥3:1
   contrast against its surface?
4. **#4 No traps** — outside of modals, can the user always Tab away?
5. **#5 Reading order** — does Tab order match the visual top-to-bottom
   left-to-right reading flow?
6. **#6 Safari** — would this still work on Safari with FKA on?

If a feature scores poorly across most of these, it's not ready to ship.

When in doubt: **unplug your mouse for an hour and use the site.** If you
can't get to it in under five Tab presses from the page load, it's
buried. If you can't see where focus is, it's broken. If Tab gets stuck,
it's trapped.

---

## Living document

This file is the source of truth for keyboard accessibility on the docs
site. When a keyboard decision is made that this doc didn't anticipate,
**update this doc first**, then make the change. Drift between principle
and practice is the failure mode.

Cross-references:

- [`UX_PHILOSOPHY.md`](UX_PHILOSOPHY.md) #1 (Adoption is friction
  subtraction) — keyboard nav IS friction subtraction for power users
  and accessibility users.
- [`UX_PHILOSOPHY.md`](UX_PHILOSOPHY.md) #6 (Ease of use is performance)
  — keyboard responsiveness IS performance for non-mouse users.
- [`CTA_PHILOSOPHY.md`](CTA_PHILOSOPHY.md) #6 (Touch target ≥ 44×44) —
  applies to keyboard focus targets too.
- [`CTA_PHILOSOPHY.md`](CTA_PHILOSOPHY.md) #10 (State is part of the
  contract) — `focus-visible` is one of the five required states for
  every CTA.
