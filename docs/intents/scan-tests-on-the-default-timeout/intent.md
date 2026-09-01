# Intent — whole-repo scan tests run on a 5s budget until they don't

> Stage 1 artifact of the AI-native SDLC. Opened after a scan test blocked four
> commits and a push on a package none of them touched.

**Status:** draft · **Opened:** 2026-09-01 · **Owner:** @ofri-peretz

---

## What is wanted

A test that scans the repository is charged a timeout that reflects what it does,
in every package — not only in the two packages that already hit the wall.

## Why now

`packages/ui`'s `no-external-registry-references.test.ts` reads 200+ files. Idle
it takes 312ms. Inside `turbo run test`, competing with ~30 package suites for
one disk, the same scan measured **16.6s** against vitest's 5s default and
failed. It blocked three pre-commit attempts and one push, each time on a package
the commit never touched, and it passed standalone every time — the signature of
a resource problem being reported as an assertion failure.

Two packages already learned this. `eslint-devkit` and `eslint-formatter` both
set `testTimeout: 30_000`, and devkit's config carries the note that
`hookTimeout` does not inherit it. `packages/ui` never did. **16 scan tests in
the web-lane packages are still on the default.**

The immediate instance is fixed — the read is warmed in `beforeAll` with an
explicit 120s budget — but that is one file. The condition that produced it is
unchanged everywhere else.

## Affected users and systems

`packages/ui`, `apps/docs`, and any package whose tests walk the tree. Practically
this lands on the pre-commit and pre-push hooks, where a flake is most expensive:
it blocks work on an unrelated change and trains people to reach for
`LEFTHOOK_EXCLUDE`, which is how a real failure gets waved through.

## Constraints

- Do not raise timeouts globally to hide slow tests. A test that is slow because
  it is wasteful should be fixed; the budget should move only where the cost is
  inherent to the work.
- `hookTimeout` does not inherit `testTimeout`. Any fix that moves I/O into
  `beforeAll` has to set that budget explicitly, as devkit's config already warns.
- Do not make the flake quieter without making it rarer. Retries would hide the
  contention rather than resolve it.

## Success criteria

- Every test that walks the repository either reads once outside the per-test
  budget, or declares a timeout justified by a measured number.
- A full `turbo run test` under contention completes without a timeout failure
  across ten consecutive runs.
- No commit in the following month is unblocked by `LEFTHOOK_EXCLUDE` for a
  timeout in a package the commit did not touch.

## Open questions

- Is the right fix per-package `testTimeout`, a shared vitest preset, or reducing
  turbo's test concurrency so the disk is not the bottleneck?
- How many of the 16 are genuinely at risk? Cost should be measured under
  contention rather than idle, since idle is exactly the measurement that made
  this look fine.
- Should the pre-commit hook run the full affected set at all, given it is the
  place where contention is worst and the same suites run again in CI?
