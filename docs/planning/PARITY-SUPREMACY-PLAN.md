# Parity supremacy plan — beat `eslint-plugin-security` on every criterion

**Goal:** make "replace eslint-plugin-security with Interlace" a defensible claim rather than
a falsifiable one. Today it is falsifiable — 59.6% weighted parity. This file is the living tracker.

Baseline: [BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md](./BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md).
Gate: `npm run ilb:competitor-parity` must reach **52/52 weighted** (not 84/84 — 32 cases are
declared won't-fix, see the belief filter in Part B) with fires-on-valid **≤ 5/105**.

---

## Part A — criteria they currently win

### A1. Install footprint — *my earlier number was wrong; corrected here*

The benchmark said "145 KB / 72 files vs 689 KB / 135 files". That compared **one** of their
packages against **three** of ours, and used npm's `unpackedSize` rather than what a user's
`node_modules` actually grows by. Measured properly — marginal cost in a project that already
has ESLint installed:

| Package | marginal install | new packages |
|---|---|---|
| eslint-plugin-security | 828 KB | 3 |
| **eslint-plugin-browser-security** | **828 KB** | **2** |
| **eslint-plugin-node-security** | **836 KB** | **2** |
| eslint-plugin-secure-coding | 2,368 KB | 5 |
| all three of ours | 2,956 KB | 7 |

So on 2 of 3 packages **we already match them on bytes and beat them on package count**.
The isolated-install figure (13 MB, 60 packages) was an artifact: we correctly declare `eslint`
as a non-optional peer, so npm auto-installs a full ESLint into an empty project. They declare
no peer at all — which is arguably a *defect* on their side, not an advantage.

Their tarball also ships `test/` (17 files), `docs/` (18), `.github/` (6) and a 20 KB
CHANGELOG — **83 KB of the 145 KB is dead weight for consumers**. We ship only `src` + README + LICENSE.

**Action:** only `secure-coding` is genuinely heavy — `scslre` + `@eslint-community/regexpp`
are ~1.5 MB, pulled in for ReDoS analysis that 3 of 28 rules use.
- [ ] Lazy-`require` scslre inside the ReDoS rules' `create()` rather than at module top level
- [ ] Move both to `peerDependenciesMeta.optional` with a graceful degrade (rule self-disables + warns once)
- [ ] Target: secure-coding marginal ≤ 900 KB / 2 packages
- [ ] Trim shipped README (21–27 KB) to a short overview + docs link

**Verdict after fix:** we win this criterion outright. Update the scorecard.

### A2. Runtime dependencies — same root cause

`browser-security` and `node-security` each have exactly **1** runtime dep (`@interlace/eslint-devkit`),
same as their `safe-regex`. Only `secure-coding`'s 3 is worse. A1's fix takes it to 1.
**This is already a tie/win and the scorecard overstated the loss.**

### A3. `./package.json` export — **DONE**

Added to all three `packages/*/package.json` exports maps. Their package resolves
`require('eslint-plugin-security/package.json')`; ours threw `ERR_PACKAGE_PATH_NOT_EXPORTED`,
which breaks version-detection in tooling (renovate, some IDE plugins, our own benchmark script).
- [x] `exports['./package.json'] = './package.json'` in all 3
- [ ] Add a lock test asserting it, and roll it out to the other 16 published plugins

### A4. Constant propagation (FP control)

They ship `utils/is-static-expression.js` — a scope-aware static-expression evaluator that
resolves `const FOO = 'ls'` and folds `path.join()` / `import.meta.url` / template literals.
We have nothing equivalent, so `const FOO='ls'; child_process.exec(FOO)` is a **true FP on our side**.

- [ ] Implement `isStaticExpression({node, scope})` in `@interlace/eslint-devkit`
      (scope-aware, `WeakMap`-cached, handles Identifier→VariableDeclarator with a single
      const init, TemplateLiteral with static quasis, BinaryExpression `+` of statics,
      `path.*` construction methods, `import.meta.url/dirname/filename`)
- [ ] Wire into `detect-child-process`, `detect-non-literal-fs-filename`,
      `detect-non-literal-require`, `detect-non-literal-regexp`, `no-shell-injection`
- [ ] **Better than theirs:** theirs is per-rule opt-in and untyped. Ours goes in devkit so
      all 110 rules inherit it, plus a `treatConstAsStatic: false` escape hatch for
      threat models where a const is still attacker-influenced (their version has no such option)
- [ ] Regression: their 105 valid cases must stay at ≤5 fires

### A5. Lint speed (1.51× slower)

We run 72 rules to their 14 — per-rule we are ~5× cheaper, so this is a *volume* problem, not
an efficiency one. Still winnable in absolute terms:
- [ ] Profile the top-5 slowest rules with `TIMING=1` across the 1,044-file corpus
- [ ] Hoist per-node regex construction to module scope (audit all 110 for `new RegExp` inside visitors)
- [ ] Share one AST pass for the HTTPS family (see A7) instead of four independent visitors
- [ ] Cache `getScope()`/`findVariable()` results per-file in devkit
- [ ] Target: ≤1.15× their wall-clock at 5× the rule count

### A6. Adoption — 12.6M/mo vs 28.5k/mo

Not winnable head-on this year (see the npm-share analysis: they grow at ecosystem baseline,
we grow ~4× faster off a 1.3% base). Levers that compound:
- [ ] Ship the parity gate, then publish the benchmark as an article with the corpus public —
      "we captured their test suite and ran it against ourselves" is a credible, linkable artifact
- [ ] The adoption-PR campaign ([ADOPTION-TARGET-NETWORK.md](./ADOPTION-TARGET-NETWORK.md)), 131 qualified repos
- [ ] Get listed where they are listed: `awesome-eslint`, `awesome-nodejs-security`, MegaLinter, `eslint-config-*` aggregators
- [ ] A single `eslint-plugin-interlace-security` meta-package so the ask is one line, not three

### A7. Bonus fix — HTTPS rule family over-reporting

`no-http-urls` + `detect-mixed-content` + `require-https-only` + `no-unencrypted-transmission`
all fire on one `http://` string. Four findings for one defect reads as noise and is the
strongest argument *against* us in any PR.
- [ ] Collapse into one rule with a `checks: []` option, or add mutual suppression in devkit
- [ ] Regression test asserting exactly 1 finding for `fetch('http://x')`

### A8. License — genuinely a tie, with one asymmetry

MIT is more permissive; Apache-2.0 carries an **express patent grant** that some enterprise
legal teams require. Neither is a defect.
- [ ] Optional: dual-license MIT OR Apache-2.0 to remove the objection entirely (cheap, one-time)

### A9. Documentation — **partly DONE**

- [x] **All 110 rule doc URLs 404'd.** Fixed via `withCanonicalDocsUrls()` at plugin-export
      time; locked + mutation-verified in `docs-url.lock.test.ts` per package.
- [ ] Roll the same fix + lock test to the other 16 published plugins (same placeholder default)
- [ ] Write the 3 missing docs: `secure-coding/no-template-injection`,
      `node-security/no-dynamic-algorithm-selection`, `node-security/no-shell-injection`
- [ ] Consider shipping a minimal `docs/` in the tarball for air-gapped users — their only
      remaining docs edge. Weigh against keeping the package pure runtime code.

### A10. oxlint parity — already won, keep it

All three plugins export `./oxlint` at full rule parity (37/37, 45/45, 28/28); they have none.
- [ ] Add a lock test asserting `oxlint.rules` and `rules` never diverge in count or ids
- [ ] Run `ilb:oxlint-parity` on a corpus that actually triggers each plugin — a 0-vs-0
      comparison scores 100% and proves nothing (see benchmark §5)

### A11. Runtime size per rule — the real size target

Excluding README/LICENSE/docs/tests: theirs 2.93 KB/rule; browser 3.44, node 4.73,
**secure-coding 9.89** (3.4× theirs).
- [ ] Split the four heavyweights (`detect-object-injection` 24 KB, `no-hardcoded-credentials`
      20 KB, `no-xpath-injection` 16 KB, `no-weak-password-recovery` 16 KB) — most of the bulk
      is inlined pattern tables that belong in devkit and be shared
- [ ] Target: ≤4 KB/rule across all three, which also helps A5 (parse/JIT cost)

---

## Part B — parity supremacy: all 14 of their rule classes

"Better" is defined per rule as: **≥ their recall on their own corpus**, **≤ their FP on their
valid cases**, plus at least one of {suggestion/autofix, CWE metadata, configurability} — of
which they ship *none* on *any* rule.

| # | Their rule | our parity | work | effort |
|---|---|---|---|---|
| 1 | `detect-object-injection` | 1/1 case, but **misses the merge-loop sink** | **Home: `secure-coding`** — the sink is a language primitive (`obj[key] =`, `Object.assign`, class fields), not a platform or SDK API, so per the taxonomy it belongs in the code-agnostic plugin, alongside the existing `detect-object-injection`. Scope is **prototype pollution AND class pollution**: (a) recursive merge `for (const k in s) t[k]=s[k]`; (b) `__proto__` / `constructor` / `prototype` keys; (c) **class pollution** — writes through `instance.constructor.prototype[k]` and static/class-field assignment, which reaches ES-class code that prototype-only rules miss entirely. **Better:** theirs emits 6,393 findings on 1,044 files (84% of its total output) by flagging every `obj[key]`; ours must catch strictly more sinks at <10% that volume. This single rule is the whole positioning story. | **L** |
| 2 | `detect-non-literal-fs-filename` | 16/25 | Close 9 cases + constant propagation (A4). Cover the `fs/promises`, `fs.*Sync`, and destructured-import forms. | M |
| 3 | `detect-child-process` | 5/15 | Close 10 cases. Their rule allows `spawn` entirely — **we should keep flagging `spawn(userInput)` and win on recall**, but gate literal/const args behind A4 so we stop FP-ing on `exec('ls')`. | M |
| 4 | `detect-buffer-noassert` | **0/29** | Trivial rule: `buf.readUInt8(o, true)` — flag a truthy `noAssert` arg on the 14 `read*`/`write*` methods. 29 of 84 corpus cases, so this alone moves parity 36.9% → 71.4%. Legacy API, but it is the single cheapest parity point available. | **S** |
| 5 | `detect-bidi-characters` | 1/2 (incidental) | Real CWE-1007 rule in `secure-coding`: scan raw source for U+202A–U+202E, U+2066–U+2069, U+200F/200E in strings *and comments*. **Better:** theirs reports position only; ours adds an autofix that strips the control chars and names the Trojan Source CVE. | S |
| 6 | `detect-pseudoRandomBytes` | 0/1 | Trivial: `crypto.pseudoRandomBytes(...)`. Fold into `node-security/no-weak-random` with a suggestion → `crypto.randomBytes`. | **S** |
| 7 | `detect-disable-mustache-escape` | 0/1 | Trivial: `.escapeMarkup = false` on a Handlebars/Mustache object. Add to `secure-coding` with a fixer that deletes the assignment. | **S** |
| 8 | `detect-no-csrf-before-method-override` | 0/1 | Trivial middleware-order check; belongs in `eslint-plugin-express-security`, not these three. **Note:** `csurf` was deprecated in 2022 — implement for parity, ship at `warn`, and say so in the docs. | **S** |
| 9 | `detect-unsafe-regex` | 1/2 | Close the `new RegExp` literal case in `no-redos-vulnerable-regex`. | S |
| 10 | `detect-non-literal-require` | 2/2 ✓ | Hold. Add CWE-829 metadata parity check. | — |
| 11 | `detect-possible-timing-attacks` | 2/2 ✓ | **Already strictly better** — theirs is a name matcher (`^(password\|secret\|api\|apiKey\|token\|auth\|pass\|hash)$`, anchored); ours catches `userPassword`, `computedSignature`. Keep as the flagship FN demo. | — |
| 12 | `detect-eval-with-expression` | 1/1 ✓ | Hold. | — |
| 13 | `detect-new-buffer` | 1/1 ✓ | Hold. | — |
| 14 | `detect-non-literal-regexp` | 1/1 ✓ | Hold; retag CWE-400 → **CWE-1333**. | S |

### Belief filter (added after Ofri, 2026-08-11: "we should not support rules we don't believe in")

Four of their classes are declared **won't-fix** in
`benchmarks/suites/ilb-competitor-parity/wont-fix.json` — 32 of their 84 cases. Three are dead
APIs (`buffer-noassert` no-op since Node 8, `pseudoRandomBytes` removed, `csurf` deprecated 2022);
one (`disable-mustache-escape`) is a live defect in the **wrong home** — a template-engine sink
does not belong in a platform plugin, so it waits for a template-engine plugin.

This is a stronger public position than a coverage number: *we decline to ship rules for APIs
that no longer exist.* The runner now prints RAW and WEIGHTED parity side by side and fails on
a stale won't-fix entry, so the exclusions can never quietly inflate the number.

**Weighted denominator: 52 live cases, not 84.** Published packages cover 31 → **59.6%**.

### Sequencing (weighted parity % after each step)

Against the 52 live cases (published baseline 31/52 = 59.6%):

- [x] **A12 module resolution** — `resolveModuleBinding` in devkit, consumed by both rules
- [x] **#2 fs-filename** 16/25 → **24/25**
- [x] **#3 child-process** 5/15 → **9/15**  (`node:` specifier normalisation)
- [ ] **#3 child-process remainder** (6 open) → 94.2%
- [ ] **#5 bidi / Trojan Source** (+1) → 96.2%
- [ ] **#9 unsafe-regex** (+1) → 98.1%
- [ ] **#2 fs-filename remainder** (1 open) → **100%** of live cases
- [ ] **#1 object-injection merge-loop** → closes the replacement blocker

**Weighted parity 59.6% → 82.7%** (43/52) as of 2026-08-11. 849/849 node-security tests green;
fires-on-valid 24 → 26, and every one of the added firings is a `spawn(str)` `node:` variant we
already flagged by policy — consistency, not regression.

**Known FP still open, needs the resolver at the call site:** `detect-child-process` matches
aliases by NAME, so an inner shadow still reports —
`var foo = require('child_process'); function fn(){ var foo = /hello/; foo.exec(str) }`.
The fix is to resolve the callee per-call instead of maintaining a name set; deferred because
the same change caused 33 regressions in `fs-filename` before a fallback was added for an
unresolved bare `fs`.

**Correction (2026-08-11, measured):** an earlier draft of this plan claimed A4 (constant
propagation) was the critical path for these 19 cases. That was wrong. A4 shipped and moved
detection by **zero** — it improved precision only (fires-on-valid 24 → 23). Reading the 19
actual missed cases shows every one is a **module-resolution** failure, not a constness
failure. Step 6 still does not move the parity number (their corpus has one object-injection
case, which we already pass) but remains the only item that decides whether "replace" is honest.

### A12. Module resolution — the real critical path

The 19 open cases fail for one reason: we cannot follow a binding back to the module it
came from. Every shape below is currently missed:

| Missed shape | Example |
|---|---|
| `node:` protocol prefix | `require('node:child_process')`, `require('node:fs')` |
| bare import, no call | `require('child_process')` |
| chained off the require | `require('child_process').exec(str)` |
| destructured at require | `const { exec } = require('node:child_process')` |
| method plucked to a variable | `var one = require('fs').readFile; one(filename)` |
| sub-object namespace | `require('fs').promises.readFile`, `require('fs/promises')` |
| renamed destructuring | `var { readFile: something } = fs.promises` |
| drop-in third-party module | `require('fs-extra').readFile` |

`node:` alone accounts for 5 of the 10 child-process misses — the cheapest points on the board.

- [ ] `resolveModuleBinding(node, scope)` in devkit: resolve an identifier or member
      expression to `{ module, exportPath }`, handling ESM/CJS, `node:` prefix, destructuring
      (incl. renames), chained `require(...).x`, and aliasing through const bindings
- [ ] Configurable module-equivalence sets so `fs-extra`/`graceful-fs` map onto `fs`
      (their rule hardcodes `fs-extra`; ours should take a list)
- [ ] Rewrite `detect-child-process` + `detect-non-literal-fs-filename` detection onto it
- [ ] **This is also the fix the taxonomy doctrine demands** — receiver identity resolved to
      the owning module is exactly what stops the SDK rules colliding on method names
      (see the `sql-injection-rule.ts` name-matcher defect). One primitive, two problems.

### Greenfield: what *neither* side catches

`db.collection('u').find({ $where: req.query.w })` — missed by them **and** by
`eslint-plugin-mongodb-security` (16 rules). NoSQL operator injection is an uncontested gap.
- [ ] Add `mongodb-security/no-nosql-operator-injection` — `$where`, `$regex`, `$expr`,
      `$function` fed from request data. Nobody in the ESLint ecosystem covers this well.

---

---

## Part C — blind-spot sweep (2026-08-11)

Ran the **full 210-rule Interlace ecosystem** (9 plugins) and three competitors
(`eslint-plugin-security`, `eslint-plugin-security-node`, `eslint-plugin-no-unsanitized`)
over both the parity corpus and the 8 real-world repos, then triaged every line a
competitor flags that we do not.

**Nothing is hiding in a sibling plugin.** All 210 rules score exactly 31/52 — identical to
the 3-plugin baseline. The open cases are real gaps, not packaging artifacts.

Triage of competitor-only findings on real code:

| Their finding | n | Verdict |
|---|---|---|
| `security/detect-object-injection` | 505 | **Their noise.** Flags every `obj[key]`. Our narrower rule is correct. |
| `security-node/detect-crlf` | 92 | **Greenfield — see C1.** Class is real, their detector is not. |
| `security/detect-non-literal-fs-filename` | 43 | Known — A12 module resolution. |
| `security-node/detect-unhandled-async-errors` | 17 | Out of scope here; `eslint-plugin-reliability` territory. |
| `security-node/detect-insecure-randomness` | 4 | **We are right, they are noisy.** The LavaMoat hit is `files.sort(() => Math.random() - 0.5)` — a test shuffle. Our `no-math-random-crypto` fires only when the binding implies crypto use. |
| `security/detect-unsafe-regex` | 3 | Known — 1 open corpus case. |
| `no-unsanitized/property` | 2 | **Surfaced one real gap — C2.** |

### C1. CWE-117 / CWE-93 log & CRLF injection — uncontested greenfield

No rule anywhere in our 210 covers it, and we tag neither CWE-93 nor CWE-117. But
`security-node/detect-crlf` flags **any `console.log()` with a non-literal argument** — the
same design error as `detect-object-injection`, which is why it produced 92 hits. So the
class is uncovered by *everyone*, not a deficit of ours.

- [ ] `no-log-injection` — untrusted data reaching a log sink without newline/control-char
      stripping. Home: `secure-coding` (the sink is `console`/any logger, a language-level
      primitive). Must key on taint reaching the sink, not on "argument is not a literal".

### C2. `iframe.srcdoc` XSS sink — small, real, confirmed

`browser-security/no-innerhtml` covers `innerHTML`, `outerHTML`, `insertAdjacentHTML` and
`document.write`, but **misses `srcdoc`**. One-line sink-list addition.

- [ ] Add `srcdoc` to the sink set + regression case

### C3. Competitor defects worth knowing (not ours to fix)

- **`security-node/detect-unhandled-event-errors` throws** `TypeError: Cannot read properties
  of undefined (reading 'name')` on real code (LavaMoat `laverna.spec.js:926`), crashing the
  whole lint run. Excluded from the sweep to get numbers at all.
- **`@microsoft/eslint-plugin-sdl` will not install on ESLint 10** (ERESOLVE).

Both are usable, factual points for a migration conversation — state them neutrally with the
repro, never as mockery.

## Definition of done

- [ ] `ilb:competitor-parity` = 84/84, fires-on-valid ≤5/105, ratchet committed
- [ ] Rebuild `dist/` before every parity run (currently stale — see benchmark §5)
- [ ] Re-run the 8-repo real-world scan; our finding volume must not grow more than 15%
- [ ] Scorecard updated: criteria 21, 22, 26, 27 flipped to Interlace; 17 flipped on step 6
- [ ] Only then does the campaign pitch change from "add alongside" to "replace"
