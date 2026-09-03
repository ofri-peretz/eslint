# Rule corpus - `secure-coding/no-sql-injection` (CWE-89)

**The question this corpus exists to answer:** does this rule earn its place
when the ecosystem already ships nine driver-specific SQL plugins?

By design it is the COMPLEMENT of those plugins: it reports only in a file that
imports no known driver. So every vulnerable fixture here deliberately gets its
database handle from the application's own module (`../lib/db`) or from a
parameter - the shape where no SDK plugin can help, because the driver import
is in a different file.

If the rule has value, it is exactly here. If these fixtures were covered by
the driver plugins anyway, the rule is redundant and should be deleted.

Scores live in `RESULTS.json`, regenerated from the duel runner's own output:

```bash
npx tsx benchmarks/suites/ilb-rule-duel/run.mjs secure-coding/no-sql-injection
npx tsx benchmarks/suites/ilb-rule-duel/run.mjs secure-coding/no-sql-injection --json \
  > benchmarks/rule-corpus/secure-coding__no-sql-injection/RESULTS.json
```

The runner PRINTS; it does not write the file. Regenerate it in the same
session as any rule change — a `RESULTS.json` claiming a score the rule does
not have has shipped here before, and did again: it sat at 76.9% / 14 fixtures
while the corpus had grown to 43.

## The three waves

The corpus was written in three passes, and the numbers below are the point of
the exercise: each wave was authored **after** the rule scored 100% on the one
before it, for the sole purpose of breaking it. Each one did.

| Wave | Fixtures | Score when the wave landed | What it cost |
|---|---|---:|---|
| 1 — the shape no SDK plugin sees | `vulnerable/01`–`08`, `safe/01`–`06` | 76.9% F1 | 3 FN |
| 2 — adversarial | `vulnerable/09`–`17`, `safe/07`–`15` | 75.9% F1 | 6 FN + **1 FP** |
| 3 — adversarial | `vulnerable/18`–`23`, `safe/16`–`20` | — | 9 FN |

### Wave 1 — the premise

The dominant real shape: a handle from the application's own module, a
parameter, a class method, a local builder. Competitors score 0.0% on all of it.

### Wave 2 — the rule's own reflexes, turned against it

Written to defeat the mechanisms wave 1 forced into existence.

- `09` the sink name reached through a `const` — the cheapest evasion there is
- `10` `String(x)` — a call, but not an escaper
- `11` a ternary · `12` a `let` seeded with a literal, overwritten from the request
- `13` a local helper **wearing a trusted name** (`escape`) that only adds quotes
- `14` a private class field holding the handle · `15` a `for-of` binding
- `16` a driver name present as DATA, which must not open the partition
- `17` an optional-chained sink
- `safe/11` — **the false positive**: an object literal named `req`. The request
  test was a membership check on a name, and a name is not evidence.
- `safe/07`, `safe/12`, `safe/13`, `safe/14` — the precision counterweight: a
  builder called with a literal, a *real* escaper, a tagged template, a
  statement that only looks concatenated.

### Wave 3 — assembly the walker could not see

- `18` `+=` append builder · `19` `Array#join` · `20` the driver query-config
  object · `21` a hoisted function-declaration builder · `22` `|| 'id'` ·
  `23` an awaited builder
- `safe/16`–`20` — the same shapes with nothing caller-supplied in them: an
  append whose clauses are all literals, a correct prepared-statement config, a
  loop counter, a LOCAL function named `String`, a builder bound to a caller's
  constant.

Every fixture here is mirrored by a regression case in
`packages/eslint-plugin-secure-coding/src/rules/no-sql-injection/no-sql-injection.test.ts`,
labelled by wave. 41 of those cases fail on the pre-wave rule.
