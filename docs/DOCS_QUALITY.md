# How we measure documentation quality

Companion to [DOCS_PHILOSOPHY.md](../DOCS_PHILOSOPHY.md), which says what the docs
should *be*. This says how we know whether they are, and what happens when they are
not.

_Last reviewed: 2026-08-30._

---

## The one principle

**A claim about the docs is worth exactly as much as the check that holds it.**

Everything below names a check, not an intention. Where there is no check, the row
says so — an honest gap is useful, an unmeasured aspiration is not.

Two corollaries, both learned the hard way in this repo:

1. **A check nobody runs is not a check.** `tools/scripts/check-readme-structure.ts`
   encoded the entire README standard and was wired into no npm script, no workflow
   and no hook. While it sat unrun, all thirty plugin READMEs drifted onto a
   pre-migration brand asset.
2. **A red check nobody sees is not a check either.** `peer-health.yml` failed every
   weekly run from 2026-07-20 to 2026-08-24 and `resource-profile.yml` every monthly
   run from 2026-06-01, so two published data snapshots silently stopped moving.
   `integration-health.yml` found a real production defect on 2026-08-24 and opened
   nothing, because its issue-filing step was conditioned on a `workflow_dispatch`
   input that is empty on a cron.

So a check has to satisfy three things, and the table columns are exactly these:
it **exists**, it **runs unattended**, and a failure **reaches a human**.

**Measured today: 17 scheduled workflows, 6 with no failure channel at all** —
`codecov`, `cve-latency`, `eslint-version-matrix`, `oxlint-parity`, `quality-full`,
`weekly-corpus-scan`. A red run there is visible only to someone who opens the
Actions tab. Eight file an issue, one opens a PR, and CodeQL and Scorecard report to
the Security tab, which is a channel.

---

## Where a check belongs

| The check… | goes in | because |
| :--- | :--- | :--- |
| reads only files in the repo | **PR gate** (vitest / a workflow step) | it is deterministic and fast, and the PR that breaks it is the cheapest place to fix it |
| touches the network — a live URL, npm, the docs site | **scheduled cron that files an issue** | an upstream 404 is not the PR author's fault and must never wedge a merge |
| needs a build or a benchmark run | **`ready_for_review` gate** (`quality-full.yml`) | too slow for every push, too important to skip before merge |

This is why link checking is *not* a blocking PR gate. Twitter rotates image URLs
faster than our cache TTL; a peer's README moves. Those are real findings that need
a human, not a red merge button.

> **`npm run quality` is a local convenience command, not a gate.** No workflow
> invokes it. Adding a check there and nowhere else means it runs when someone
> remembers to type it. Add checks to `scripts/__tests__/` (which
> `npm run test:scripts` runs in `quality.yml`) or to a workflow step.

---

## The four things that rot

### 1. Links

| Metric | Target | Held by | Cadence |
| :--- | :--- | :--- | :--- |
| External links in MDX that resolve 2xx | 100% | `apps/docs/scripts/check-links.ts` → `check-links.yml` | weekly (Fri), files an issue + on `ready_for_review` |
| Internal markdown links that resolve | 100% | `npm run check-links` (`scripts/check-markdown-links.ts`) | manual — **gap** |
| Docs links carry the UTM contract | 100% | `check-utm-links.ts` | manual — **gap** |
| README docs slug resolves to a real page | 100% | `plugin-name-metadata-drift.lock.test.ts` | PR |
| Renamed docs slugs redirect, never 404 | every rename | `next.config.mjs` redirects + `remote-markdown-slug-lock.test.ts` | PR |
| Live production surface behaves | 100% | `integration-health.yml` | weekly (Sat), files an issue |

> **Two different link checkers, confusingly named.** `npm run check-links` runs
> `scripts/check-markdown-links.ts` over *internal* markdown links and is manual-only.
> `check-links.yml` runs `apps/docs/scripts/check-links.ts` over *external* HTTP links
> in MDX and is the scheduled one. Renaming them is a follow-up.

