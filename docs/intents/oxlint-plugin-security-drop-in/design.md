# Design — `oxlint-plugin-security`, a façade over existing rules, gated by the incumbent's tests

Intent: [`intent.md`](./intent.md). Decision: [ADR 0008](../../adr/0008-oxlint-plugin-security-is-a-parity-gated-facade.md).
**Status:** draft.

---

## The mapping

**How the numbers were measured** (2026-10-25):

- Incumbent: `eslint-plugin-security@4.2.0`. Its 219 test cases were captured with
  `benchmarks/scripts/extract-competitor-cases.cjs`.
- Our side: the published `eslint-plugin-secure-coding@5.4.17` and
  `eslint-plugin-node-security@5.6.12`, run under ESLint 10.13.0.
- Each count enables **only the mapped rule**. This is per-rule scoring, not the "any
  rule fired" score that `run.mjs` reports.
- The harness was a scratch script. R7 commits it as the gate runner.

**What the incumbent's options look like.** None of its 15 rules declares a `schema`. So
a config written for it can't carry options under ESLint ≥ 9 or oxlint, and there is
nothing to translate on the way in. The column below lists only options the façade
**pins** through `meta.defaultOptions`. ADR 0008 fact 7 confirms oxlint honours them.
Wrapped rules keep their own schema, so a user can still pass our options under
`security/<id>`.

**Columns:**

- **Kind:** `wrap` re-exports an existing rule. `retire` is a deprecated stub that
  reports nothing. `gap` means no rule exists yet.
- **inv:** invalid cases where the mapped rule fires.
- **val:** valid cases where it fires (should be 0).

| #   | Incumbent ID (`security/…`)             | Interlace rule                                             | Kind   |   inv |   val | Pinned options                       | Gap and what closes it                                                                                                                                                                                                                                                                                                                                                              |
| :-- | :-------------------------------------- | :--------------------------------------------------------- | :----- | ----: | ----: | :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `detect-bidi-characters`                | `secure-coding/no-bidi-characters`                         | wrap   | 12/12 |   0/2 | none                                 | None. The 4.1.0 line-terminator cases are already covered.                                                                                                                                                                                                                                                                                                                          |
| 2   | `detect-buffer-noassert`                | `node-security/no-buffer-overread`                         | wrap   | 29/29 |  0/56 | none                                 | None in the numbers. **Remove it from `wont-fix.json`**, because we detect all 29. In Build, check that the message is about `noAssert` and not just a coincidental match.                                                                                                                                                                                                          |
| 3   | `detect-child-process`                  | `node-security/detect-child-process` (same name)           | wrap   | 15/15 | 11/19 | none                                 | 11 findings on valid cases, all `spawn(str)` / `child.spawn(str)` with a command we can't resolve. Tried `allowLiteralSpawn` and both `reportUnresolvedCommands` settings: no change. **Declare as a divergence** (intent, open question 3): a non-literal executable is CWE-78.                                                                                                    |
| 4   | `detect-disable-mustache-escape`        | none                                                       | gap    |   0/1 |   0/1 | —                                    | A live CWE-79 defect (`x.escapeMarkup = false`), so it can't be retired. **Closed by a new rule** that is wrapped here. Recommended: `secure-coding/no-disabled-template-escaping` (intent, open question 1). Until then, the gate is red on this one case.                                                                                                                         |
| 5   | `detect-eval-with-expression`           | `node-security/detect-eval-with-expression` (same name)    | wrap   |   1/1 |   1/3 | none                                 | Fires on a bare `eval()`. No argument means nothing can run, so this is a **false positive. Fix it in the rule** and add a case to the rule's tests.                                                                                                                                                                                                                                |
| 6   | `detect-invisible-characters`           | none                                                       | gap    |  0/13 |   0/7 | —                                    | New in 4.1.0. It covers U+3164 and U+FFA0 in strings, templates, identifiers and comments. `no-bidi-characters` doesn't catch them, even with `additionalCharacters`. **Closed by a new rule, `secure-coding/no-invisible-characters`**, with all 13 + 7 cases ported into its tests.                                                                                               |
| 7   | `detect-new-buffer`                     | `node-security/no-deprecated-buffer`                       | wrap   |   1/1 |   1/1 | none                                 | Fires on `new Buffer('test')`. The constructor is DEP0005 for any argument. **Declare as a divergence.**                                                                                                                                                                                                                                                                            |
| 8   | `detect-no-csrf-before-method-override` | none                                                       | retire |   0/1 |   0/1 | —                                    | The rule matches only `express.csrf()` and `express.methodOverride()`. Those were Express 3 built-ins: Express 4.22.3 throws when you read them, and on 5.3.0 they are `undefined` (R1 matrix). **Retire it.** Also fix `wont-fix.json`: its reason cites `csurf`, which isn't what the rule matches.                                                                               |
| 9   | `detect-non-literal-fs-filename`        | `node-security/detect-non-literal-fs-filename` (same name) | wrap   | 25/25 |  0/10 | `{ reportWholeProcessValues: true }` | The corpus case is closed (the old report named it as open). **Outside the corpus:** ours is silent on `fs.readFileSync(process.argv[2])` and theirs reports it. Ours is silent by design: whoever sets argv or the environment already controls which files the process opens. **Closed by the opt-in option from #1295**, which defaults to `false` and is pinned to `true` here. |
| 10  | `detect-non-literal-regexp`             | `secure-coding/detect-non-literal-regexp` (same name)      | wrap   |   1/1 |   0/2 | none                                 | None.                                                                                                                                                                                                                                                                                                                                                                               |
| 11  | `detect-non-literal-require`            | `node-security/no-dynamic-require`                         | wrap   |   2/2 |   0/4 | none                                 | None. `no-dynamic-dependency-loading` also fires on both cases. We map only one rule, so each line gets one finding.                                                                                                                                                                                                                                                                |
| 12  | `detect-object-injection`               | `secure-coding/detect-object-injection` (same name)        | wrap   |   1/1 |   0/1 | none                                 | None.                                                                                                                                                                                                                                                                                                                                                                               |
| 13  | `detect-possible-timing-attacks`        | `node-security/no-timing-unsafe-compare`                   | wrap   |   0/2 |   0/2 | `{ reportLiteralComparands: true }`  | **The two missing live cases:** `if (password === 'mypass') {}` and `if ('mypass' === password) {}`. `isSourceConstant()` skips literal comparands on purpose, to avoid false positives like `revokedToken === 'access'`. **Closed by a new option** that defaults to `false` in node-security and is pinned to `true` here (intent, open question 2).                              |
| 14  | `detect-pseudoRandomBytes`              | none                                                       | retire |   0/1 |   0/1 | —                                    | On every Node in the R1 matrix (measured 18.16 to 26.10), `crypto.pseudoRandomBytes === crypto.randomBytes` is `true`, so the API is the CSPRNG and the defect can't occur. **Retire it.** Also fix `wont-fix.json`: it says the API was "removed", but it still exists.                                                                                                            |
| 15  | `detect-unsafe-regex`                   | `secure-coding/no-redos-vulnerable-regex`                  | wrap   |   1/2 |   0/2 | none                                 | One case is declined: `new RegExp('x+x+)+y')` is not valid regex syntax. Core ESLint and oxlint already report it with `no-invalid-regexp`. The existing partial won't-fix stays.                                                                                                                                                                                                   |

