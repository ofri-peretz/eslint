---
slug: burgee-false-positives
opened: 2026-09-07
packages:
  - eslint-plugin-reliability
  - eslint-plugin-maintainability
  - eslint-plugin-conventions
  - eslint-plugin-operability
  - eslint-plugin-secure-coding
cases: []
---

# Intent — a consumer turned seven rules off; the rules owe it a fix, not a workaround

**Status:** review · **Opened:** 2026-09-07 · **Owner:** @ofri-peretz

---

## What is wanted

The `burgee` CLI framework (`ofriperetz.dev/burgee`) can delete six `'off'`
blocks from its `eslint.config.mjs` — the ones annotated `FP 1`, `FP 7`,
`FP 8`, `FP 9`, `FP 10`, `FP 11` — and un-hoist the code it rewrote to dodge a
seventh (`FP 12`), and the rules stay quiet on the code those blocks cover,
without any of the rules losing a case they report today.

Where a block turns out to silence something that is not a false positive of
the rule as it stands on `main`, that is written down here with the evidence
rather than fixed by loosening the rule.

## Why now

A consumer that has to write `'rule': 'off'` six times with a paragraph of
justification each — and rewrite correct code a seventh time to satisfy a rule
— has stopped trusting seven rules, and the README's own FP/FN
section says what that costs: an ignored rule has zero recall regardless of
what it detects. The workarounds are dated 2026-09-06/07 and cover real,
shipped code — a CLI parser, a compatibility oracle, its test fixtures.

Measured on `origin/main` at `79f9bc166`, by running the `src/` rule against
the consumer's actual files (`scripts/probe-rule.mts` cannot address rules that
live at `src/rules/<category>/<rule>.ts`, so the same Linter harness was run
from a scratch script):

| Block | Rule(s)                                                                            | Consumer's diagnosis                                                                                                    | On `main`, against the real file                                                                                                                                                                                                                   |
| :---- | :--------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FP 1  | `reliability/no-missing-null-checks`                                               | `m[1]` after `if (m === null) return`; `'value' in token` narrowing                                                     | The early-return shape is quiet since 4.1.4 (burgee runs 4.1.3). `'value' in token ? token.value : …` and `if (found?.[1] !== undefined) … found[1]` **report** — `execute.ts:206`.                                                                |
| FP 7  | `secure-coding/no-insecure-comparison`                                             | `spec.env === undefined`, `fromEnv !== undefined`, `envVar in process.env` read as secret comparisons because of `env`  | All three **quiet**. The file reports at `execute.ts:176,177,204` — `token === '--'` and `kind === 'positional'` (via `const { kind } = token`): the word is `token`, a parseArgs lexeme.                                                          |
| FP 8  | `maintainability/no-unhandled-promise`, `reliability/no-unhandled-promise`         | every `write(…)` in `async function main(argv, write: (s) => void)`                                                     | **Reports**, both twins, `report.ts:161,162,165`.                                                                                                                                                                                                  |
| FP 9  | `conventions/prefer-dependency-version-strategy`                                   | a package.json fixture's `version: '1.0.0'`                                                                             | **Reports** — both fixture shapes.                                                                                                                                                                                                                 |
| FP 10 | `maintainability/no-missing-error-context`, `reliability/no-missing-error-context` | `throw new UsageError('…', 'hint')`                                                                                     | The literal-message shape is **quiet** in both twins. The maintainability twin **reports** `throw err` re-throws (`commander-command.ts:416,458,1656`) and `new UsageError(msg, hint)`; the reliability twin does neither — the twins had drifted. |
| FP 11 | `operability/require-data-minimization`                                            | a static `HOSTS` literal read as data collection                                                                        | Inert with default options since 4.0.0 (burgee runs 3.1.1). With `piiFields: ['name']` configured, the static literal **reports**.                                                                                                                 |
| FP 12 | `maintainability/consistent-function-scoping`                                      | a module-scope arrow wrapped in `as unknown as T` told to move to module scope; `run: () => 'ok'` inline in an argument | The cast shape **reports** on `main` and on the 3.2.3 the consumer's lockfile resolves — `as`, `satisfies`, `!`, `<T>` all do. The inline-property shape is quiet since 3.2.0 (the `Property` exemption); it reported on 3.0.3 inside a test body. |

