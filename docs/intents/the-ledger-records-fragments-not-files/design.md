# Design — the ledger records a case's harness, once per harness

Intent: [`intent.md`](./intent.md). **Status:** draft (2026-11-07).

---

## Requirements

- **R1.** A case whose `code` is wrapped by a harness in its test file carries
  a reference to that harness. Replaying `before + code + after` gives the code
  the RuleTester ran.
- **R2.** Each harness is recorded once, in a top-level `harnesses` map keyed
  by `<file>#<name>`, not expanded per case. That meets the size constraint.
- **R3.** `code` stays the fragment it is today. A consumer that ignores
  `harness` keeps working (backwards compatible).
- **R4.** A harness the extractor cannot resolve statically is recorded as
  `unresolved` with its call text. It is never guessed and never dropped, so a
  consumer can tell "no harness" from "harness unknown".
- **R5.** The ledger consumers replay through the harness:
  `find-computed-key-blind-spots.mts` and `recommended-rules-fire.mts`.

## Design

`scripts/rule-case-ledger.ts` already parses each test file with the
TypeScript AST and reads each case's `code` in `codeOf`. The extension is
there, in three shapes, which cover the harnesses the intent names:

| Shape in the test file                                                                          | Resolved as                                                   |
| :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| `code: sdk(TEMPLATE)`, where a local `sdk` is an arrow returning a template with one `${param}` | `before`/`after` = the template's text around that `${param}` |
| `code: DRIVER + TEMPLATE` or `TEMPLATE + SUFFIX`, with a local string `const`                   | `before` / `after` = the constant's text                      |
| anything else (an imported helper, two parameters, a computed harness)                          | `{ unresolved: '<call text>' }` (R4)                          |

The case object gains `harness?: string` (the key), and the ledger gains
`harnesses: Record<string, { before: string; after: string } | { unresolved: string }>`.

Consumers resolve a case with one helper, `replayCode(case, ledger)`, in
`scripts/lib/`. Slice 1 has shipped: `find-computed-key-blind-spots.mts` now
counts and prints the TP cases that do not fire from their fragment, instead of
dropping them from its denominator without a word.

## Verification

`scripts/__tests__/rule-case-ledger-replay.test.ts`. It draws N TP cases at
random (seeded) from cases with a resolved harness, lints `replayCode(case)`
with the case's rule and options, and asserts at least one report. A case whose
harness is stripped fails it. That is the intent's round-trip check. The
`unresolved` count is printed by `rule-cases`; it is a reading, not a gate
(ADR 0011).

## Rejected alternatives

- **Capture the code at runtime with a patched RuleTester**, the way
  `extract-competitor-cases.cjs` does. Rejected for the ledger: it records the
  expanded code per case (the size constraint) and requires running every test
  file to build a document the suite already describes statically.
- **Inline the harnesses into the test files.** Rejected by the intent's
  constraint: it damages the thing being read.

## Out of scope

Classifying why a replayed case still does not fire. That is the rule's own
backlog.
