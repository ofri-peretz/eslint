# Motion Budget

> **Principle:** Motion that explains the product earns its place. Motion that decorates overwhelms.

## Why a budget

Motion is a finite UX resource. Every animated element on a page costs:

- **Attention** — the eye is drawn to motion before content
- **Performance** — animations run on every frame; a half-dozen of them on one page degrades scroll smoothness on low-end devices
- **Trust** — over-decorated marketing reads "look at me," under-decorated docs reads "we sweated the details"

This file is the line-wide audit + allocation policy. Future motion additions should be checked against it.

## Current allocation (2026-05, post-diet)

The home page was deliberately dieted from 6 motion primitives + 9 sections down to a leaner shape. Current allocation:

| Motion primitive | Where | Why it earns its place |
| :--- | :--- | :--- |
| `HeroCosmic` (StarsBackground + ShootingStars + Meteors) | Home page hero | Signature brand visual; sets the "this is a real product" register; only on the entry surface |
| `ShimmerButton` | Hero CTA + final CTA | Two primary CTAs visually equivalent; readers' eyes go to the right place |
| `BorderBeam` | Home page docs-preview terminal mockup | **Showing the product** — the beam frames the actual `eslint.config.js` snippet readers will write |
| `NumberTicker` × 4 | Home page stats bar | Informative motion — counts up to the real plugin / rule / pillar counts (not arbitrary loop) |
| `BackgroundBeamsWithCollision` (with `hideCollisionSurface`) | `/articles` page | Quieted variant for content reading; brand-consistent backdrop without the collision-effect overhead |

**Total: 6 instances across 3 pages.** Down from 12+ instances pre-diet.

## What was retired (2026-05 home-page diet)

Removed because they decorated rather than explained:

- `Marquee` — scrolling plugin names; the same info appears in the Two Pillars section as a clean grid
- `BackgroundLines` — animated SVG behind testimonials; testimonials don't need backdrop motion
- `AnimatedGradientText` — eyebrow chip on the home page hero (replaced with a quiet `border + bg-white/5` chip); also removed from the social-proof section's "Featured in Top 7" callout (replaced with a static `Trophy` icon in a plain rounded chip)

**Don't re-introduce these on the home page.** [`src/__tests__/homepage-lock.test.tsx`](./src/__tests__/homepage-lock.test.tsx) has negative assertions that fail if they come back, with comments explaining the diet.

## What's available but unused

The shared baseline (`agents/interlace/docs-baseline/components/ui/`) ships these motion components — synced into `eslint/apps/docs/.interlace/components/ui/` and ready to use IF a place earns them:

- `animated-grid-pattern`, `animated-list`, `dot-pattern`, `flip-words`, `focus-cards`, `grid-pattern`, `interactive-grid-pattern`, `particles`, `spotlight`, `stars-background`, `background-gradient-animation`, `background-beams-with-collision`

Treat these as inventory for **specific product-explanation moments**, not blanket page backdrops. If you find yourself reaching for one, ask: "is this making the product clearer, or am I decorating an empty surface?"

## Decision rule for adding motion

Before importing a magicui or aceternity component, answer all four:

1. **What does this motion explain about the product?** If the answer is "nothing, it's just visual interest" — don't add it.
2. **Does the page already have motion?** If yes (count current instances), the new motion has to displace something or earn it on top of an existing budget.
3. **Will the motion still feel justified after the user has visited 3 times?** Decorative motion gets old fast; functional motion (counters, hovers, tracing arrows in code samples) doesn't.
4. **Does the page have a lock test?** If yes, update the test in the same commit so future regressions are caught.

## When in doubt

Use a shadcn primitive (`button`, `card`, `dialog`, `tooltip`, …) instead of a magicui/aceternity equivalent. The primitive does the job without the motion budget cost. Motion is the exception, not the default.

## Cross-product alignment

This is the eslint app's budget. The same principle applies in:

- `serverless/apps/docs/` — younger product, motion budget should start lean and grow only with justification
- `agents/apps/interlace-landing/` — apex landing page; can carry more motion than docs sites because it's a true marketing surface, not a docs surface, but still bound by the four questions above

If a component is added to the baseline (`agents/interlace/docs-baseline/components/ui/`), it becomes available to all three sites. Adding to inventory is fine; using it everywhere is not.
