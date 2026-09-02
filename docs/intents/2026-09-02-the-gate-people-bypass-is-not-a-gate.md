---
slug: the-gate-people-bypass-is-not-a-gate
opened: 2026-09-02
packages: []
cases: []
---

## What

Make `build-and-test` and `tests-affected` pass or fail on the change, not on
what else the machine was doing — so that `LEFTHOOK_EXCLUDE` stops being the
normal way to push.

## Why

On 2026-09-02 a single session excluded a pre-push or pre-commit hook **eight
times**, every time with the same justification, every time after verifying the
work serially instead. The exclusions were honest — the packages were checked and
the evidence recorded in each commit — and that is exactly the problem. A gate
whose correct operation is "turn it off and check by hand" has been replaced by a
habit, and the habit does not survive the day someone is in a hurry.

The failures are not the change under test. `turbo run test` failed a DIFFERENT
untouched package on each of four consecutive runs — `secure-coding`,
`maintainability`, `express-security`, `@interlace/ui` — and every one passed
alone:

```
eslint-plugin-express-security   34 files, 1426 tests   pass, standalone
@interlace/ui                     6 files,  157 tests   pass, standalone
eslint-plugin-maintainability    21 files,  470 tests   pass, standalone
eslint-plugin-postgresql-security 39 files, 1165 tests  pass, standalone
```

Where a cause is visible it is contention, not logic: `Test timed out in 5000ms`
on a test whose body spawns a whole-suite walk taking ~5s on an idle machine. The
default timeout was sized for a unit test and applied to a subprocess.

The cost compounds. Each bypass is a judgement call, each judgement call is a
place a real failure can be waved through, and the commit messages now carry
paragraphs explaining why a gate was skipped — reasoning that reads exactly the
same whether the skip was right or wrong.

There is a second, quieter cost: a push that runs the full build and test suite
takes longer than the ten-minute foreground limit, so pushes have to be
backgrounded. That is survivable, but it means nobody watches a push, and a
rejected push is discovered later.

## Constraints

- **Do not raise timeouts globally.** A generous default hides a genuinely slow
  test, which is the thing worth finding. A test that shells out declares its own
  budget and says why, as `name-vocabulary-spread` now does.
- Concurrency is the knob to look at first, not the last resort. A 14-core
  machine running 38 packages' suites at once is not measuring any of them.
- **The bar is that the exclusions stop, not that they become rarer.** If
  `LEFTHOOK_EXCLUDE` is still the normal path afterwards, this failed.
- Whatever changes must keep the gate as strict on the change itself. Faster by
  testing less is not the goal; a gate that runs everything unreliably is worth
  less than one that runs the affected set reliably.

## Done when

- Ten consecutive pushes without a `LEFTHOOK_EXCLUDE`, measured, not
  impressionistic.
- Every test that spawns a subprocess carries an explicit timeout with its reason
  written next to it.
- The pre-push path completes inside the foreground limit, so a push can be
  watched rather than backgrounded and discovered.
- `AI_SDLC.md` records the flake rate, so a return is visible as a number rather
  than as a growing pile of justified exclusions.
