# Rule corpus — `secure-coding/detect-non-literal-regexp` (CWE-400)

**The question this corpus exists to answer:** this rule is a port of
`eslint-plugin-security/detect-non-literal-regexp`. A port only earns its place
if it is *better* than the original — so every fixture here is chosen to be a
case where the two plugins should, or do, disagree.

The original is nine lines of logic: visit `NewExpression`, and report unless the
first argument passes their `isStaticExpression`. Two consequences follow
directly, and this corpus tests both:

- **It cannot see any constructor that is not spelled `new RegExp`.** The
  callable form `RegExp(x)`, the `globalThis.RegExp` form, and the captured-native
  `const R = RegExp` form all evaluate to the same intrinsic and all reach the
  same sink.
- **Its notion of "static" stops at `const`.** Patterns the program fully decides
  — a joined constant array, a loop counter, a `let` whose every write is a
  literal, a `String.raw` source — are reported as attacker-controlled ReDoS.

`safe/` is therefore not padding. Each safe fixture is a shape a real codebase
compiles on every boot, and each one that reports is a finding a maintainer has
to triage before deciding the plugin is not worth keeping.

## Scores

`RESULTS.json` is the verbatim output of
`benchmarks/suites/ilb-rule-duel/run.mjs`, which now carries a `COMPETITORS`
entry for this rule id — so both rows below come from the one committed runner:

```
npx tsx benchmarks/suites/ilb-rule-duel/run.mjs secure-coding/detect-non-literal-regexp
```

### §0.5 RESTATEMENT — 2026-08-17

**The corpus is an instrument, and this one grew without its numbers being
restated.** The table below previously read 10/0/0 against their 7/5/3 (63.6%)
over "the same 19 files". The corpus now holds **30 files** — 15 vulnerable and
15 safe. Eleven fixtures were added across the adversarial wave and the lock
session without the same-commit callout §0.5 requires, so every figure derived
from the 19-file set was silently obsolete, including the 63.6% quoted in
planning docs.

Re-derived on the full 30 files, both sides, same command:

| Plugin | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Interlace `secure-coding/detect-non-literal-regexp` | 15 | 0 | 0 | 100.0% | 100.0% | **100.0%** |
| `eslint-plugin-security/detect-non-literal-regexp` | 12 | 7 | 3 | 63.2% | 80.0% | **70.6%** |

Their misses: `05-call-form-no-new`, `08-global-namespaced-constructor`,
`09-aliased-constructor` — all three constructor spellings.
Their false positives: `03-const-array-join`, `04-closed-set-lookup`,
`05-escaped-inline`, `05-loop-counter-placeholder`,
`07-let-with-literal-branches`, `08-for-of-const-pattern-list`,
`09-string-raw-source` — every one a constant- or neutralised-provenance shape.

**Tier: `INT`.** Both sides run on fixtures we authored. It is a regression gate
and a statement about which shapes each implementation can see — not a precision
claim about real code. The real-code number lives in `BENCHMARK-RESULTS.md` §B
and requires the §A2 sampled-FP protocol.

## What the adversarial wave cost, and bought

The first wave (7 vulnerable / 6 safe) scored **100.0% F1**. That number meant
very little: the fixtures were written from the vulnerability, but not written to
*break* anything. Six more fixtures aimed at the rule's seams took it to
**76.2%** (TP 8 / FP 3 / FN 2) and proved five defects, all now fixed and locked:

| # | Fixture | Defect | Fix |
|---|---|---|---|
| 1 | `vulnerable/08-global-namespaced-constructor.js` | FN — `new globalThis.RegExp(p)` invisible; the callee test was `callee.name === 'RegExp'` | `isRegExpConstructor` accepts a non-computed member off an *environment* global namespace (`globalThis`/`global`/`window`/`self`), verified through the scope chain |
| 2 | `vulnerable/09-aliased-constructor.js` | FN — `const NativeRegExp = RegExp; new NativeRegExp(p)` invisible | same helper resolves a single-definition `const` alias to its initialiser, recursively (depth-bounded) |
| 3 | `safe/07-let-with-literal-branches.js` | FP — `isConstantBinding` demanded the `const` KEYWORD, so a `let` whose every write is a string literal read as attacker-controlled | the keyword check is gone; every write reference must itself be build-time constant. A write with no inspectable expression (`for (x of unknown)`) leaves the binding unproven and still reports |
| 4 | `safe/08-for-of-const-pattern-list.js` | FP — a `for (const s of CONST_LIST)` binding has `declarator.init === null`, so the check gave up on a provably closed value set | when `init` is null, the binding is constant iff its declaration is the `left` of a `ForOfStatement` whose `right` is build-time constant |
| 5 | `safe/09-string-raw-source.js` | FP — a `String.raw` tagged template is a `TaggedTemplateExpression`, a node type that `isBuildTimeConstant` did not handle | added, gated on the tag resolving to the real `String.raw` intrinsic and every substitution being constant |

Every fix is a resolution or an AST shape. No fix reads a spelling: fixture
`vulnerable/10-innocuous-identifier-names.js` is fixture 02 with every identifier
renamed to a word carrying no security connotation, and it must keep reporting.

## A test in the rule's own suite pinned a false positive as correct

`detect-non-literal-regexp.test.ts` carried this under `invalid`:

```js
'const RegExp = myFunction; RegExp(pattern);'   // errors: [{ messageId: 'regexpReDoS' }]
```

annotated *"Rule may detect RegExp calls even when reassigned / This is a
limitation of static analysis"*. No regular expression is constructed anywhere in
that program — `RegExp` is a local binding to `myFunction`. The rule fired
because the identifier was **spelled** `RegExp`. The case now sits under `valid`,
alongside the parameter-shadowing form, and both fail on the unfixed rule.

## Deliberately NOT fixed

- **A pattern imported from another module** — `import { PATTERN } from './patterns.js'; new RegExp(PATTERN)`
  reports. Cross-module provenance is not decidable from one file: the exporting
  module is free to write `export const PATTERN = process.env.FILTER`. Reporting
  is the conservative direction and matches devkit's stated doctrine, so no
  fixture pins it either way.
- **A correct escape helper** — `new RegExp(escapeRegExp(userInput))` reports,
  even when `escapeRegExp` is a genuine `.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.
  Clearing it would mean trusting a **local function by its name**, and the
  identical file with `function escapeRegExp(s) { return s; }` is a live
  vulnerability. That is the trusted-name trap; the rule stays conservative.
