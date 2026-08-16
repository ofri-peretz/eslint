# Full parity with `eslint-plugin-security` — and better

**Goal (Ofri, 2026-08-13):** every capability they have, none of their false
positives or false negatives, our version of each rule strictly better.

**Branch:** `feat/security-parity-complete` (from the never-merged
`fix/security-parity-2026-08`, merged with `origin/main` @ `e2b9537d`).

---

## Where we actually stand

Their RuleTester corpus is vendored verbatim at
`benchmarks/corpus/competitor-parity/eslint-plugin-security.json`
(189 cases: 84 invalid / 105 valid, Apache-2.0, attribution retained).

| | cases | covered | note |
|---|---|---|---|
| raw must-detect | 84 | 51 | 60.7% |
| "live" (won't-fix excluded) | 50 | 50 | 100% |

The 34-case gap, which Ofri's instruction now puts **in scope**:

| their rule | uncovered | our home | why that plugin |
|---|---|---|---|
| `detect-buffer-noassert` | 29 | **node-security** | `Buffer` is Node stdlib — the platform, not an SDK |
| `detect-pseudoRandomBytes` | 1 | **node-security** | `crypto` is a Node built-in |
| `detect-bidi-characters` | 1 | **secure-coding** ✓ already | source-text Unicode; no platform, no SDK |
| `detect-unsafe-regex` | 1 | **secure-coding** | language-level ReDoS |
| `detect-no-csrf-before-method-override` | 1 | **express-security** | gate is `csurf` + `method-override`, both Express middleware |
| `detect-disable-mustache-escape` | 1 | **secure-coding**, off by default | see below |

Placement is decided by the **detection gate**, not the vulnerability class
(the `no-sql-injection` precedent: SQL injection is universal, but detecting it
means matching a driver's sinks). Verified mechanically, not by judgement:
`lint-plugin-taxonomy.ts` lists **both `mustache` and `csurf`** in `SDK_TOKENS`,
so putting either rule in secure-coding / node-security / browser-security
fails `npm run lint:taxonomy`. The merged branch currently passes it —
121 rules, 15 allowlisted legacy violations, no new SDK gates.

### DECIDED: `no-disabled-template-escaping` → secure-coding, off by default

Ofri, 2026-08-13: *"why disabling mustache escape cannot be part of secure
coding. It can be not part of the recommended, but it can be there. Why not?"*
He is right, and the earlier objection was weak.

Shipping a new package for one rule costs a release pipeline, docs, README,
registry entry and taxonomy config, and lands at zero downloads. secure-coding
reaches 28.5k weekly installs the day it publishes. Keeping it out of
`recommended` answers the only other objection (downstream noise).

This is not a special case — it is the `no-sql-injection` pattern already in
use: **debt with a documented destination**, allowlisted now, migrated at the
next major. 15 such entries exist; a 16th that is deliberate and labelled is
honest. Letting the linter force a package into existence would be the guard
dictating architecture.

Two upgrades over their version, both of which make it strictly better:

- **Nine engines, not one.** Theirs is `mustache.escapeMarkup = false` alone.
  The same footgun is handlebars triple-stache / `SafeString`, ejs `<%-`,
  pug `!=`, nunjucks `autoescape: false`, plus dot / eta / liquid.
- **Gated on the import, not the identifier.** Matching a bare `escapeMarkup`
  property would fire on any object carrying one — the shape-not-meaning
  failure the FP sweep was built to remove. Resolving the receiver to a real
  template-engine import is *why* it trips `SDK_TOKENS`, which makes the
  allowlist entry the correct mechanism rather than a workaround.

Required with it: a `GRANDFATHERED` entry in `lint-plugin-taxonomy.ts` whose
migration target is a future `eslint-plugin-template-security`.

## The one genuine conflict — resolve before anything else

8 tests fail after the merge, all on module-binding parity cases:

```js
var one = require('fs').readFile; one(filename);   // they report; we now don't
require('child_process').exec(str);                 // they report; we now don't
```

`filename` and `str` are **free identifiers**. PR #546 (shipped) inverted these
rules from *"can I prove this is constant?"* to *"can I prove taint reaches
it?"*, because adjudicating 113 findings by hand found **105 false — 7%
precision**.

**Hypothesis to test, not assume:** every one of those 105 FPs was a
*resolvable* path — `path.join(__dirname, …)`, a local `const`, a glob of the
repo's own files, a thin facade forwarding its own parameter. Their `filename`
is *unresolvable*. If "unresolvable provenance" reports and "resolvable and
provably safe" stays quiet, both goals may hold at once.

**Gate:** the change is only kept if, measured in the same session:
- `scripts/corpus-scan.ts` (8 real repos) does not regress precision, and
- `scripts/recall-gate.ts` stays green (per-CWE high-water mark), and
- the parity runner gains the 8 cases.

If precision regresses, the parity cases are declared *their* false positives
and documented with the adjudication — "better" means being right, not matching.

## Order of work

1. [x] Merge `origin/main` into the branch — 5 conflicts resolved
       (fs `FS_MODULES` ∪ `FS_MODULE_EQUIVALENTS`; fs method list union;
       child-process imports union; rule count 32→33; generated JSON regenerated)
2. [x] devkit green — 100% coverage, `createModuleEvidence` +
       `resolveModuleBinding` coexist (2465 stmts, was 2285)
3. [x] **Resolve the 8 — hypothesis HELD** (`ded6221e`). Free variable
       (`ref.resolved === null`) reports; anything that resolves keeps #546's
       behaviour. All 8 parity cases pass, all 126 pre-existing fs tests and
       the full 1714-test node-security suite still pass at 100% coverage,
       benchmarks sdk-gate lock 94/94. Bonus FN fixed: `makeReadsTaintSource`
       read only the declarator, so `let c='ls'; c=req.query.c; exec(c)`
       answered `'ls'` — now judges the last write before the use.
3a. [x] **`corpus-scan.ts` run and clean.** The debt from step 3 is paid: the
       8 repos are cloned and scanned, **31 findings, 0 rules over budget**.
       Getting there cost one more inversion — see below.

### The last two corpus FPs: `process` is the operator, not an attacker

The scan opened at `node-security/detect-child-process: 2 findings, budget 0`,
both in Shopify/cli:

- `bin/changeset.js:17` —
  `spawn(process.execPath, [changesetBinPath, ...args], {stdio:'inherit'})`,
  reported `argumentInjection`. `args` is `process.argv.slice(2)`.
- `packages/plugin-cloudflare/src/install-cloudflared.ts:85` —
  `execFileSync(binTarget, ['--version'], {encoding:'utf8'})`, reported
  `childProcessCommandInjection`.

**The suspected root cause was wrong and the correction matters.** The second
was blamed on `DEFAULT_TAINT_SOURCES` matching identifiers by *name*, because
`binTarget` comes from `getBinPathTarget(env, …)` and `env` is a parameter
that happens to be spelled `env`. It is not a name match: `env` is not in the
roots list at all, and renaming it changes nothing —

```js
// c.js — silent. The spelling was never the trigger.
function getBin(env, platform) { return env.FOO || 'x' }
function main(env, platform) { execFileSync(getBin(env, platform), ['--version']) }
```

What actually fires is the **default value**: `install(env = process.env, …)`
records a write of `process.env`, `ded6221e`'s last-write-wins reader picks it
up, and `process` is a taint root. The binding analysis was already correct.
The wrong part was the *meaning* assigned to `process`.

So the fix is semantic, not structural. `process.argv` and `process.env` come
from whoever launched the program — someone standing at a shell, who can
invoke any binary with any flags without help. The no-shell path asks two
privilege-boundary questions and neither has that as an answer:

| position | question | `process` an answer? |
|---|---|---|
| argv[0] | can someone else choose the binary? | no — env config |
| argv[1..] | can someone else smuggle a flag (CWE-88)? | no — their own words |

`detect-child-process` now derives `readsRemoteTaintSource` (the configured
roots minus `process`) and uses it in `commandIsSteerable` and
`argumentInjectionSite`. The **shell** path keeps `process`, because there the
value becomes code: `execSync('rm -rf ' + process.argv[2])` still reports, and
that case is now labelled an FN guard for exactly this narrowing.

Consequences:

- `PROCESS_CONSTANTS` / `isProcessConstant` (the `process.execPath` allowlist
  drafted for finding 1) is **deleted** — subsumed, and it would have left an
  uncoverable branch. `isLiteralStringNode` went with it: the earlier
  `usesShell` rewrite left it with zero callers, which is where the missing
  statement/function in the 99.96% coverage report was coming from.
- Both labelled CWE-88 fixtures are `req`-rooted and keep reporting.
  No corpus fixture anywhere under `benchmarks/corpus` combines
  `child_process` with `process.argv`/`process.env`, so recall is untouched.

Four mutations were run to prove the new tests are not decorative — each
reverted one predicate and the suite went red:

| mutation | tests red |
|---|---|
| `commandIsSteerable` → `readsTaintSource` | 3 |
| `argumentInjectionSite` → `readsTaintSource` | 1 |
| `commandIsSteerable` → never steerable | 1 (FN guard) |
| final taint gate → `readsRemoteTaintSource` | 1 (`process.argv` + shell) |

and the two predicates inherited from `ded6221e` were re-checked the same way:
`isFreeReference → false` reds 9 tests, dropping last-write-wins reds 1.
### Gate readings at the end of step 3a (all measured, same session)

| gate | number |
|---|---|
| `packages/eslint-plugin-node-security` — `npm test` | 1718 passed / 79 files, **100%** stmts 3003/3003, branches 3303/3303, funcs 475/475, lines 2589/2589 |
| `packages/eslint-devkit` — `npm test` | **100%** stmts 2465/2465, branches 2003/2003, funcs 418/418, lines 2160/2160 |
| `benchmarks` — `sdk-gate-coverage.lock.test.ts` | 94/94 |
| `npm run lint:taxonomy` | 121 rules / 3 code-agnostic plugins, no new SDK gates, 15 allowlisted |
| `scripts/ilb-plugin-scope-audit.ts` | 0 findings |
| `npm run oxlint:shims:check` | 477/477 compatible, no drift |
| `scripts/corpus-scan.ts` | 31 findings across 8/8 targets, **0 rules over budget**, exit 0 |
| parity module-binding cases | 8/8 (4 fs + 4 child_process) |

4. [ ] `detect-buffer-noassert` → new rule (29 cases, the single largest block)
5. [ ] The five 1-case gaps
6. [ ] Re-run the parity runner → target 84/84 raw
7. [ ] Docs page + README row for every new rule (`sync-readmes` only lists
       rules that already have `docs/rules/<name>.md`)
8. [ ] Changesets, PR, release

## Not to be repeated

- This branch sat unmerged with **no PR** since 2026-08-11, holding
  `no-bidi-characters`, `resolveModuleBinding` and `isStaticExpression`.
  Nothing alerted; the parity number in memory went stale in the direction of
  understating us (36.9% raw vs 50/50 live).
- Never quote a parity figure without saying which denominator it uses.
