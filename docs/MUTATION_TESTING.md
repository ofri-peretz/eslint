# Mutation testing (Stryker)

Coverage tells you a fixture _executed_ a line of a rule. It does not tell you
any fixture would _notice_ if that line were wrong. [Stryker](https://stryker-mutator.io)
answers the second question: it rewrites the rule source one small change at a
time (`===` → `!==`, a guard → `true`, a detection list → `[]`, a `return` →
nothing), re-runs the tests that reach that line, and records whether anything
went red.

- **Killed** — some test failed. The suite pins that piece of behaviour.
- **Survived** — every test still passed. The rule could change there and
  nothing here would say so.
- **No coverage** — no test even reaches the line.

Score = (killed + timed out) / (killed + timed out + survived + no coverage),
per rule.

## Running it

```bash
npm run mutation -- --plugin jwt-security                       # one plugin, in full
npm run mutation -- --plugin jwt-security --since origin/main   # only rule files you changed
npm run mutation -- --all                                       # every opted-in plugin
npm run mutation -- --plugin jwt-security --grade-only          # re-grade the last report
```

The HTML report lands in `benchmark-results/stryker/<plugin>/index.html`
(git-ignored). Open it; every survivor is shown inline on the source line with
the exact replacement that lived.

Defaults are deliberately gentle for a dev machine: `--concurrency 2`, and
`incremental` mode, so a re-run only re-tests mutants whose code or covering
tests changed (state in `.cache/mutation/`). Incremental results can be stale
for _static_ mutants (module-level code such as a pattern list): a new test
that kills one is not noticed. Pass `--force` to re-test everything;
`--update-baseline` always does, and CI has no cache. A full pilot run of
`postgresql-security` + `jwt-security` is ~30 minutes at concurrency 3.

Everything is in one shared config, [`scripts/mutation/stryker.config.mjs`](../scripts/mutation/stryker.config.mjs).
It mutates `src/rules/**` only — not tests, not the plugin's `utils/`. Two
things are excluded on purpose, and both are documented in the config:

- **String literals.** Mutating a message template proves nothing.
- **A rule's `meta` block** ([`ignore-rule-meta.mjs`](../scripts/mutation/ignore-rule-meta.mjs)) —
  docs URLs, CWE, schema. They cannot change a verdict. `defaultOptions` is
  _not_ excluded: a default the rule reads is behaviour.

## Reading a survivor as an FP or FN signal

Every surviving mutant is a question: _what input would tell the original and
the mutant apart?_ The answer is the fixture you are missing, and which list it
belongs in tells you which kind of blind spot it was.

| The mutant weakens…                                          | e.g.                                                                                 | What can now ship unnoticed                               | The fixture you are missing                         |
| :----------------------------------------------------------- | :----------------------------------------------------------------------------------- | :-------------------------------------------------------- | :-------------------------------------------------- |
| a **guard / exclusion** (a check that _suppresses_ a report) | `if (isParameterised(arg)) return;` → `if (false) return;`                           | a **false positive** — the rule stops excluding safe code | a **`valid`** case that only the guard keeps quiet  |
| **detection** (a check that _leads to_ a report)             | `if (isUserInput(arg)) report()` → `if (false) report()`; `SINKS = ['query']` → `[]` | a **false negative** — the rule stops finding the bug     | an **`invalid`** case that only that branch catches |
| a **boundary**                                               | `args.length < 2` → `<= 2`                                                           | either, at the edge                                       | the edge case itself — usually one of each          |

Then ask whether the gap is real:

1. **Write the fixture the mutant implies, against the original rule.** If the
   original rule gets it right, you have just pinned behaviour that was free
   to drift — commit the fixture. That is most survivors.
2. **If the original rule gets it wrong**, the survivor found a real FP or FN.
   Fix the rule with that fixture as the failing test (see
   [the lock discipline](../CLAUDE.md)), and say in the PR that it is a
   behaviour change.
3. **If no input can tell them apart**, the mutant is _equivalent_: the code is
   redundant (a check another check already implies), dead (an option the rule
   never reads), or defensive. Do not write a test for it. Note it in the PR,
   and consider deleting the redundant code instead — that both raises the
   score and removes a place for a future bug to hide.

Two survivor shapes that are _not_ test gaps:

- **`Survived` with 0 tests run** — the mutant crashed the test file at import
  (e.g. the whole `createRule({...})` argument → `{}`). Nothing ran, so the
  ratchet excludes these.
- **`defaultOptions` mutants in a rule that never reads its options.** The
  mutant is equivalent because the option is dead. That is an API finding —
  an advertised option with no effect — not a missing fixture.

Mutation testing does not replace the corpus scan (`weekly-corpus-scan.yml`).
A survivor says a fixture is missing; it cannot say whether real code looks
like that fixture. The corpus answers that.

## The ratchet

[`.agent/mutation-baseline.json`](../.agent/mutation-baseline.json) holds a
banked score per rule. A plugin with an entry there is **opted in**.

- A rule whose score drops below its banked score **fails** the run.
- A rule in an opted-in plugin with **no** banked score fails too — a new rule
  gets graded when it lands, not "eventually".
- A higher score is reported as `IMPROVED`; bank it with
  `npm run mutation -- --plugin <name> --update-baseline` so it cannot slide
  back.
- `--update-baseline` never lowers a score. Lowering one takes
  `--allow-regression` as well, which makes it a visible decision in review.

`scripts/__tests__/mutation-ratchet.lock.test.ts` locks the grading rules and
that every rule an opted-in plugin ships has a banked score.

## CI

[`.github/workflows/mutation.yml`](../.github/workflows/mutation.yml):

- **Pull requests** (non-draft) that touch `packages/eslint-plugin-*/src/rules/**`
  mutate only the changed rule files of opted-in plugins
  (`--all --since origin/<base>`), so cost scales with the change.
- **Weekly** (Sat 02:47 UTC) and on dispatch: every opted-in plugin in full.
- Both upload the HTML report as the `mutation-report` artifact and write the
  per-rule table to the job summary. A scheduled failure files a tracking issue.

## Opting a plugin in

1. `npm run mutation -- --plugin <name>` (budget a few minutes per 100 mutants
   at concurrency 2).
2. Triage the survivors as above. Commit the fixtures that kill the
   high-value ones; fix any real FP/FN in a clearly separated commit.
3. `npm run mutation -- --plugin <name> --update-baseline` to bank the scores.
   The plugin is now opted in: PRs that change its rules are graded, and the
   weekly run includes it.

### Opting a large plugin in batch by batch

A 40-rule plugin is several thousand mutants and more survivors than one PR
can triage honestly. Bank it a batch of rules at a time instead:

```bash
npm run mutation -- --plugin node-security --rules no-zip-slip,no-ssrf          # run one batch
npm run mutation -- --plugin node-security --rules no-zip-slip,no-ssrf --update-baseline
```

The first batch also adds a `pending` array to the plugin's baseline entry,
naming every rule not banked yet. `pending` is a named backlog, not a wildcard:

- `--all`, `--plugin` and `--since` skip pending rules, so the weekly run and
  PR runs cost only what is banked.
- Banking a pending rule (`--rules … --update-baseline`) moves it out of
  `pending`. When the list empties, the key goes away.
- A rule in neither `rules` nor `pending` (a new rule) is still mutated and
  fails as `unbaselined`, and `mutation-ratchet.lock.test.ts` requires every
  shipped rule to be in exactly one of the two.

## Rollout

Opted in: `postgresql-security` and `jwt-security` (the pilot), then
`mongodb-security` (16 rules, 1,822 mutants, ~7 min at concurrency 3), then
`node-security` batch 1 (12 of its 43 rules; the other 31 are `pending`).

One lesson from `mongodb-security` applies to every plugin with a file-level
module gate (`if (!fileUsesMongo(ast)) return {}`): a sweep of non-SDK files
that no rule would report anyway cannot kill the gate's `if (false)` mutant,
so it survived in every rule. What kills it is a per-rule snippet that _is_
reported once the file imports the SDK and is silent without the import — see
`packages/eslint-plugin-mongodb-security/src/module-gate.lock.test.ts`.

Proposed order for the rest, each as its own PR (run → triage → bank):

1. ~~**`mongodb-security`**~~ — done.
2. **`node-security`** (43 rules) — below the floor too, and the largest
   plugin after `browser-security`. Banked in batches with `--rules` (above):
   batch 1 (12 `recommended` rules) is in, the rest are its `pending` list.
   Its gates are test-path exemptions rather than an SDK import; the same
   lesson applies, and `src/test-path-gate.test.ts` is its gate table.
3. **`secure-coding`** (34 rules) — cross-cutting and in every preset, so a
   blind spot there reaches the most users.
4. **`express-security`** (28), **`browser-security`** (46),
   **`nestjs-security`** (10), **`lambda-security`** (14) — the large
   framework plugins whose rules are almost all in `recommended` (179 of the
   223 shipped rules are; `.agent/preset-membership-audit.md`).
5. **`mcp-sdk-security`** (15), **`vercel-ai-security`** (19).
6. **The thin per-driver / per-SDK plugins** (`mysql`, `sqlite`, `knex`,
   `drizzle`, `prisma`, `sequelize`, `typeorm`, `supabase`, `openai`,
   `anthropic`, `gemini`) — their rules are 30–80 line wrappers over
   `@interlace/eslint-devkit` factories, so mutating `src/rules/**` measures
   the wrapper and not the detection. Mutate the devkit factories instead,
   against these plugins' tests; that needs a `--mutate` that points outside
   the plugin, which is a small extension of `scripts/mutation.mts`.
7. The non-security plugins last.

Budget: the pilot took ~5 min for `jwt-security` (1,617 mutants) and ~24 min
for `postgresql-security` (5,197 mutants) at concurrency 3 on a dev machine.
`no-unsafe-query` alone is a large share of the latter; plugins of that size
belong in the weekly run and in `--since` PR runs, not in a local loop.

## How this differs from `check:lock-proofs`

[`scripts/prove-locks.mts`](../scripts/prove-locks.mts) and Stryker both break
code on purpose, in opposite directions:

|           | `check:lock-proofs`                                    | Stryker                                      |
| :-------- | :----------------------------------------------------- | :------------------------------------------- |
| Mutations | one, hand-written in a lock's `@provenBy`              | every mutation the operators can generate    |
| Subject   | a repo invariant (workflow, script, config)            | rule source under `src/rules/`               |
| Question  | _does this lock fail when the thing it guards breaks?_ | _does any test fail when this line changes?_ |
| Finds     | a vacuous lock                                         | an unpinned line of a rule                   |

A lock proof certifies a _test_; mutation testing audits the _code_ for places
no test certifies. Neither replaces the other.
