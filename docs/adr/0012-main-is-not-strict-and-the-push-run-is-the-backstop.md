# ADR 0012 — `main` does not require up-to-date branches; the push-to-main run is the backstop

- **Status:** accepted (records the live setting)
- **Date:** 2026-11-07
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/merge-latency`](../intents/merge-latency/intent.md)

## Context

`merge-latency` was opened when branch protection had `strict: true`. Every
merge forced every other open PR to re-sync and re-run the full gate, about 7
Quality (Full) runs per merged PR. Its design chose a merge queue and rejected
dropping `strict`.

On 2026-11-07 the live protection on `main` is `strict: false` with no merge
queue (`gh api …/branches/main/protection`: contexts `oxlint (fast pass)`,
`Quality (Full) Gate`, `review`; rulesets `[]`). The queue's prerequisites are
in place (`merge_group` triggers, `merge-queue-readiness-lock.test.ts`), but
the queue was never switched on. `scripts/setup-branch-protection.sh` still
declared `strict: true`, a single `Quality Gate` check and one required review.
That disagreed with GitHub on every field it set.

Measured 2026-10-27 to 11-06: about 1.3–1.8 Quality (Full) PR runs per merge,
2.3–2.8 counting the push runs, against the ~7 baseline, and zero merge races.

## Decision

- `main` keeps `strict: false`. A PR is gated on its own head, not on being
  up to date with `main`.
- The **push-to-main run of Quality (Full)** is the backstop. Two PRs that are
  each green but break together turn `main` red within one run, and the
  broken-main issue fires (`2026-08-30-main-cannot-be-silently-red`).
- `scripts/setup-branch-protection.sh` declares exactly the live setting, and
  changes in the same PR as any change to the setting.
- The merge queue stays available. Enabling it (repository settings, plus
  `strict` within the queue) restores the pre-merge guarantee with no workflow
  change.

## Consequences

- Merge latency and runner cost stay low. The full gate runs about once per PR
  plus once per merge.
- A semantic conflict between two green PRs is **detected after merge**, not
  prevented. `merge-latency`'s fourth criterion ("nothing merges without having
  been tested against the main it lands on") is scoped down to that.
- The repo's own declaration of its protection matches GitHub again.

## Alternatives considered

**Enable the merge queue now.** Not taken here. It is a repository-settings
change that only the owner makes. It remains the upgrade path, and nothing in
this ADR blocks it.

**Restore `strict: true`.** Rejected: it brings back the ~7-runs-per-merge
re-sync cost this intent was opened against.
