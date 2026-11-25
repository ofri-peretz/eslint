---
slug: validation-pipe-reports-only-what-a-pipe-can-fix
opened: 2026-11-12
packages:
  - eslint-plugin-nestjs-security
cases: []
---

# Intent — no-missing-validation-pipe reports only what a pipe can fix

> Stage 1 artifact. Opened after reading, on real code, every finding that
> 4.1.0 added to `no-missing-validation-pipe`.

**Status:** draft · **Opened:** 2026-11-12 · **Owner:** @ofri-peretz

---

## What is wanted

Every `no-missing-validation-pipe` report names an input that a pipe would
actually validate. One named scalar (`@Param('id') id`,
`@Query('page') page = 1`) is not reported.

## Why now

79 NestJS repositories (`tmp/nest-corpus*`, 19,244 files) linted with the rule
as released in 4.0.1, in 4.1.0, and with this change:

|                                           | findings |
| :---------------------------------------- | -------: |
| 4.0.1                                     |      461 |
| 4.1.0                                     |      489 |
| added by 4.1.0                            |       28 |
| …of which one named scalar with a default |       25 |
| this change                               |      404 |
| removed by this change                    |       85 |
| added by this change                      |        0 |

The 85 removed are 37 keyed path parameters and 48 unannotated keyed query
values; each was read in its file. A path parameter is a URL segment and always
a string. An unannotated keyed query value is validated exactly as much as one
annotated `string`, which the rule already exempts. The report told the user to
add a `ValidationPipe`, which does nothing for a primitive.

4.1.0 added 25 of them because it began reading default-valued parameters, and
`@Query('page') page = 1` carries no annotation. Its tests, its 100% mutation
score and its fidelity model all passed: none of them asks whether a report is
worth making.

## Affected users and systems

Everyone running the rule; 4.1.0 is published. The rule doc and its generated
page. The rule's fidelity model.

## Constraints

- No report that names a whole unvalidated object (`@Body() dto`, `@Query() q`,
  `@Param() params`) may be lost.
- A keyed body field stays reported: it is whatever JSON the client sent.
- A declared `schema` with no pipe stays reported on any parameter.
- Type-unaware, no new option.

## Success criteria

- Re-linting the 79 repositories removes only keyed `@Param` and unannotated
  keyed `@Query` findings, and adds none.
- `npm run mutation -- --plugin nestjs-security --rules no-missing-validation-pipe`:
  0 survivors.
- `npm run fidelity -- nestjs-security/no_missing_validation_pipe`: 0 failing,
  with the keyed forms in the model.

## Open questions

- A keyed query value annotated with a type reference
  (`@Query('mode') mode: StripeWebhookMode`) is still reported, 7 times in the
  corpus. Without types the rule cannot tell an enum from a DTO class, and for
  an enum the right fix is `ParseEnumPipe`, not the pipe the message names.
