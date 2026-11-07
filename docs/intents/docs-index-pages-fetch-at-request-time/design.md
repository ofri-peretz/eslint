# Design — index pages render from build-time data

Intent: [`intent.md`](./intent.md). **Status:** shipped (2026-11-07).

---

## Requirements

- **R1.** A `/rules` index page makes no per-rule network request at request time.
- **R2.** No generated cache sits in the tree unread.
- **R3.** The index page's LCP is measured on a schedule.

## Design

- `RulesTable` looks descriptions up in `rules-manifest.json` (keyed
  `eslint-plugin-<slug>/<rule>`), the same file the plugin finder and the
  oxlint page already read.
- `src/data/plugin-rules/` is deleted, along with the writer in
  `apps/docs/scripts/sync-readme-rules.ts` and its `docs-data.yml` step.
- `lighthouserc.json` collects `/docs/security/plugin-vercel-ai-security`.

## Verification

`git grep -n "raw.githubusercontent.com" apps/docs/src/components/docs/rules-table.tsx`
matches only the README URL, with no `docs/rules/` path. The weekly
`lighthouse.yml` report carries the page's LCP.

## Rejected alternatives

- **Read every README from disk at build time.** Deferred, not rejected. The
  per-plugin README fetch is cached for 6 hours and is not per-rule; moving it
  is a separate change to the docs build.
- **An LCP error budget.** Rejected under ADR 0011: it would be a new gate.

## Out of scope

`remote-readme.tsx`, the plugin overview page's README render.
