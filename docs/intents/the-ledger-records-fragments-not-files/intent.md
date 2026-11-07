# Intent — the case ledger stores fragments, so no case can be replayed

> Stage 1 artifact. Opened after a positive-control probe reported 96 rules
> broken and every one of them turned out to be the probe feeding rules a file
> their own harness would never have produced.

**Status:** shipped · **Opened:** 2026-09-03 · **Shipped:** 2026-11-07 · **Owner:** @ofri-peretz

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

## Progress — 2026-11-07

Designed in [`design.md`](./design.md). Slice 1 has shipped: the
under-measuring consumer now says so. `find-computed-key-blind-spots.mts`
prints the TP cases that do not fire from their ledger fragment, instead of
dropping them from its denominator without a word. First reading: **1,645 TP
cases in 121 rules** not probed, against 4,466 probed. Next is slice 2: record
each harness once per run block in `scripts/rule-case-ledger.ts` (design R1–R4),
with the round-trip test.

Slice 2 shipped: `scripts/rule-case-ledger.ts` records each case's exact `body`
and a `harness` key into a top-level `harnesses` map, resolved by
`scripts/lib/case-harness.ts`. That covers const prefixes, local wrappers,
array mappers (`invalid: xp([...])`) and generators called with static
arguments. First reading: **27,239 of 27,414 cases replayable**, 316
harnesses, 48 unresolved (runtime-built code, named by source text). Round
trip: `scripts/__tests__/case-harness.test.ts` replays every harnessed invalid
case in six files, one per shape, and each reports under its own rule.

Slice 3 shipped: both consumers replay through the harness. The computed-key
probe rewrites only the case's own code and puts the harness back around it.
It now probes **6,960 TP cases** (was 4,466); 125 in 19 rules still cannot be
probed. It found **38 more rules** that go silent on a string subscript, which
were recorded in `.agent/computed-key-baseline.json` as found debt, the same
way as the read and key extensions before them.
`recommended-rules-fire.mts` falls from 96 silent rules to **41 of 305**.

## Closed — 2026-11-07

Shipped. Evidence against the success criteria:

- **Every case can be replayed to its suite's verdict.** 27,239 of 27,414
  cases replay from the ledger alone (`replayCode(case, ledger.harnesses)`),
  and the round-trip test proves the verdict for every harnessed invalid case
  in six files that cover each harness shape.
- **No consumer differs from the suite without saying so.** Both consumers
  replay through the harness and pass the case's own filename. The computed-key
  probe prints what it still cannot probe instead of shrinking its denominator.
- **Proven by** `scripts/__tests__/case-harness.test.ts`. It goes red when
  `replayCode` strips the harness.

Scoped down, and named rather than hidden: 175 cases (75 of them TP) are
built by runtime logic (`nest(11, …)`, `Array.from`, imported helpers) and
are recorded as `unresolved` harnesses with their source text. About 50
more TP cases depend on a case-level `languageOptions` or `settings` the
ledger does not record, because those hold parser objects, not data. Both
populations are printed by `rule-cases` and by the probe on every run.
