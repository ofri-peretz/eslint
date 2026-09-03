# Intent — every rule we enable by default is known to fire

> Stage 1 artifact of the AI-native SDLC. Opened from Stage 6 observation while
> adjudicating the corpus budget: `ddd-anemic-domain-model` reports **zero**
> findings across the eight-repository corpus, and hid a real suppression
> defect that no corpus measurement could ever have surfaced.

**Status:** draft · **Opened:** 2026-08-25 · **Owner:** @ofri-peretz

---

## What is wanted

**Every rule enabled in a `recommended` preset has a demonstrated positive
control** — a snippet, committed, that makes it report. Not a fixture it was
born with: a check that the rule _can_ fire under the configuration a consumer
actually installs.

Scope is the default-on surface only. Opt-in rules are the author's problem;
a `recommended` rule is ours.

## Why now

A rule that never fires is not "clean". It is unmeasured, and this repo has
just paid for the difference.

`ddd-anemic-domain-model` reports nothing on the corpus because it only fires
inside a `domain/` or `entities/` directory — a layout none of the eight
repositories uses. Inside that gate it was suppressing real findings on a
substring collision: `Requestor` contains `Request`, so an anemic class named
`Requestor` was silently exempt. Two independent measurement systems were blind
to it at once — the corpus scan because the rule never fired, and
`lint:name-inference` because that gate read only `<rule>/index.ts` and this
rule is a flat file.

Both blind spots are now closed. The rules behind them are not.

## Measured today (2026-08-25)

|                                                |   rules |
| :--------------------------------------------- | ------: |
| enabled in a `recommended` preset              | **327** |
| with at least one corpus finding — examined    |  **49** |
| with **zero** corpus findings — never examined | **278** |

The 49 are the entire evidential basis for the ecosystem's default behaviour.
Of the eight examined closely this week, **five carried real defects**, two of
them reporting false on every single finding (`prefer-tag-over-role` 31/31,
`no-unknown-property` 65/65).

That hit rate is the argument. It was measured on the _examined_ population;
there is no reason to believe the unexamined 278 are healthier, and one
concrete reason — `ddd-anemic` — to believe some are worse.

## Progress — 2026-09-02

`scripts/recommended-rules-fire.mts` runs each rule's own TP case through the
preset rather than through the rule. It found **287** rules across the
`recommended` presets — the first read said 7, because it looked for `configs`
on the default export when most plugins export it as a NAMED export. A probe
that quietly measured four plugins of twenty-six and reported as though it had
measured all of them.

It reports 187 firing and 96 silent, **and the 96 is not yet a finding.** Many
rules are evidence-gated: they refuse to fire in a file that does not import the
framework they are about. The test suites supply that through a harness
(`sdk()`, `lambda()`, `xp()`) that wraps each case; the ledger records the
FRAGMENT. Measured:

```
app.use(cors({ origin: '*', credentials: true }));      -> 0
import express from 'express'; … the same line          -> 1
```

So the probe hands rules a file their harness would never have produced, and a
correct abstention reads as a defect.

**The blocking design question this surfaces:** a positive control needs the
whole file the case runs in, and `RULE_CASES.json` stores only the fragment.
Recording the harness per case is a change to `rule-case-ledger.ts`, and it is
what this intent actually needs before its number means anything.

## The finding

Zero findings has two causes, and they are not the same thing:

1. **The corpus has no instances.** A narrow rule on a pattern those eight
   repositories do not use. Fine, and expected.
2. **The rule cannot fire.** Gated on a path convention, a config shape, or an
   option nobody sets — or simply broken.

Nothing currently distinguishes them. Both read as silence, and silence reads
as health.

## Constraints

- **No new corpus repositories.** Widening the corpus changes published numbers
  and is a separate decision — `benchmarks/corpus` is a calibrated instrument.
- **A positive control is not a fixture.** The rule's own `invalid` cases run
  under RuleTester, which is not the configuration a consumer installs.
  `prefer-dom-node-text-content`'s own fixture was silent through the `Linter`
  API for a reason unrelated to what it claimed to test.
- **This does not adjudicate precision.** A rule that fires may still be wrong.
  This is the cheaper, prior question.

## Success criteria

- Every one of the 327 has a committed control asserting it reports, run
  through the `Linter` API rather than RuleTester.
- Each rule that cannot be made to fire is either fixed, moved out of
  `recommended`, or has its gate documented in its dossier with the reason.
- A gate refuses a NEW rule entering a `recommended` preset without one, so
  the 278 cannot regrow.

## Out of scope

- The five remaining corpus adjudications (`no-commented-code`,
  `no-missing-null-checks`, `prefer-template-literal`, `cognitive-complexity`,
  `identical-functions`). Those are the examined population and continue on
  their own track.
- `ANTHROPIC_API_KEY` for eval layer 2 — a repo secret, needs the owner.

## Re-checked 2026-09-02

**The opening figure cannot be reproduced.** This intent records 327 rules
enabled in a `recommended` preset on 2026-08-25 and does not say how that was
counted. Enumerating every plugin's `recommended` config today gives **287**.

Forty rules is too large a gap to be drift, and there is no recorded method to
check it against — which makes 327 the same kind of number this intent was
opened to object to. Either the count included the `strict` presets, or it read
`eslint-config-interlace` rather than the per-plugin configs, or rules have
been removed. The honest position is that we do not know.

**287 is the figure with a method behind it**, and the method is
`npm run measure:default-on-rules`. The 327 should be treated as unattributed
and not quoted again.
