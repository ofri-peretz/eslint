---
slug: precision-is-measured-not-asserted
opened: 2026-08-30
packages: []
cases: []
---

## What

Raise the number of rules whose precision is measured against a fixture the
rule's author did not write.

```
373 rules can carry a corpus fixture
  exercised by any fixture   : 226 (61%)
  by an INDEPENDENT fixture  :  68 (18%)   <- what precision is measured on
  unmeasured                 : 147
```

Target the rules that appear in a `recommended` preset first, since those are
the ones a consumer gets without choosing them.

## Why

This is the honest floor under every precision claim we make.

A unit test answers "does this rule behave as its author intended". It cannot
answer "how often is this rule wrong about real code", because the same person
wrote the rule and the fixture. Only an independent fixture produces a number
that can contradict us — and **68 rules have one.**

Everything downstream inherits that. The scorecard weights correctness at 30%.
The articles quote F1. The head-to-head against `eslint-plugin-security` is
defensible because `detect-object-injection` is one of the 68; for most rules
the same comparison could not be made honestly.

`check:corpus-coverage` already stops the number getting worse. Nothing makes
it better, and 18% is not a floor anyone should be comfortable standing on.

## Constraints

- **Independent means independent.** A fixture written by whoever is fixing the
  rule, in the same sitting, is a unit test in a different directory. Fixtures
  come from real code — a CVE proof-of-concept, a corpus repository, a peer's
  published example — with the source recorded.
- Ground truth is labelled before the rule is run, never adjusted afterwards to
  make a number look better. A fixture edited to match a rule's output measures
  nothing.
- The unmeasured baseline may only shrink. Removing a rule from it is the unit
  of progress.
- A rule that CANNOT carry a code fixture — `node-security/lock-file` reports
  on a missing file, not a syntax shape — goes in `NOT_FIXTURABLE` with its
  reason, and leaves both numerator and denominator so the percentage stays
  honest.
- No rule changes here. If a fixture reveals a false positive, that is a
  separate branch: a fixture-adding change that also edits rules cannot be
  reviewed as either.

## Done when

- Rules measured by an INDEPENDENT fixture: **68 → 120**.
- Every rule in a `recommended` preset either has an independent fixture or a
  recorded reason it cannot.
- `benchmarks/budgets/corpus-coverage-baseline.json` shrinks by at least 50.
- `benchmark-results/scorecard.md` shows fewer `⚠️ none` rows than it does
  today, and the new figure replaces 18% in `AI_SDLC.md`.