### 2. Names

Every identifier a plugin has, and what holds it, is enumerated in
[`.agent/link-and-name-map.md`](../.agent/link-and-name-map.md) — generated, so it
cannot drift from the sources it describes.

| Metric | Target | Held by | Cadence |
| :--- | :--- | :--- | :--- |
| Rule-id prefix == package suffix, and the preset registers it | 100% | `plugin-prefix-identity.lock.test.ts` | PR |
| Every name in a machine-read surface resolves to a real package | 100% | `plugin-name-metadata-drift.lock.test.ts` | PR |
| Docs registry ↔ `packages/` agree exactly | exact | same lock | PR |
| The name map matches its sources | exact | `link-and-name-map.lock.test.ts` | PR |
| README structure + brand marks | 100% of 31 | `readme-structure-gate.lock.test.ts` | PR |
| Rule docs name their own plugin prefix | 100% | `documentation-standards.test.ts` | PR |

### 3. Data

The numbers we publish — benchmark results, peer health, download counts, coverage.
**This is the weakest column**, and the failures above all landed here.

| Metric | Target | Held by | Cadence |
| :--- | :--- | :--- | :--- |
| Benchmark snapshots refreshed | weekly | `weekly-benchmark.yml` | weekly (Mon) |
| Peer-health snapshot refreshed | weekly | `peer-health.yml` | weekly — **was silently failing 6+ weeks** |
| Resource profile refreshed | monthly | `resource-profile.yml` | monthly — **was silently failing 3+ months** |
| Published claims match measured values | 100% | `npm run audit:claims` | manual — **gap** |
| Audit snapshots not stale | age-bounded | `check-audit-freshness.ts` | manual — **gap** |
| Coverage reported per package | 30/30 | `codecov.yml` components | PR — **19/30, gap** |

**Every refresher must file an issue when it fails.** A snapshot that stops moving
looks identical to a snapshot that has not changed. `peer-health`, `resource-profile`
and `check-links` now do; `integration-health` already had the step but guarded it on
a `workflow_dispatch` input that is empty on a cron, so it never fired unattended.

### 4. Content

| Metric | Target | Held by | Cadence |
| :--- | :--- | :--- | :--- |
| Every exported rule has a doc page | 100% | `rule-docs-sync-drift.test.ts` | PR |
| Rule MDX matches its `.md` source | exact | `sync-rules-docs.ts --check` | PR |
| Documented options exist in the schema, and vice versa | 100% | `documented-options-exist.test.ts` | PR |
| Docs pages render without a11y violations | 0 serious | Playwright a11y suite | PR |
| Core Web Vitals | budget in `lighthouse.yml` | Lighthouse CI | weekly (Wed) |
| Articles reviewed before publish | 5 reviewers ≥9.0 | the `ofri-next-article` skill | per article |

---

## Reading this as a scorecard

Count the rows. Today: **8 gaps** — four checks that exist but run only when typed
(`check-links`, `check:utm-links`, `audit:claims`, `check:audit-freshness`), eleven of
thirty plugins with no codecov component (19/30), six scheduled workflows with no
failure channel (6/17), and the two data refreshers that have to prove a green run before their column can be
trusted again.

The number to move is **gaps → 0**, not "docs feel good". When a row moves from
manual to a cadence, this file changes in the same PR.

---

## Adding a check

1. Decide the tier from the table above — repo-only, network, or build-heavy.
2. Repo-only: put a `*.lock.test.ts` in `scripts/__tests__/`. It runs in CI via
   `npm run test:scripts`.
3. Network: a workflow with a `schedule:` **and** an issue-filing step guarded by
   `if: failure()` — not by a `workflow_dispatch` input, which is empty on a cron.
4. **Prove the check fails on the unfixed state.** A lock that passes against a
   broken tree is worse than none; see
   [CLAUDE.md](../CLAUDE.md) — "Regressions are the issue. Lock everything you fix."
5. Add the row here.
