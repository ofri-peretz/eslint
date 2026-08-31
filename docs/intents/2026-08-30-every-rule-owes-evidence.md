---
slug: every-rule-owes-evidence
opened: 2026-08-30
packages: []
cases: []
---

## What

Close the residue. After the instrument is trustworthy and the corpus contains
the material, whatever rules remain with **no measured precision and no observed
firing** get a fixture that proves they work — or they are retired.

This is the intent that actually finishes the 110. The two before it exist
because you cannot finish a number you cannot trust.

## Why

A rule with no corpus fixture has no measured precision. A rule that has never
fired on real code has no evidence it works outside its own test file. A rule
with **neither** is a claim the suite makes and cannot support — and the suite's
whole argument is that measured claims beat asserted ones.

Today that set is 110 of 470. It will be smaller after the two upstream
intents, and the part that survives them is the part that was always real:

- **rare but genuine** — the defect exists and is uncommon. Owes a hand-written
  corpus fixture with measured precision, and the rarity stated.
- **unprovable as written** — the rule cannot fire on any input anyone can
  construct. That is not a rare rule, it is a broken one, and finding even one
  justifies this intent.
- **no observed purpose** — nobody can produce the defect it describes. Retired,
  with the reasoning, which is a success outcome and must be recorded as one.

The suite publishes 470 rules. Every one of them is a promise to a consumer who
will turn it on.

## Constraints

- Depends on `the-silence-instrument-is-recorded` and
  `the-corpus-has-the-material`. Starting here means writing fixtures for rules
  that are silent because nobody ran them.
- A fixture must be **sourced or hand-written and labelled as such**. A
  hand-written positive proves the rule _can_ fire; it does not prove the defect
  occurs in the wild, and the two must not be conflated — this is the
  restatement `precision-is-measured-not-asserted` already made twice, both
  times moving its number down.
- A rule firing on a `safe/` fixture is a false positive, not coverage. Direction
  is part of the claim.
- **Retirement is a real outcome and needs a changeset.** Removing a rule is a
  major for its package, with the restoring config named, as
  `require-data-minimization` did.
- No rule leaves this set by having its fixture written to match its
  implementation. The fixture describes the defect; if the rule does not catch
  it, the rule is wrong.

## Done when

- Rules with neither a corpus fixture nor an observed firing: **→ 0**.
- Every rule that was in the set is in exactly one of: measured by a fixture,
  observed firing on real code, or retired with a changeset.
- The count and its date are quoted in `AI_SDLC.md`, and the ratchet makes a
  new evidence-free rule impossible: `check:new-rule-cases` already refuses a
  new rule without a case — this extends the same bar to the ones that predate
  it.
