# Intent — 9,001 cases assert something is safe and none of them says why

> Stage 1 artifact. Opened after 47 tests were found asserting rules' blind
> spots as intended behaviour, in a suite where four fifths of cases carry no
> description at all.

**Status:** draft · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

Every `valid` case states, in its name, what it is claiming is safe and why.
A case that reports nothing and explains nothing is not evidence of correctness;
it is an unexamined assertion that the product should stay quiet.

## Why now

The ledger holds 18,699 cases. **14,890 carry no description — 79.6%.** Split
by kind, the imbalance is the finding:

| kind                           | undescribed |
| :----------------------------- | ----------: |
| TN (`valid` — must NOT report) |   **9,001** |
| TP (`invalid` — must report)   |       5,889 |

A TP with no name is weak: the case at least proves the rule fires, and a
reviewer can read the code and see what was caught. **A TN with no name proves
nothing at all.** It says "on this input we stay silent", and silence is
indistinguishable from a blind spot. The only thing separating "correctly
ignored" from "cannot see it" is a sentence nobody wrote.

That is not hypothetical here. Over this quarter **47 cases were found pinning
a rule's blind spot as intended behaviour** — every one of them a TN. Several
were labelled _"documented false negative"_; one plugin's published
documentation repeated the claim to users. They were found by a probe that
rewrote their inputs, not by anybody reading them, because there was nothing
to read.

## Constraints

- **No bulk naming.** 9,001 renames generated from the code would produce names
  that restate the input, which is the same nothing in more words.
- **The existing ratchet stays shrink-only per rule.** It works; it just does
  not reach the standing debt.
- **A description must state a CLAIM, not the input.** `name: 'obj[k]()'` is
  not a description. The naming gate shipped for branch-named cases already
  makes this distinction and its patterns should be reused.
- **TN and TP are not equally urgent.** Any budget spent here goes to TN first.

## Success criteria

- **Now:** 9,001 undescribed TN cases · 0 gates that treat TN differently.
- **Wanted:** every rule TOUCHED by a change has described TN cases, so the
  debt drains along the paths people actually work on rather than never.
- **Breach:** a rule whose source changes while its TN cases stay unnamed.
- **Proven by:** editing a rule with undescribed TN cases fails the gate; the
  same edit with those cases named passes.