Every row marked **reports** fails a RuleTester case on the unfixed rule:
9 cases in `eslint-plugin-reliability`, 12 in `eslint-plugin-maintainability`
(6 for FP 8 and FP 10, 6 for FP 12), 4 in `eslint-plugin-conventions`, 2 in
`eslint-plugin-operability`.

## Affected users and systems

- `eslint-plugin-reliability` — `no-missing-null-checks`, `no-unhandled-promise`
- `eslint-plugin-maintainability` — `no-unhandled-promise`, `no-missing-error-context`, `consistent-function-scoping`
- `eslint-plugin-conventions` — `prefer-dependency-version-strategy`
- `eslint-plugin-operability` — `require-data-minimization`
- `eslint-plugin-secure-coding` — `no-insecure-comparison`: pins only, no rule change
- Any consumer running the `recommended` presets on a codebase that narrows
  with `in` or optional chains, passes callbacks into async functions, writes
  package.json fixtures in tests, defines its own `Error` subclasses, exports
  static configuration, or casts a module-scope function through `as`.

## Constraints

- **No rule loses a case it reports today.** Every fix is a `valid` case that
  fails on the unfixed rule, beside an `invalid` case pinning the nearest shape
  that must still report. The five package suites stay green.
- **Evidence, never a name.** A fix may read what the file shows — an `in`
  operand, a type annotation, a literal value, a default parameter — and may
  not add a word to a vocabulary or a spelling to an allowlist.
- **Twins agree.** `no-unhandled-promise` and `no-missing-error-context` ship
  in two plugins; the same cases go into both files so they cannot drift apart
  again silently.
- **The consumer's repo is not touched.** Its overrides come out on its own
  schedule, after the patched versions publish.
- **A block that silences a true positive, or a report the rule does not make
  on `main`, is documented — not fixed.** FP 7 is that row.

## Success criteria

- Each of the four packages with a rule change carries a `valid` case
  reproducing the consumer's shape, proven red on the unfixed rule (recorded in
  `design.md` § Verification), and green after.
- Each carries an `invalid` case for the adjacent shape that must keep
  reporting, green before and after.
- `turbo run build` and `turbo run test` green across the graph; whole-graph
  `tsgo` typecheck green.
- One changeset per fixed defect, `patch`, written for the consumer reading the
  CHANGELOG.
- After the patched versions publish, burgee removes blocks FP 1, 8, 9, 10, 11,
  may restore the `as unknown as` cast and inline callbacks FP 12 made it hoist,
  and its own gate stays green. FP 7 stays, with its comment corrected to name
  `token`, unless a later intent decides the vocabulary question.

## Done when

- The four rule changes and their locks are merged and released.
- `design.md` § Verification records the red-then-green run for every case.
- burgee's `eslint.config.mjs` loses five of the six blocks on its next
  dependency bump.

## Open questions

- `no-insecure-comparison` treats every `token` as a credential. In a parser
  a token is a lexeme; in an auth layer it is a bearer secret. Nothing in the
  AST distinguishes them, and the closed vocabulary is what makes the rule's
  precision defensible. Whether to offer the vocabulary as an option that
  REPLACES the default — the answer this repo gave `require-data-minimization`
  — is a separate decision with its own corpus measurement.
- The maintainability `no-unhandled-promise` twin lacks the
  `isPromiseDelegatedToCaller` arm its reliability sibling has (`return
p.then(…)` reports in one plugin and not the other — `commander-command.ts:909`).
  Same class of drift as FP 10, found while measuring; not this intent's scope.
