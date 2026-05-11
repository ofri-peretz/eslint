# CTA Philosophy

Every call-to-action on this site — hero buttons, final-CTA banners, README
"Install" buttons, OG-card link previews, plugin-page "Get started" links —
is governed by this document. CTAs are the smallest unit of conversion;
they're also the most-copied component. **Inconsistent CTAs read as a broken
product**, even when each one in isolation looks fine.

This document is the sibling of [`UX_PHILOSOPHY.md`](UX_PHILOSOPHY.md) and
inherits its tone: principles ordered by **leverage**, each backed by
**Mechanics** (what to do) and **Measure** (how we know).

If you're about to ship a CTA and can't point to the principle behind it,
reconsider.

---

## 1. A CTA is a promise about what happens next

A button label is a contract with the reader: click this and *that* will
happen. Vague labels ("Submit," "Click here," "Learn more") break the
contract by hiding the destination. Decorative CTAs that promise more than
they deliver burn trust, and trust is the one input we cannot top up.

**Mechanics**

- **Verb-led labels**, ≤4 words: "Get started," "Install plugin," "Read the
  rule," "View on GitHub." Never "Click here," never "Submit," never "Learn
  more" without a noun.
- **Match the destination.** "View on GitHub" goes to GitHub. "Install" goes
  to the install snippet, not a marketing page.
- **No mystery decoration.** A trailing arrow on a CTA implies forward
  navigation; a download icon implies a file download. Don't decorate a CTA
  with an icon whose meaning you can't justify.

**Measure**: CTA click-through rate per surface; bounce rate immediately
after click (a high post-click bounce means the destination didn't match the
promise).

---

## 2. One primary per surface

