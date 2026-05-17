# Competitor Landscape — retired

> **This document is retired (2026-05-13)** and has been superseded by
> the canonical ecosystem-landscape set listed below. It used a
> threat-and-coexistence framing that was correct for late 2025 but no
> longer reflects Interlace's positioning after the engine-portability
> contract shipped (`INTEROP_PHILOSOPHY.md`).
>
> Why the rename matters: per
> `memory/feedback_landscape_not_threats.md`, Interlace describes the
> ecosystem as a **landscape we find our path through**, not a
> battle board with threats. Engines like Oxlint, Biome, and the TSC
> native plugin host are **runtimes we ship to**, not adversaries.
> Our path is community leadership through specialization (security
> verticals, engine portability, AI / agent integration), not
> displacement.
>
> The previous content is preserved in git history.

---

## Canonical successors

For any landscape, positioning, or competitive-comparison question,
reach for these in this order:

| Question | Read |
| :--- | :--- |
| Who are our plugin-level neighbors, per plugin? | [`ECOSYSTEM_LANDSCAPE.md`](./ECOSYSTEM_LANDSCAPE.md) |
| How does our rule set overlap with Oxlint's built-in corpus? | [`OXLINT_STOCK_OVERLAP.md`](./OXLINT_STOCK_OVERLAP.md) |
| Same question for Biome? | [`BIOME_STOCK_OVERLAP.md`](./BIOME_STOCK_OVERLAP.md) |
| What axes do we measure ourselves and peers on? | [`EVALUATION_METRICS.md`](./EVALUATION_METRICS.md) |
| What's the engine-portability story (ESLint / Oxlint / Biome / TSC native)? | [`../INTEROP_PHILOSOPHY.md`](../INTEROP_PHILOSOPHY.md) |
| Public-facing comparison vs SAST tools (CodeQL, Semgrep, Snyk Code)? | [`../apps/docs/content/docs/getting-started/concepts/compare.mdx`](../apps/docs/content/docs/getting-started/concepts/compare.mdx) |
| Public-facing engine-compat matrix? | [`../apps/docs/content/docs/getting-started/concepts/compatibility.mdx`](../apps/docs/content/docs/getting-started/concepts/compatibility.mdx) |
| Public-facing engine-portability page? | [`../apps/docs/content/docs/getting-started/concepts/runtime-portability.mdx`](../apps/docs/content/docs/getting-started/concepts/runtime-portability.mdx) |

If you came here from an external link, the closest active equivalent
is `ECOSYSTEM_LANDSCAPE.md`.

## Framing rules (apply everywhere)

When writing or editing any of the above docs, follow
`memory/feedback_landscape_not_threats.md`:

- Use **landscape**, **specialization**, **community leadership**,
  **path through the ecosystem**, **where we add depth**, **where
  someone is doing strong work**.
- Do **not** use **threat**, **beat**, **win**, **moat**,
  **coexistence strategy**, **threat level**, **adversary**.
- Engines are **runtimes we ship to**, not entries in any
  competitor list.
- Every claim in landscape docs must reduce to one of the rows in
  `EVALUATION_METRICS.md` — measurements, not feelings.

If you find a claim in any retained doc that violates these rules,
treat it as a regression and fix it. The vitest landscape-framing
lock at `apps/docs/src/__tests__/landscape-framing-lock.test.ts`
catches the obvious cases on docs under
`apps/docs/content/`; the docs under `distribution/` rely on
review.
