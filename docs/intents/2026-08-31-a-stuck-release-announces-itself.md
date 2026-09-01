---
slug: a-stuck-release-announces-itself
opened: 2026-08-31
packages: []
cases: []
---

## What

When a package's version on `main` is not the version on npm, something must
say so within a day, without anyone going looking.

## Why

Five packages sat bumped-but-unpublished on `main` and nothing reported it:

    eslint-plugin-browser-security  2.0.7  npm had 2.0.6
    eslint-plugin-conventions       5.1.0  npm had 5.0.0
    eslint-plugin-maintainability   3.1.2  npm had 3.1.1
    eslint-plugin-modularity        2.4.0  npm had 2.3.0
    eslint-plugin-react-features    1.5.0  npm had 1.4.0

The only thing that noticed was `benchmarks/corpus-scan`, and only by accident:
it pins its rig to each plugin's package.json version, so the install died
`ETARGET` on a version npm did not have. That signal took three layers of
broken reporting to read — `--silent` swallowing npm's output, `sh` discarding
the child's stderr, and a retry handler that threw `ReferenceError` while
trying to log, replacing the real error with its own.

The same day, the daily Codecov upload failed four times in a row on `main`
and nothing said that either. `carryforward: true` re-served the previous
numbers, so four days of no measurement looked identical to four days of
stable coverage. It was read as "coverage collapsed" when coverage had not
moved at all — every package still passes its 100% gate.

Both are the same defect: a number that stops being produced looks exactly
like a number that has not changed. The release pipeline and the coverage
pipeline can both stop without a single red mark anywhere a human looks.

## Constraints

- Not in the PR-CI path. A health probe that gates a PR makes every unrelated
  change hostage to an external service; this belongs on a schedule that files
  an issue (see the repo's existing convention for probe checks).
- Must not fail on a package that has never been published — a new plugin
  before its first release is not drift.
- Must query the registry, not a lockfile. A lockfile records what we resolved,
  not what the public can install.

## Done when

- A scheduled check compares every workspace package's version against npm and
  reports each divergence by name, version, and how long it has diverged.
- The check distinguishes NEVER PUBLISHED from BEHIND, because only the second
  is a stuck release.
- A regression lock proves the check reports drift when drift exists, rather
  than passing over an empty list.