**Totals on the 4.2.0 corpus (107 invalid, 112 valid):**

- 88 of 107 invalid cases are caught.
- Missing: 13 invisible-character, 2 timing, 1 mustache, 2 for the retired rules, and 1
  declined regex.
- 13 valid cases get a finding: 11 child-process and 1 new-buffer (divergences), plus 1
  bare `eval()` (false positive).

**After Build, if open questions 1–3 are accepted as recommended:**

- Every live case is caught. The denominator is 107 − 3 = 104: the two retired rules and
  the one declined regex case.
- Raw parity is 104/107.
- Findings on valid cases: exactly the 12 declared divergences.

## Requirements

- **R1 — package shape.** `packages/oxlint-plugin-security/` holds:
  - `package.json`: `"private": true`. It depends on `eslint-plugin-secure-coding` and
    `eslint-plugin-node-security` at exact versions, and devDepends on
    `eslint-plugin-security` at exactly `4.2.0`. The `eslint` peer is optional, as in
    the sibling intent's R1. `keywords` include `oxlint`, `oxlint-plugin`, `vite-plus`
    and `eslint-plugin-security`.
  - `mapping.json`.
  - `index.js` and `index.d.ts`.
  - `README.md` and `LICENSE`.

  **The supported runtime matrix**, which is what "a defect that can't occur on a
  supported runtime" is measured against:

  - **Node:** `engines.node` is `^18.18.0 || ^20.9.0 || >=21.1.0`. That is the
    incumbent's own range, so the swap never narrows it.
  - **Express:** the majors that are still published, 4 (`latest-4` 4.22.3) and 5
    (`latest` 5.3.0).

  A retirement is valid only with evidence that covers every entry in the matrix. The
  evidence goes in its `wont-fix.json` entry.

  - **`detect-pseudoRandomBytes`:** `crypto.pseudoRandomBytes === crypto.randomBytes`
    returned `true` on every local Node from 18.16.1 to 26.10.0 (24 versions, including
    18.19, 20.x, 22.x and 24.x), measured 2026-10-25.
  - **`detect-no-csrf-before-method-override`:** reading `express.csrf` throws
    `Most middleware (like csrf) is no longer bundled` on Express 4.22.3. On Express
    5.3.0 both `express.csrf` and `express.methodOverride` are `undefined`.

  If the matrix grows to a runtime where the evidence doesn't hold, the retirement
  reverts to a live rule or to a declared parity miss.

