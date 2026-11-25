# Design — no-missing-validation-pipe reports only what a pipe can fix

Intent: [`intent.md`](./intent.md). **Status:** draft.

---

## Requirements

- **R1** A keyed `@Param('x')` is never reported as `missingValidation`.
- **R2** A keyed `@Query('x')` with no type annotation is never reported as
  `missingValidation`, with or without a default value.
- **R3** A keyed `@Body('x')`, and every unkeyed input, is reported as before.
- **R4** `schemaWithoutPipe` is unaffected: it is decided before R1 and R2.

## Design

`readInputDecorator` already walks the decorator's arguments; it now also
returns `keyed` (a static string argument was seen). In the handler loop, after
the schema branch and before the scalar-type exemption, a keyed `Param`, or a
keyed `Query` whose parameter has no annotation, is skipped.

## Verification

- `no-missing-validation-pipe.test.ts`, block "keyed scalars": the real
  snippets as `valid` cases, and the neighbours that must stay reported as
  `invalid` cases.
- The fidelity model gains `ParamKey`, `QueryKey` and `BodyKey` decorators.
- The corpus re-lint in the intent is the check that would have caught the
  original problem. It is not a CI job; it is now a step of the scheduled
  NestJS release routine.

## Rejected alternatives

- **Infer a scalar from the default value (`= 1`, `= ''`).** It fixes only the
  25 findings 4.1.0 added and leaves `@Param('id') id` reported, which is the
  same non-problem without a default.
- **Exempt every keyed input.** `@Body('payload') payload: any` is a real
  unvalidated object; six of those are in the corpus.
- **A separate message advising `Parse*Pipe` for keyed scalars.** That is a
  style suggestion, not a missing-validation finding, and would put 85 new
  low-severity reports in front of users of a security rule.

## Out of scope

Telling an enum-typed keyed query value from a DTO-typed one (needs types), and
a corpus precision gate in CI.
