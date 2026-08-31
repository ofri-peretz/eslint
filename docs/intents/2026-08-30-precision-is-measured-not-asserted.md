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
  by a CURATED fixture       :  73 (20%)   <- written here, reviewed here
  detected in SOURCED code   :   0 ( 0%)   <- what precision rests on
  unmeasured                 : 147
```

**Corrected 2026-08-30.** This intent opened against a number that said 68
rules (18%) had an INDEPENDENT fixture. That number was false, and it was
false in exactly the way this intent exists to prevent.

`check-corpus-coverage.ts` computed it by selecting fixtures whose PATH matched
`benchmarks/corpus/CWE-*`. Every fixture under those paths was written in this
repository — of the 154 curated fixtures, 85 are `@author claude-fable-5` and
48 are `@author ofri-peretz`. Three record a `@source`. The gate meant to
enforce "a fixture written by whoever is fixing the rule is a unit test in a
different directory" was measuring the directory.

The first corrected run said 4. That was still too kind, in the same
direction. Those 4 were `import-next/unambiguous`,
`import-next/no-unused-modules`, `import-next/no-commonjs` and
`import-next/no-extraneous-dependencies` — hygiene rules that fire on any
`.js` file with no exports — and all three sourced fixtures are `safe/`,
where a firing is a FALSE POSITIVE. The headline was crediting rules for
being wrong about code labelled not-vulnerable.

**The real starting point is 0.** No rule in this repository has been shown
to detect a real vulnerability in code we did not write.

Target the rules that appear in a `recommended` preset first, since those are
the ones a consumer gets without choosing them.

## Why

This is the honest floor under every precision claim we make.

A unit test answers "does this rule behave as its author intended". It cannot
answer "how often is this rule wrong about real code", because the same person
wrote the rule and the fixture. Only an independent fixture produces a number
that can contradict us — and **4 rules have one.**

Everything downstream inherits that. The scorecard weights correctness at 30%.
The articles quote F1. The head-to-head against `eslint-plugin-security` is
defensible because `detect-object-injection` is one of the 68; for most rules
the same comparison could not be made honestly.

`check:corpus-coverage` already stops the number getting worse. Nothing makes
it better, and 0% is not a floor at all.

The 18% that stood here before was worse than no number: it was reassuring.

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

- Rules that detect a real vulnerability in SOURCED code: **0 → 60**.

  The intent opened at 68 → 120 against a path-selected count. Restated twice:
  first against provenance, then against DIRECTION, because a rule firing on a
  `safe/` fixture was being counted as measured precision when it is a false
  positive. Both restatements moved the number down. That is the number
  working.
- Every rule in a `recommended` preset either has a SOURCED fixture or a
  recorded reason it cannot.
- Every `@source` pins a commit and a path — `owner/repo@<sha> path:line` — so
  the claim can be checked by someone who does not trust us.
  `scripts/real-source-scan.mts` already produces that coordinate; it clones a
  committed list of stranger repositories and reports which rules fire.
- `benchmarks/budgets/corpus-coverage-baseline.json` shrinks by at least 50.
- `benchmark-results/scorecard.md` shows fewer `⚠️ none` rows than it does
  today, and the SOURCED figure is the one quoted anywhere precision is
  claimed.
