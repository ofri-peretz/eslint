# Design — the computed-key probe rewrites object-literal keys

Intent: [`intent.md`](./intent.md). **Status:** shipped (as-built record, 2026-11-07).

This intent shipped before a `design.md` was written. This file records what was
built, so that the `shipped` status meets the lock in
`scripts/__tests__/intent-artifacts.lock.test.ts`.

---

## Requirements

- **R1.** The probe rewrites `{ k: v }` into `{ ['k']: v }` in every test case
  and re-runs the rule.
- **R2.** It leaves destructuring patterns, shorthand properties and method
  shorthand untouched, because there the rewrite is not equivalent.
- **R3.** A rule that goes silent under the rewrite is fixed, or recorded in the
  baseline with a reason.

## Design

- `KEY_SITE` in `scripts/lib/computed-key-rewrite.ts` sits beside the existing
  call and read rewrites.
- `check:computed-keys` runs the probe in `.github/workflows/quality.yml`.
- The results are tracked in `.agent/computed-key-baseline.json`. Its
  `known_probe_artefacts` section separates rewrites that are not equivalent
  from real blind spots.

## Verification

`npm run check:computed-keys` fails when a rule outside the baseline goes silent
under a rewrite. The extension took the probe to 3,130 cases and found 50 more
blind spots, which met the intent's "expect the count to rise".

## Rejected alternatives

- **Keep counting sites with `check:spellings`.** Rejected: a site count is a
  proxy, and three conversions made to satisfy it had to be reverted because the
  sites were unreachable.

## Out of scope

The `string-literal-only` class (a literal versus a resolved constant). It needs
constant resolution, not a key rewrite.
