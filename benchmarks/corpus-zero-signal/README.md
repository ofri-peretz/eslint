# Zero-signal corpus

Fixtures for the sixteen rules that produced **no findings on any corpus** (#520).

Zero signal is ambiguous by construction: the rule may be precise and the corpus
may simply lack the pattern, or the rule may be broken. While it stays
ambiguous, no preset-membership decision about those rules is measurable — and
the preset audit's "promote none of them" verdict rested, for these sixteen, on
absence of evidence rather than evidence of absence.

One vulnerable and one safe fixture per rule. Exercised by
`scripts/__tests__/zero-signal-fixtures.test.ts`, which loads each rule from
source and lints the pair with **that rule, and only that rule, enabled**.

## Why this is not in `benchmarks/corpus/`

Every rule here is **non-recommended** — that is what put it in the audit. The
main corpus is linted through `<plugin>.configs.recommended`, so these fixtures
would sit there permanently unexamined: sixteen vulnerable files no configured
rule was ever asked to look at, still reporting zero, still ambiguous. That
circularity is the actual reason these rules had no signal. You cannot measure a
rule's yield on a corpus that never enables it.

Putting them there is also actively harmful, which we found out by doing it:

- `benchmarks/corpus/` is a **calibrated instrument**. `scripts/recall-gate.ts`
  holds a per-CWE detection budget against it, the six-tool suite scores
  competitors on it, and its numbers are published.
- Adding vulnerable files the presets do not detect grows the denominator.
  CWE-327 went from `TP=2/4` to `TP=2/7` — a recall figure that fell without
  anything regressing.
- Two safe fixtures drew reports from unrelated rules, so the recall gate failed
  with *"2 gained a false positive"*.

Neither was a real regression, and that is the problem: it would have quietly
restated a published benchmark as worse. `CORPUS_DIR` in the suite is an exact
path, so nothing here is visible to it.

## Layout

```
CWE-NNN/
  manifest.json          # cwe, name, owasp, severity, expectedPlugins, fixtures[]
  vulnerable/<case>.js   # MUST be reported by the named rule
  safe/<case>.js         # must NOT be reported — the remediated form
```

Each `fixtures` entry carries the `rule` it belongs to, because a CWE directory
here can serve several rules (CWE-327 holds three).

## Known gaps

Two safe fixtures are asserted to **still** be reported, because the rule does
not recognise the genuine remediation:

| rule | gap |
| --- | --- |
| `node-security/require-storage-encryption` | Accepts only `SecureStore.setItemAsync` or `encrypt(...)`. Does not recognise `EncryptedStorage.setItem`, the most widely used encrypted store on the platform it targets. |
| `browser-security/require-url-validation` | Does not recognise validation. Only string literals assigned to `window.location` pass, so an allowlist check reports identically to an unguarded assignment. |

The fixtures keep the real remediation rather than being rewritten to whatever
the rule happens to accept — rewriting them would pin the gap as correct. The
test asserts they still report, so fixing the rule turns the test red and forces
the entry out. A recorded gap that cannot quietly become permanent.
