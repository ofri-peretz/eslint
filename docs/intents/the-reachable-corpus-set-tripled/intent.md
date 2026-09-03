# Intent — 99 of the 145 unmeasured rules do fire on real code, not 33

> Stage 1 artifact. Opened the moment the real-source scan produced an
> attributed inventory, which made the reachability figure computable for the
> first time.

**Status:** draft · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

The corpus-coverage backlog is worked in the order of what actually occurs in
real code, and the ordering is derived from an inventory that can name its own
inputs.

## Why now

145 rules have no corpus fixture. The working assumption on this branch — and
in `docs/intents/default-on-rules-fire` — was that **33** of them had any
real-world material, so the other 112 could not be measured at all without
fabricating fixtures.

That number came from the inventory with **no `configHash`**, which never ran
seven plugins. Against the attributed scan (113 repositories, 347,301 files,
both hashes matching disk):

|                                         | old figure | measured |
| :-------------------------------------- | ---------: | -------: |
| unmeasured rules that fire on real code |         33 |   **99** |
| unmeasured rules that fire nowhere      |        112 |   **46** |

The actionable backlog tripled, and it is concentrated:

```
react-a11y 33   vercel-ai-security 15   express-security 11
nestjs-security 8   import-next 7   pg 6
```

`react-a11y` alone accounts for a third. Those 33 rules were previously
believed to have no material because the config that produced the old
inventory never linted a `.tsx` file.

## The hole this opened, found while checking the above

**The corpus scorer cannot parse JSX or TypeScript.**
`eslint.benchmark.config.mjs` matches `files: ['**/*.js']` and contains **zero**
parser references — yet it registers `react-a11y`, a JSX-only plugin, among its
plugins. Those 33 rules are loaded into the scorer and cannot fire in it, ever.
`scripts/add-sourced-fixture.mts` hardcodes `${slug}.js` on line 190, so a JSX
fixture cannot even be written.

This is the SAME defect that made the real-source inventory wrong.
`eslint.real-source.config.mjs` exists because the previous config "matched
`**/*.js` with no TypeScript parser and never linted a single `.tsx` file" —
its own header says so. That was fixed for the real-source scan on 2026-08-26
and **never fixed for the benchmark corpus**, which is the instrument that
scores detection quality.

So the largest reachable group — 33 react-a11y rules, a third of the backlog —
is blocked on a config fix, not on fixture-cutting effort. Any plan that starts
with "cut fixtures" would have produced 33 files that score zero.

## Constraints

- **Fixtures come from real repositories, never invented.** The corpus records
  what code actually does; a hand-written fixture measures the author's
  imagination.
- **The corpus FLATTENS paths.** A rule that reads its own file path —
  `ddd-anemic-domain-model` needs `domain/`, `no-external-api-calls-in-utils`
  needs `utils/` — needs `--under` on `add-sourced-fixture.mts`.
- **A fixture whose target rule does not fire is worthless** and must be
  deleted, not committed. Verify with the benchmark config before adding.
- **46 rules fire nowhere and that is a finding, not a gap.** Driving them to
  measured means inventing material.

## Success criteria

- **Now:** 145 unmeasured · 99 reachable and unworked · ordering derived from
  an artefact that could not say what it asked.
- **Wanted:** the backlog ordered by real-world frequency from the attributed
  inventory, and the top of that order worked first.
- **Breach:** a fixture cut against a reachability figure whose inventory
  hashes do not match disk.
- **Proven by:** `check:audit-freshness` green on the inventory before any
  batch is cut, and each new fixture demonstrated to make its rule report.