- **R2 — the mapping is data.** `mapping.json` has the shape
  `{ incumbent: { name, version }, rules: { <id>: { plugin, rule, defaultOptions? } | { retired: true, reason } } }`.
  It is the only place a rule ID's source is written (PRINCIPLES rule 7).
- **R3 — no logic.** `index.js` builds `rules` from `mapping.json`:
  - A wrapped rule with **no** `defaultOptions` in its mapping entry is the target
    rule object itself, unchanged (`rules[id] === target`). Its own
    `meta.defaultOptions`, if it has any, are untouched.
  - A wrapped rule **with** a mapping override is
    `{ ...target, meta: { ...target.meta, defaultOptions: override } }`. Its `create`
    is unchanged.
  - The R4 lock covers both cases. Every rule without an override must be the
    identical object, and every rule with an override must have exactly the mapped
    `meta.defaultOptions`.
  - A retired rule is `{ meta: { deprecated: true, docs, schema: [] }, create: () => ({}) }`.

  The plugin's `meta` is `{ name: 'oxlint-plugin-security', version }`. `configs`
  mirrors the incumbent's `recommended` (flat, `name: 'security/recommended'`, all 15
  rules at `warn`) and its `recommended-legacy`.

- **R4 — exact ID set.** The keys of `mapping.json`'s `rules` equal
  `Object.keys(require('eslint-plugin-security').rules)` at the pinned version. Every
  wrapped target exists in its plugin.
- **R5 — both engines.** Every one of the 15 `security/<id>` resolves:
  - under oxlint via `jsPlugins: ["oxlint-plugin-security"]`;
  - under ESLint via `plugins: { security }` and via `security.configs.recommended`.

  A deliberately unknown sentinel ID must be rejected, which proves that acceptance
  means something.

- **R6 — corpus at the pinned version.** `benchmarks/corpus/competitor-parity/eslint-plugin-security.json`
  is re-vendored from 4.2.0 (219 cases), keeping the header and the attribution.
  `wont-fix.json` is corrected:
  - drop `detect-buffer-noassert`;
  - fix the reasons for `detect-pseudoRandomBytes` and
    `detect-no-csrf-before-method-override`;
  - add `retired: true` to the entries the façade stubs.
