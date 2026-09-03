# Design — a case must state a position, not execute a line

> Stage 2 artifact. Accepts [intent.md](./intent.md).

**Status:** draft · **Opened:** 2026-09-02 · **Owner:** @ofri-peretz

---

## The check

`scripts/rule-case-ledger.ts` already walks every `valid`/`invalid` entry in the
suite and already reads each case's `name` — that is how `check:rule-cases`
enforces "every new case carries a description". The new rule is one more read
of the same string, so it costs nothing and needs no new instrument.

A case name **names the instrument** when it matches any of:

| Pattern                     | Example found today                                         |
| :-------------------------- | :---------------------------------------------------------- |
| `L<digits>`                 | `(L67/L81/L95 false arms)`                                  |
| `id <digits> (TRUE\|FALSE)` | `coverage - computed callee property (id 9 FALSE)`          |
| a leading `coverage` token  | `coverage - router factory and middleware-name edge shapes` |
| `false arm` / `true arm`    | `(L139/L145 false arms)`                                    |

Each says the same thing: this case exists so a branch executes. None says what
the rule is supposed to _do_ with the input.

## Why the name, and not the assertion

Because the name is the only part a human reads when the suite is green, and
because it is the part that was honest. Every flipped case this quarter had a
name that already admitted what it was: `coverage - computed callee property
(id 9 FALSE)` told the truth about its own purpose, and nobody looked.

Checking the assertion instead would mean deciding whether a rule _should_
report on an input — which is the judgement the case is supposed to encode, not
something a linter can recover.

## Shape

Shrink-only, against `.agent/rule-case-naming-baseline.json`:

- 47 entries recorded at introduction, keyed `plugin/rule → count`.
- A **new** branch-named case fails the build.
- A rule whose count **drops** must have the baseline updated in the same change,
  the same contract `computed-key-baseline.json` uses — otherwise the file stops
  describing the code and starts excusing it.

Not fixed in one pass. 47 renames touching 20-odd files, each needing the author
to decide what position the case actually takes, is a change nobody can review;
and three of the six flipped this quarter turned out to be asserting the _wrong_
position, which a rename would have quietly preserved.

## Proving it fails on the unfixed state

Required before this counts as done, per the repository's own rule:

1. Record the baseline, confirm `check:rule-cases` is green.
2. Add a case named `something (L42 false arm)` to any rule — the gate exits 1
   and names it.
3. Rename one of the 47 without updating the baseline — the gate exits 1 and
   says the record is stale.
4. Rename it _and_ update the baseline — green.

## Rejected alternatives

**Check the assertion, not the name.** The obvious idea: decide whether a rule
_should_ report on a given input, and flag cases that disagree. Rejected because
that judgement is exactly what the case exists to encode — a linter that could
recover it would not need the case. The name is the weaker signal and the only
recoverable one.

**Lower the coverage floor to 95% and drop the branch-chasing cases.** This
would delete the incentive that produced the 47 names, and it is the change
several of those cases are arguing for. Rejected: the floor has repeatedly
caught real defects, ten in a single sweep, and the cases it forces are only
worthless when nobody states what they claim. Fix the naming, keep the floor.

**Fix all 47 in one pass, start the gate at zero.** Rejected on reviewability:
each rename is a judgement about what the case asserts, and three of the six
cases examined this quarter turned out to assert the _wrong_ position. A
47-file rename would have preserved those three silently, which is the precise
failure this intent exists to stop.

**A new script, `check:case-names`.** Rejected as a second instrument reading
the same data. `check:rule-cases` already walks every case and already reads
`name`; a separate script would drift from it.

## Out of scope

Test names outside `packages/*/src/**/*.test.ts` — the workspace's own
`scripts/__tests__` locks are named after the thing they lock by design, and
that is correct for an infrastructure test.

## What this deliberately does not do

**It does not lower the coverage floor.** 100% has repeatedly caught real gaps:
ten abstain paths opened by widening rules to read `o['k']` were each found
within seconds of the widening, by coverage and nothing else.

**It does not require a case per branch.** The house rule stands — a branch that
cannot be reached is deleted, not covered.

The claim is only that a case named after a line number is evidence of
execution and not of intent, and that the two have been conflated.

## Open question carried into Build

Should the check also flag a case whose name restates its own `code`
(`name: 'obj["oldMethod"]()'`)? It is the same failure in a different costume —
the name adds nothing a reader could not see — but the pattern is far harder to
match without false alarms, and this design does not attempt it.
