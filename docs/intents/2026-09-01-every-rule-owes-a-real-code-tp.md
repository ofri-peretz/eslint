---
slug: every-rule-owes-a-real-code-tp
opened: 2026-09-01
packages: []
cases: []
---

## What

Every rule we ship has at least one true positive taken from code we did not
write, cited by repository and commit SHA.

Today 6 of 470 do. 374 of 470 have no corpus fixture at all, so they have no
measured precision — only the author's opinion of their own rule.

These are one goal, not two. A real-code TP IS corpus evidence: the fixture the
rule fires on. Driving the first to 470 drives the second to 0.

## Why

Authored fixtures measure our imagination. The author writes the rule and the
fixture, so the fixture agrees with the rule by construction. 18,547 cases
found no false positives, and could not have.

Five fixtures cut from real repositories found two — a 40% hit rate against
0% from eighteen thousand:

  `no-insecure-comparison` flagged `typeof x == 'string'`. `typeof` always
  yields a string, so `==` cannot coerce; the rule was wrong every time. It
  fired 60 times in one small repository and 12,303 across the inventory.

  `no-unchecked-loop-condition` flagged `for (const k of Object.keys(o))`,
  which cannot be unbounded.

Both were shipping. Both are now sealed. Neither was findable from inside our
own fixtures, because we had already agreed with ourselves.

A precision number computed over 96 of 470 rules is also not a precision
number for the ecosystem. It is a precision number for the fifth of it we
happened to measure, reported as if it covered the whole — the same shape as
every instrument defect found on 2026-08-31.

## Constraints

- **Fixtures must be sourced.** `@source <repo>@<sha> <path>:<line>` on every
  one. Promoting our own rule test cases into `benchmarks/corpus/` would move
  both numbers to target while destroying what they mean, which is precisely
  the defect `independence is provenance, not a directory name` fixed.
- **The scan runs on CI, never on a developer machine.** `real-source-scan.mts`
  clones ~113 repositories and forks one worker per core. Run locally on
  2026-08-31 it took the disk to 99% and the load average to 53, and every
  command on the box — `git log`, `ps`, `pkill` — began timing out.
- **A firing on a `safe/` fixture is a false positive, not coverage.** Coverage
  is a rule firing on a `vulnerable/` fixture. A rule may not be marked
  measured because it was wrong.
- **No rule edits in the same change as a fixture.** A fixture that fails is
  evidence; a fixture edited until it passes is nothing.

## Done when

- `real-source-scan.mts` runs on a schedule in CI and commits a fresh
  inventory, so "never fired" is distinguishable from "never ran".
- `corpus-coverage-baseline.json` reaches 0 unmeasured rules.
- Every rule has at least one case whose `kind` is TP and which carries an
  `@source`.
- The scorecard reports the DENOMINATOR beside any precision figure, so a
  number computed over part of the ecosystem cannot read as covering all of it.