- **R7 — the gate runner.** `benchmarks/suites/ilb-competitor-parity/drop-in.mjs` loads
  only the façade, from the repo build, because the gate guards what is about to ship.
  For each incumbent class, it enables only `security/<class>`, under ESLint and then
  under oxlint (one oxlint run per class, over a temp directory of that class's cases).
  It exits non-zero on any of these:
  - an ID that doesn't resolve;
  - a live invalid case not reported, where "live" means not covered by `wont-fix.json`;
  - a finding on a valid case that isn't listed in `divergences.json`;
  - an entry in `divergences.json` that no longer fires (a stale declaration);
  - per-case diagnostics that differ between ESLint and oxlint.

  **"Differ" has a precise meaning.** For each case, the runner compares the multiset
  of `(ruleId, line, column, endLine, endColumn)` tuples, normalized to 1-based lines
  and columns. Three things are deliberately **not** compared:

  - **Message text.** It comes from the same rule object, but engines format it
    differently. oxlint prints `security(id): …`.
  - **Severity.** It comes from the config, not from the rule.
  - **Fixes and suggestions.** They are reported side by side but don't gate, because
    oxlint's JS-plugin fix support is a separate contract.

  If an engine doesn't report an end position, the runner compares only
  `(ruleId, line, column)` for that case and says so in its output.

- **R8 — control run.** `drop-in.mjs --subject eslint-plugin-security` runs the incumbent
  through the same harness and must report 100% and 0. If it doesn't, the harness is
  wrong and the gate's result means nothing.
- **R9 — gate before the act.** A lock in `scripts/__tests__/` fails when
  `packages/oxlint-plugin-security/package.json` has `private !== true` and `drop-in.mjs`
  exits non-zero. Flipping `private` is the act that publishes, so the check reads the
  state before that act.
- **R10 — work on existing packages that the gate forces.** Each item lands with a test
  in its own package that fails without the fix:
  - `secure-coding/no-invisible-characters` (new rule);
  - `no-timing-unsafe-compare` option `reportLiteralComparands` (default `false`);
  - `detect-eval-with-expression` stays silent on a bare `eval()`;
  - `detect-non-literal-fs-filename` option `reportWholeProcessValues` (default `false`), from #1295. The façade pins it so that `fs.readFileSync(process.argv[2])` reports;
  - the mustache rule, per open question 1.
- **R11 — drift.** The existing `weekly-benchmark.yml` gets a step that compares
  `npm view eslint-plugin-security version` with `mapping.json`'s `incumbent.version`
  and opens an issue when they differ. A new incumbent rule means a config that fails to
  load in oxlint, so this has to be noticed within a week, not at the next audit. It
  goes on a schedule, not in PR CI, per the repo's checks-on-a-schedule rule.
- **R12 — `run.mjs` ratchet.** Commit `baseline.json` for the existing any-rule suite so
  its ratchet actually runs. The 2/2 → 0/2 timing regression passed silently because
  there was no baseline.

## Design

**Order:** R6 → R10 (in node-security and secure-coding, as separate PRs per package if
that is smaller) → R1–R4 → R7–R8 → R5, R9 → R11, R12.

The gate is red until R10 lands, which is the point. The package can merge while still
private.

- **No generator.** `index.js` reads `mapping.json` at load time, so it is ~15 lines and
  can't drift from the data. The derived artifacts are the README mapping table and the
  `index.d.ts` rule-ID union. Both are written by `scripts/generate-oxlint-security.ts`,
  which has a `--check` mode, using the same idiom as `generate-oxlint-shims.ts` and the
  sibling's alias generator.
- **Coordination with `oxlint-native-plugin-names`.** That generator enumerates
  `packages/eslint-plugin-*` and writes `packages/oxlint-plugin-<name>/`. There is no
  `eslint-plugin-security` in this repo, so the names never collide. Its `--check`
  "extra files" scan must skip `oxlint-plugin-security`. The 24 gates that enumerate
  `packages/*` are handled the same way the sibling handles them: participate or skip,
  each with a one-line comment naming this intent.
- **Version.** The package has its own semver (PRINCIPLES rule 8). Exact dependency pins
  plus `updateInternalDependencies: "patch"` mean every release of a mapped plugin
  produces a façade patch, and the gate runs on it. The gate job runs in PR CI when
  `packages/oxlint-plugin-security/**`, `packages/eslint-plugin-node-security/**`,
  `packages/eslint-plugin-secure-coding/**` or `benchmarks/suites/ilb-competitor-parity/**`
  change.
- **Divergences are data too.** `benchmarks/suites/ilb-competitor-parity/divergences.json`
  follows the shape of `wont-fix.json`: one entry per incumbent valid case we report,
  with `reason` and `reconsiderIf`. The README renders it. A divergence that isn't in the
  file fails the gate.
- **README.**
  - The first line says it is an independent package, not affiliated with
    eslint-community or oxc.
  - Then the install command and a `.oxlintrc.json` that is identical to the user's
    current one.
  - Then the clash warning (oxlint silently keeps one plugin) with the
    `{ "name": "security-legacy", "specifier": "eslint-plugin-security" }` escape hatch.
  - Then the generated mapping table, the declared divergences and the retired IDs.
  - Then the parity line, copied from the gate's output with its date.
  - No unqualified speed claims, because both plugins run as JS plugins under oxlint.

**Files:**

| Path                                                                                                                                    | Change                                                  |
| :-------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| `packages/oxlint-plugin-security/*`                                                                                                     | new: R1–R3                                              |
| `scripts/generate-oxlint-security.ts`                                                                                                   | new: README table and `index.d.ts`, with `--check`      |
| `scripts/__tests__/oxlint-security.lock.test.ts`                                                                                        | new: R4, R5, R9, plus a pin of oxlint's clash behaviour |
| `benchmarks/suites/ilb-competitor-parity/drop-in.mjs`                                                                                   | new: R7, R8                                             |
| `benchmarks/suites/ilb-competitor-parity/divergences.json`                                                                              | new                                                     |
| `benchmarks/suites/ilb-competitor-parity/wont-fix.json`                                                                                 | R6 corrections                                          |
| `benchmarks/suites/ilb-competitor-parity/baseline.json`                                                                                 | new: R12                                                |
| `benchmarks/corpus/competitor-parity/eslint-plugin-security.json`                                                                       | re-vendored at 4.2.0                                    |
| `packages/eslint-plugin-secure-coding/src/rules/no-invisible-characters/`                                                               | new rule                                                |
| `packages/eslint-plugin-node-security/src/rules/{no-timing-unsafe-compare,detect-eval-with-expression,detect-non-literal-fs-filename}/` | R10                                                     |
| `.github/workflows/` (gate job), `weekly-benchmark.yml` (R11)                                                                           | CI                                                      |
| `docs/planning/BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md`                                                                                  | restate §2 against 4.2.0                                |

## Verification

**The loop:**

```bash
node benchmarks/suites/ilb-competitor-parity/drop-in.mjs && npx vitest run --config scripts/__tests__/vitest.config.mts oxlint-security
```

**Prove each check fails on the unfixed state** (CLAUDE.md rule 4):

- `drop-in.mjs` against the façade **before R10** must exit 1 and list:
  - 15 live misses (13 invisible-character, 2 timing);
  - 1 bare-`eval()` false positive;
  - the mustache case.

  This is today's state, measured above.

- `drop-in.mjs` with `divergences.json` emptied must exit 1 on the 12 declared
  divergences.
- `drop-in.mjs --subject eslint-plugin-security` must exit 0. If it fails, the harness
  is broken.
- The R4 lock, with `detect-invisible-characters` deleted from `mapping.json`, must
  fail and name it. This is the 4.1.0 drift in reverse.
- The R5 lock must fail when `meta.name` is changed to `eslint-plugin-secure-coding`,
  because every ID becomes "not found".
- The R9 lock, with `private: false` and the gate red, must fail.
- Each R10 test must fail with its fix reverted.

**The gate:** `npm run ci:local` must be green before the PR opens.

**How to reproduce today's numbers** until R7 lands:

1. In a scratch directory, install `eslint@10`, `eslint-plugin-security@4.2.0` and the
   published secure-coding and node-security packages.
2. Run `extract-competitor-cases.cjs`, with its output path redirected.
3. For each class, lint each case with only the mapped rule enabled. Count findings on
   invalid and on valid cases.

## Rejected alternatives

- **Alias secure-coding, or rename `meta.name` on a main plugin.** See ADR 0008. It
  breaks ESLint↔oxlint rule-ID portability and only covers 4 of the 15 IDs.
- **A generated `index.js` with one `require` per rule.** Reading `mapping.json` at load
  time is shorter and can't drift. Generation is kept for the README table and the
  types, where a human reads the output.
- **A wrapper that rewrites `context.options`.** It isn't needed: both engines honour
  `meta.defaultOptions`. A proxied `context` is also the most likely thing to break on
  oxlint's context object.
- **Composite IDs** (one incumbent ID backed by two of our rules, e.g. timing plus
  `no-hardcoded-credentials`). They need merged `messages` and visitors, which is logic
  in the façade. With the option in open question 2, every ID maps one-to-one.
- **Changing `no-timing-unsafe-compare`'s default to report literal comparands.** That
  brings back the measured `revokedToken === 'access'` class of false positives for
  every node-security user, to win two cases for façade users.
- **Retiring `detect-disable-mustache-escape` or `detect-invisible-characters`.** Both
  are live defects. A stub would silently remove detection the user had.
- **Gating on `run.mjs`'s weighted number.** It scores "any of 121 rules fired", which
  is an upper bound. It doesn't gate findings on valid cases, and it doesn't measure
  `security/<id>`.
- **Gating against the published plugins**, as `head-to-head.mjs` does. The gate guards
  what is about to ship, which is the repo build. Comparisons with the published
  packages remain the job of the benchmark report.
- **Publishing a placeholder to hold the name.** See ADR 0008's section on reputational
  risk.

## Out of scope

- Publishing, flipping `private`, Trusted Publishing setup, and telling eslint-community.
  These happen at Deploy, by Ofri.
- A separately named ESLint package. The same package already works under ESLint (ADR
  0008).
- Any rule the incumbent doesn't have. The façade's `recommended` mirrors the incumbent.
  Pointing users at the full plugins is README copy, not more rules.
- Throughput or speed claims. There is no committed runner that measures real source.
- The `oxlint-plugin-<name>` aliases. They belong to the `oxlint-native-plugin-names`
  intent.
