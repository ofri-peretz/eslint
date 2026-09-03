# Intent — the case ledger stores fragments, so no case can be replayed

> Stage 1 artifact. Opened after a positive-control probe reported 96 rules
> broken and every one of them turned out to be the probe feeding rules a file
> their own harness would never have produced.

**Status:** draft · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

`RULE_CASES.json` records enough to REPLAY a case: the code as the RuleTester
saw it, including whatever the test file wrapped around it. An instrument
reading the ledger reaches the same verdict the suite does.

## Why now

Many rules are evidence-gated — they refuse to fire in a file that does not
import the framework they are about, because a bare `app.use(cors(…))` in a
file with no Express is somebody else's `app`. That gate is correct and it is
deliberate.

The test suites supply that evidence through a harness — `sdk()`, `lambda()`,
`xp()`, `DRIVER +` — which wraps each case before the RuleTester sees it. **The
ledger records the fragment.** Measured directly:

```
app.use(cors({ origin: '*', credentials: true }));      -> 0 findings
import express from 'express'; … the same line          -> 1 finding
```

So `scripts/recommended-rules-fire.mts` — built to answer "does every default-on
rule actually fire under its own preset" — reported **96 of 287 rules silent**,
and that number is unusable. The script says so in its own header and output,
which is the right disclosure and not a fix.

The same defect is latent in every other consumer of the ledger.
`find-computed-key-blind-spots.mts` skips cases that do not fire, so an
evidence-gated case whose harness was stripped is silently dropped from its
denominator rather than reported — it has been measuring a smaller population
than it claims, quietly, this whole time.

## What the ledger already records, which narrows this

Each case carries `file`, `filename`, `options` and `source` alongside `code`.
So a determined consumer **could** open the test file and recover the harness —
replay is harder than it should be, not impossible, and the first draft of this
intent overstated it as "no case can be replayed".

That narrows the ask usefully: the fix is not new information, it is putting
the information where a reader will use it. Every consumer that skipped the
harness so far had `file` available and did not open it, which is the practical
definition of the wrong shape.

## Constraints

- **The ledger is generated, never hand-edited.** Any fidelity fix lives in
  `scripts/rule-case-ledger.ts`.
- **Do not inline harnesses into the test files.** The harness exists so 51
  fixtures do not each repeat an import; unwinding that to help a downstream
  reader would damage the thing being read.
- **Size matters.** The ledger is already 18,699 cases; storing a fully
  expanded file per case multiplies it. Record the harness ONCE per run block
  and reference it.
- **Backwards compatible.** Existing consumers must keep working while they
  migrate, or the fix breaks three instruments to repair one.

## Success criteria

- **Now:** 0 cases carry their harness · 1 instrument publicly unusable ·
  1 instrument silently under-measuring.
- **Wanted:** every case in the ledger can be replayed to the same verdict its
  own suite reaches.
- **Breach:** a ledger consumer whose result differs from the suite's for the
  same case.
- **Proven by:** a round-trip check — take N cases at random, replay them from
  the ledger alone, and assert the verdict matches the suite's.