The most-wanted action on a page is the primary CTA. *One.* A page with two
primaries asks the reader to pick, and "pick" is friction
([`UX_PHILOSOPHY.md` #1](UX_PHILOSOPHY.md#1-adoption-is-friction-subtraction)).
A tie is a loss.

**Mechanics**

- **Exactly one filled, brand-colored CTA per visible surface.** Hero,
  final-CTA banner, plugin landing — each gets one.
- **Secondary CTAs may exist** (typically one), but they sit beside the
  primary as a clearly-quieter sibling — outline, not filled; same geometry,
  different fill (see #3).
- **Tertiary actions are inline** — text links inside body copy, ghost
  buttons inside cards. They never compete for the eye.
- **If you find yourself wanting two primaries**, the page is doing two
  things. Split it.

**Measure**: a screenshot test that fails when more than one filled-brand
button appears in any single viewport on a marketing surface.

---

## 3. Sibling CTAs share a contract

When two CTAs sit in the same row — hero primary + secondary, dialog confirm
+ cancel, card "Install" + "Read docs" — they must be visually
indistinguishable except for fill. **Different geometry between siblings is
the most damaging visual bug we ship**, because it reads as a system that
doesn't have its own rules.

**Mechanics**

Sibling CTAs MUST match exactly on:

- **Outer height** (±0px — not "close enough").
- **Corner radius.**
- **Border weight** (1px vs 2px is a different button).
- **Label font size and weight.**
- **Icon size and gap-to-label.**
- **Total horizontal padding.**

Sibling CTAs MAY differ on:

- **Fill color** (filled vs outline vs ghost).
- **Border color** (none vs subtle vs prominent).
- **Hover/active treatment.**

Practical contract: both siblings come from the same `buttonVariants` call,
sharing the same `size` token, varying only on `variant`.

**Mixed-library exception** — when one sibling is from a third-party design
system (e.g. magicui `<ShimmerButton>`) and the other is shadcn `<Button>`,
sibling parity is **intentionally relaxed**. Each component carries the
geometry its library was designed around (ShimmerButton ships `px-6 py-3`
pill; shadcn `Button size="lg"` ships `h-10 rounded-md`). Forcing parity
across libraries means stacking overrides on vendor components — which
re-introduces the override drift this philosophy exists to prevent
(see UX_PHILOSOPHY #11 — Build with the ecosystem; Leverage > Inspire >
Reinvent). Use vendor components as-shipped, or pick a single library for
all CTAs in the pair.

**Measure**: a Playwright/Chromatic check that compares the bounding box of
the primary and secondary in any same-row CTA pair from the SAME library —
height delta must be 0. Cross-library pairs are exempt from the bounding-box
check but must each pass their library's own design contract.

---

## 4. Three weights, no more

Every CTA on the site falls into exactly one of three weights:

- **Primary** — filled, brand color. The most-wanted action. Variant: `default`.
- **Secondary** — outline, neutral. The acceptable alternative. Variant:
  `outline`.
- **Tertiary** — ghost or underlined link. The "I just want to read more"
  exit. Variants: `ghost`, `link`.

There is no fourth weight. "Special-but-not-primary" doesn't exist; it's
either important enough to be primary or it isn't.

**Mechanics**

- **No "branded secondary"** that tries to sit between primary and outline.
- **Destructive actions** (`destructive` variant) are a *modifier* of weight,
  not a fourth weight — a destructive primary still reads as "the primary on
  this surface."
- **`ShimmerButton` and other animated skins are *primary skins*** — see #8.

**Measure**: button-variant audit script — if any CTA in `apps/docs/src` uses
a custom Tailwind class set instead of `buttonVariants({ variant })`, flag.

---

## 5. Size tokens, never ad-hoc padding

Every CTA's geometry comes from a single discrete size token on the canonical
[`Button`](packages/ui/src/primitives/button.tsx). The available sizes are:

- **`lg`** — `h-10`, used in section CTAs, card CTAs, and the secondary
  CTA in hero pairs (since the primary is typically a third-party brand
  asset like magicui's `<ShimmerButton>` — see #3 mixed-library exception).
  shadcn ships `lg` as its largest size; we don't extend the cva with a
  `hero` token because doing so meant adding `className` overrides to vendor
  components and the override stack produced hydration drift in practice.
- **`default`** — `h-9`, used inline and in toolbars.
- **`sm`** — `h-8`, used in dense lists and mobile chrome.
- **`xs`** — `h-6`, used in tag-row actions.

Wrappers that re-pad their children (a `<span className="px-6 py-2">` inside
a `<button className="px-6 py-3">`) are forbidden. *Stacked padding is the
single largest source of sibling-mismatch bugs.*

**Mechanics**

- **Pick the size token at call site**: `<Button size="hero">…</Button>`.
- **If the CTA needs custom geometry**, add a new size to the cva config.
  Don't override `h-` / `px-` / `py-` at the call site.
- **Color overrides are permitted** (a hero on a dark surface may need
  `border-white/30 bg-white/5 text-white`); geometry overrides are not.
- **Same applies to anchor-styled CTAs** — `<Link className={buttonVariants({ size, variant })}>`
  is the canonical pattern when the CTA navigates.

**Measure**: lint rule (or grep audit) that flags `className="...h-\d+\|...py-\d+"`
on any element that already pulls `buttonVariants(...)`.

---

## 6. Touch target ≥ 44×44

WCAG 2.5.5 (Level AAA, target Level AA practice). A CTA the reader can't
reliably tap on a phone is a CTA they don't take. This is non-negotiable on
mobile.

**Mechanics**

- **Minimum visible height 40px** (`h-10` / `lg`); minimum effective tap
  target 44px (use `min-h-11` on the wrapper or hit-area padding).
- **Icon-only CTAs use `icon-lg` (`size-10`) on mobile**, never `icon` or
  smaller as the primary affordance.
- **Stacked CTAs need `gap-4` minimum** between sibling buttons so the
  reader's thumb doesn't catch the wrong one.
- **CTAs inside dense lists** may shrink to `sm` (`h-8`) if and only if the
  list itself is desktop-primary content (e.g., the rules table).

**Measure**: axe + Lighthouse audit run on every PR; mobile-viewport
screenshot diff for the home page on every release.

---

## 7. Icons are subordinate to labels

A CTA icon supports the label; it never replaces it (except for clearly
universal idioms — close `×`, search `🔍`). The icon size is a function of
the button size, not a freehand decision.

**Mechanics**

- **Icon-to-button size mapping** (already encoded in the cva variant
  classes — `[&_svg:not([class*='size-'])]:size-N`):
  - `xs` / `icon-xs` → `size-3` (12px)
  - `sm` / `default` / `icon` / `icon-sm` → `size-4` (16px)
  - `lg` / `icon-lg` → `size-4` to `size-5` (16-20px)
  - Vendor components (magicui ShimmerButton, etc.) → use the library's
    documented icon-size guidance, not ours.
- **Trailing arrow** (`<ArrowRight />`) is the only purely decorative icon
  permitted on a CTA — and only on forward-navigation CTAs.
- **Leading icons must carry meaning**: brand mark (GitHub, npm), state
  (lock, shield), action class (download, copy). A leading icon that's just
  decoration weakens the label.
- **Icon-label gap** is `gap-2` (8px) by default; never override at call
  site.

**Measure**: visual audit of all CTAs at release — flag any leading icon
without a meaning category.

---

## 8. Motion is opt-in and scarce

Animated CTAs (the `ShimmerButton` is the only one we ship today) are visual
debt: they pull every eye on the page, which is exactly the point — *and
exactly why they cannot be the default*. Every animated CTA spends from the
motion budget defined in [`MOTION_PHILOSOPHY.md`](MOTION_PHILOSOPHY.md).

**Mechanics**

- **The default primary is static.** A filled `Button size="lg"
  variant="default"` is what every page reaches for first.
- **Animated CTA skins are reserved for primary marketing surfaces.**
  Landing hero, final-CTA banner, campaign banner. Never inside a content
  section, never in chrome, never in a card. Each marketing surface gets
  *at most one* animated CTA (the surface's primary). The home page may
  legitimately ship two animated CTAs total — one in the hero, one in the
  final-CTA banner — because they're separate surfaces with their own
  visual frames.
- **Animation only on the primary.** Secondary and tertiary CTAs on the
  same row are STATIC by rule. An animated secondary breaks the hierarchy
  contract (#3) — it reads as a competing primary. (This was the
  motivating bug for the 2026-05 revision: the hero secondary was a
  ShimmerButton, which produced a "dueling animations" effect.)
- **Respect `prefers-reduced-motion`.** Animated CTAs degrade gracefully to
  their static fill; `MOTION_PHILOSOPHY.md` is the authority.

**Measure**: per-surface audit — count `ShimmerButton` (or any other
animated CTA skin) inside each marketing surface (hero / final-CTA / campaign
banner). Each surface MUST have ≤ 1; a second match within the same surface
is a regression. Cross-surface counts on the same page are allowed.

---

## 9. Same component, every surface

The docs site, plugin READMEs, OG-card images, the eventual `@interlace/ui`
consumer site, and the `claude.ai` integration cards all render CTAs through
the same primitive. CTAs are how we *demonstrate* the package
([`UX_PHILOSOPHY.md` #9](UX_PHILOSOPHY.md#9-the-docs-site-is-the-showcase));
if our own CTAs are inconsistent, we've shipped the counter-example.

**Mechanics**

- **Canonical primitive**: [`@interlace/ui`'s `Button`](packages/ui/src/primitives/button.tsx).
  Every CTA — anchor or button, server or client, static or interactive —
  routes through `Button` or `buttonVariants`.
- **`<Link className={buttonVariants(...)}>`** for navigation CTAs (when
  `useRender`'s render-prop indirection isn't ergonomic, e.g. inside a
  third-party slot).
- **`<Button render={<Link/>}>...</Button>`** when the CTA is a button
  semantically (form submit, mode toggle) and `Link` is just the navigation
  target.
- **READMEs use shields.io badge buttons** that mirror the same height/
  weight/icon system — they're the offline equivalent of a CTA.
- **OG cards render the primary CTA in the same dimensions** as the page's
  on-site CTA, so the link preview previews the click.
- Builds on [`UX_PHILOSOPHY.md` #11 (Build with the ecosystem)](UX_PHILOSOPHY.md#11-build-with-the-ecosystem-not-against-it):
  Base UI's `useRender` is what makes this composition tractable.

**Measure**: dependency graph — every component named `*-cta-*`, `Hero`,
`Banner`, or `*ButtonGroup*` must import from `@interlace/ui/button` or
`#interlace/components/ui/button`. CI grep.

---

## 10. State is part of the contract

A CTA isn't "the rest state and four bonus styles." It's a five-state
component: rest, hover, focus-visible, active, disabled — plus loading when
the click triggers async work. Every state is part of the visible contract;
shipping any of them as an afterthought is the same as shipping a half-built
button.

**Mechanics**

- **Focus-visible is mandatory**: `focus-visible:ring-[3px]` and a visible
  ring color (`focus-visible:ring-ring/50`). Inherited from the cva base
  classes — don't strip them at call site.
- **Hover** changes fill or border, never geometry. A CTA that grows on
  hover causes layout shift ([`MOTION_PHILOSOPHY.md`](MOTION_PHILOSOPHY.md)
  CLS=0).
- **Active** (`:active`) shows a brief pressed treatment — handled by the
  primitive; don't customize per-call.
- **Disabled** uses `disabled:pointer-events-none disabled:opacity-50` from
  the base. Never style "disabled-but-clickable"; if the action is
  unavailable, it's disabled.
- **Loading** replaces the trailing icon with a spinner and locks the label
  width — the button's bounding box does not move. (See
  [`LOADING_PHILOSOPHY.md`](LOADING_PHILOSOPHY.md) for the spinner pattern.)
- **`aria-busy="true"`** on loading; **`aria-disabled="true"`** when the
  click is rejected for a reason the reader should be told (with adjacent
  microcopy).

**Measure**: keyboard-only walkthrough of the home page once per release —
every CTA reachable, every state visible, no traps.

---

## How this gets used

When designing or reviewing a CTA, ask, in order:

1. **#1 Promise** — does the label name what happens?
2. **#2 One primary** — is there exactly one filled/brand CTA on this surface?
3. **#3 Siblings** — if there's a sibling, does it share height, radius,
   border, padding, font size, icon size?
4. **#4 Weight** — is it primary, secondary, or tertiary? Not a fourth thing?
5. **#5 Size token** — is the geometry coming from a `size` token, not
   inline padding?
6. **#6 Touch** — ≥44px effective tap target on mobile?
7. **#7 Icon** — sized to the button size? Carries meaning if leading?
8. **#8 Motion** — if animated, is it the *one* primary on this page?
9. **#9 Component** — routed through `@interlace/ui/button`?
10. **#10 State** — focus-visible, hover, active, disabled, loading all
    handled?

If a CTA scores poorly across most of these, it's the wrong CTA — not the
wrong styling.

When in doubt: **what would this CTA look like as a sibling next to itself,
twice?** If two of them in a row look like a pair, you've satisfied the
contract. If they don't, you haven't — even if neither one in isolation is
wrong.

---

## Locked invariants — hero CTAs

The landing-page hero's CTA contract has regressed enough times that we
lock it via tests. The contract:

1. The hero renders **exactly two** `<ShimmerButton>` instances — primary
   ("Get Started") and secondary ("GitHub"). Sibling parity per #3 above.
2. The PRIMARY ShimmerButton keeps the rotating spark and the inset
   highlight (the defaults — both `shimmer` and `highlight` truthy).
3. The SECONDARY ShimmerButton passes BOTH `shimmer={false}` AND
   `highlight={false}` — same pill geometry, no decoration. Animation
   budget per #8 above.
4. The tagline-to-CTA gap is `mb-16` (the `xl` spacing token from
   LAYOUT_PHILOSOPHY §3). Hero surfaces breathe; `mb-10` (the
   mobile-section default) reads cramped.

**Enforced by:**

- [`apps/docs/src/__tests__/homepage-lock.test.tsx`](apps/docs/src/__tests__/homepage-lock.test.tsx)
  — source-text asserts per JSX element (primary has no `shimmer={false}`,
  secondary has both, plus the GitHub icon/label and the `mb-16` gap).
- [`apps/docs/src/__tests__/hero-section-render.test.tsx`](apps/docs/src/__tests__/hero-section-render.test.tsx)
  — DOM render-time asserts via `data-slot="shimmer-button"`,
  `data-shimmer-spark`, `data-shimmer-highlight` seams on the actual mounted
  output.

**Workflow if you need to break this contract:** edit this section *first*
(state what's changing and why), then update the two test files, then
change the code. Same workflow LAYOUT_PHILOSOPHY calls out for layout
changes. Drift between principle, tests, and practice is the failure mode.

---

## Living document

This file is the source of truth for CTAs across the repo. When a CTA
decision is made that this doc didn't anticipate, **update this doc first**,
then make the change. Drift between principle and practice is the failure
mode.
