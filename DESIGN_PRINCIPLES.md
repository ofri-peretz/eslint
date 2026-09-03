# Design principles — moved

> **This charter now lives in the Interlace repo.**
> **→ [ofri-peretz/interlace · DESIGN_PRINCIPLES.md](https://github.com/ofri-peretz/interlace/blob/main/DESIGN_PRINCIPLES.md)**

Look-and-feel doctrine — the principle charter and the per-domain philosophies
it cites (layout, typography, colour, motion, a11y, keyboard, loading, forms,
…) — is design-system work, and the design system is
[Interlace](https://github.com/ofri-peretz/interlace). Keeping a second copy
here meant two sources of truth for one contract, and they diverged: the copy
that used to sit at this path still described a **violet** brand months after
the system moved to burnt orange.

This repo **consumes** the design system — `@interlace/ui` components, tokens,
and the breakpoint ladder all ship from there. It does not author the doctrine.

## Where things went

| What | Now lives at |
| --- | --- |
| The principle charter | [`DESIGN_PRINCIPLES.md`](https://github.com/ofri-peretz/interlace/blob/main/DESIGN_PRINCIPLES.md) (interlace) |
| The `*_PHILOSOPHY.md` charters | [`docs/philosophies/`](https://github.com/ofri-peretz/interlace/tree/main/docs/philosophies) (interlace) |
| Rendered, browsable versions | [storybook.interlace.tools](https://storybook.interlace.tools) → **Philosophy** |
| The breakpoint ladder | [`BREAKPOINT_PHILOSOPHY.md`](https://github.com/ofri-peretz/interlace/blob/main/packages/ui/BREAKPOINT_PHILOSOPHY.md) (interlace — moving to `docs/philosophies/` with the rest) |

Older files in this repo still cite philosophies by bare filename — e.g.
"`CTA_PHILOSOPHY.md` #8" in a test name, or the philosophy list in
`.github/workflows/lighthouse.yml`. Those citations resolve against
`docs/philosophies/` in the interlace repo.

## What stayed here

[`DOCS_PHILOSOPHY.md`](./DOCS_PHILOSOPHY.md) — but only its ESLint-product
half: how *this* docs site projects rule metadata, renders `meta.schema`
options, and serves agent-readable rule data. The vendor-neutral docs-craft
doctrine it was tangled with moved to interlace alongside the rest.
