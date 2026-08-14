# Benchmark: Interlace security plugins vs `eslint-plugin-security`

**Date:** 2026-08-13 (re-measured; supersedes the 2026-08-11 revision)
**Contenders:** `eslint-plugin-security@4.0.1` (Apache-2.0, eslint-community)
vs `eslint-plugin-secure-coding@4.1.0` + `eslint-plugin-browser-security@1.3.2` + `eslint-plugin-node-security@4.12.0` (MIT, Interlace)
**All numbers measured against the PUBLISHED npm packages**, not the local monorepo dist.
Runner: `benchmarks/suites/ilb-competitor-parity/`. ESLint 10.8.1, Node 24.

> **Read this first.** Parity is no longer the blocker — it moved 36.9% → 96.0% weighted
> between 2026-08-11 and today. Three things replaced it as the honest caveats: we fire on
> **22.4% of our own `safe/` fixtures**, `detect-non-literal-fs-filename` has a live
> false-negative on member-expression arguments, and they out-download us **418×**. Nothing
> in this file is a marketing claim until the caveat attached to it is repeated with it.
>
> **Provenance.** §§1–5 were re-measured on 2026-08-13. §§6–8 are **carried over from
> 2026-08-11 and NOT re-measured** — they are marked, and their numbers predate three
> releases on our side. Do not quote them as current without re-running.

---

## Scorecard

Measured 2026-08-13 unless the row says otherwise.

| # | Criterion | eslint-plugin-security | Interlace (3 plugins) | Winner |
|---|---|---|---|---|
| 1 | **OpenSSF Scorecard (aggregate)** | 6.8 | **8.1** | **Interlace** |
| 2 | Total rules | 14 | **121** | Interlace |
| 3 | Rules in `recommended` | 14 | **80** | Interlace |
| 4 | CWE identifiers in rule metadata | **0** | **75** | Interlace |
| 5 | CWE classes detected (34-class corpus) | 7 | **30** | Interlace |
| 6 | Classes only this side detects | 0 | **23** | Interlace |
| 7 | Autofixable rules | 0 | **5** | Interlace |
| 8 | Rules with suggestions | 0 | **64** | Interlace |
| 9 | Configurable rules (options schema) | 0 | **87 (72%)** | Interlace |
| 10 | Structured `messageIds` | 0 (inline strings) | **419** | Interlace |
| 11 | Avg. message length (remediation depth) | ~60 chars | **216 chars** | Interlace |
| 12 | Rule doc pages published | 14 | **105** | Interlace |
| 13 | Avg doc depth (bytes/rule) | 546 | **6,410 (11.7×)** | Interlace |
| 14 | Rules with a doc page | **14/14 (100%)** | 105/121 (87%) | **THEM** |
| 15 | Doc URLs that resolve (HEAD 200) | **14/14 (100%)** | 116/121 (96%) | **THEM** |
| 16 | Environment targeting | one flat plugin | **browser / node / universal split** | Interlace |
| 17 | Presets offered | 2 | **15** | Interlace |
| 18 | TypeScript types shipped | no | **yes (3/3)** | Interlace |
| 19 | oxlint export | none | **yes (3/3)** | Interlace |
| 20 | Releases since 2025-08 | 2 | **94** | Interlace |
| 21 | Last publish | 2026-06-12 | **2026-08-14** | Interlace |
| 22 | **Drop-in replaceability** (weighted) | — | **96.0%** (48/50 live cases) | **Interlace** |
| 23 | Drop-in replaceability (raw) | — | 58.3% (49/84) | — |
| 24 | **Detection, neutral corpus** (76 vulnerable files) | 14.5% (11/76) | **85.5% (65/76)** | **Interlace** |
| 25 | **False positives on `safe/` fixtures** | **10.4% (7/67)** | 22.4% (15/67) | **THEM** |
| 26 | Fires on their own `valid` cases | 0/105 | 23/105 | **THEM** |
| 27 | **Performance — throughput (rule·file/s)** | ~56k–60k | **~108k–135k (≈2×)** | **Interlace** |
| 28 | Runtime dependencies | **1** | 1 / 1 / 3 | Tie |
| 29 | Published tarball size | **149 KB** | 217 / 289 / 348 KB | **THEM** |
| 30 | Ecosystem trust (stars) | **2,368★** | 14★ | **THEM** |
| 31 | **Adoption (downloads/mo)** | **13,109,041** | 31,326 (418×) | **THEM** |
| 32 | License permissiveness | Apache-2.0 | MIT | Tie |
| 33 | `./package.json` export | yes | **yes** (shipped 4.1.0) | Tie |
| 34 | Node engines supported | ^18.18 \|\| ^20.9 \|\| >=21.1 | **>=18.0.0** | Interlace |
| 35 | Open advisories (Scorecard `Vulnerabilities`) | **0/10** | **10/10** | Interlace |

**Tally: Interlace 24, eslint-plugin-security 7, tie 3** (row 23 is unscored). Criteria are
not equal weight — #31 is the one that decides whether a maintainer says yes, and it is the
one we lose worst. The seven we lose split into three groups: **documentation completeness**
(14, 15 — we publish 7.5× more docs but leave 16 rules without one), **precision** (25, 26 —
see §3), and **ecosystem mass** (29, 30, 31 — time, not engineering).

**On performance, throughput is the criterion, not wall-clock.** Wall-clock compares 14 rules
against 121 — it measures how much work was asked for, not how fast it was done, so it is not
a like-for-like row. The wall-clock figures are kept in §4 as a stated caveat, because a user
who installs both still feels them.

---

## 1. OpenSSF Scorecard (new, 2026-08-13)

Run locally against both repos, `gcr.io/openssf/scorecard:stable`, `--format=json`.
Per [[openssf-scorecard-traps]] the local scanner is the only trustworthy source here.

| Check | Them | Us | |
|---|---|---|---|
| Vulnerabilities | 0 | **10** | ✅ |
| Fuzzing | 0 | **10** | ✅ |
| CI-Tests | 5 | **10** | ✅ |
| Maintained | 7 | **10** | ✅ |
| Token-Permissions | 8 | **10** | ✅ |
| Pinned-Dependencies | 1 | **8** | ✅ |
| SAST | 5 | **8** | ✅ |
| Binary-Artifacts | 10 | 10 | tie |
| Dangerous-Workflow | 10 | 10 | tie |
| Dependency-Update-Tool | 10 | 10 | tie |
| License | 10 | 10 | tie |
| Packaging | 10 | 10 | tie |
| Security-Policy | 10 | 10 | tie |
| Branch-Protection | **6** | 4 | ❌ |
| Contributors | **10** | 3 | ❌ |
| Code-Review | **8** | 0 | ❌ |
| CII-Best-Practices | 0 | 0 | tie (neither registered) |
| Signed-Releases | n/a | n/a | — |
| **Aggregate** | **6.8** | **8.1** | **Interlace** |

**Their `Vulnerabilities: 0`** is the sharpest single fact in this file — a security plugin
shipping with unresolved advisories in its own dependency tree.

Our three losing checks are structural, not code quality: `Contributors` and `Code-Review`
both measure multi-human activity on a repo with one maintainer. `Code-Review 0` is
addressable (it wants reviewed PRs, not solo merges); `Contributors 3` is not, without
inviting contributors. `CII-Best-Practices 0` on both sides is a free 10 for whoever
registers first.

## 2. Drop-in replaceability — 96.0%, up from 36.9%

Measured against **their own RuleTester corpus** — 189 cases captured verbatim from
`eslint-plugin-security@4.0.1`, vendored at
`benchmarks/corpus/competitor-parity/eslint-plugin-security.json` (Apache-2.0, attribution retained).

**Weighted parity: 48 of 50 live cases = 96.0%** (raw 49/84; 34 cases across 5 classes are
declared won't-fix in `wont-fix.json`).

| Their rule class | cases | 2026-08-11 | **now** | status |
|---|---|---|---|---|
| `detect-buffer-noassert` | 29 | 0 | 0 | **declared won't-fix** (dead since Node 8) |
| `detect-non-literal-fs-filename` | 25 | 16 | **23** | partial — see the FN below |
| `detect-child-process` | 15 | 5 | **15** | complete |
| `detect-bidi-characters` | 2 | 0 | **2** | complete (`no-bidi-characters`, CWE-1007) |
| `detect-non-literal-require` | 2 | 2 | 2 | complete |
| `detect-possible-timing-attacks` | 2 | 2 | 2 | complete |
| `detect-unsafe-regex` | 2 | 1 | 1 | **won't-fix (partial)** — the open case is invalid regex syntax |
| `detect-disable-mustache-escape` | 1 | 0 | 0 | **won't-fix** (taxonomy — needs a template-engine plugin) |
| `detect-no-csrf-before-method-override` | 1 | 0 | 0 | **won't-fix** (`csurf` deprecated 2022) |
| `detect-pseudoRandomBytes` | 1 | 0 | 0 | **won't-fix** (API removed) |
| the remaining 4 classes | 4 | 4 | 4 | complete |

The gain came from replacing two name matchers with real module resolution
(`resolveModuleBinding` in devkit) plus `node:` specifier normalisation, chained
`require('cp').exec()`, destructured requires, `fs.promises` and `fs-extra`.

### The two open cases are one bug, and it is bigger than two cases

Both live misses are `detect-non-literal-fs-filename`, and they share a root cause: **the
rule only reports on bare identifiers.** Any `MemberExpression` or `CallExpression`
argument falls through silently.

```js
fs.readFileSync(x)             // fsPathTraversal  ✅
fs.readFileSync(x.y)           // (none)           ❌
fs.readFileSync(req.query.f)   // (none)           ❌  ← textbook CWE-22
fs.readFileSync(getPath())     // (none)           ❌
```

This is inverted: the *unknown* identifier reports while the *definitely tainted*
`req.query.f` is silent. It is the same node-type fall-through that was found and fixed in
`detect-child-process` (where `cp.exec(req.query.cmd)` now fires correctly) — the fix landed
in one rule and not the other. Closing it takes parity to 50/50 and shuts a real CWE-22 blind
spot that the corpus only samples twice.

**Their 100% on their own tests is tautological** — those tests exist to make those rules
pass. It measures self-consistency, not detection quality. Which is why §3 exists.

## 3. Detection on a neutral corpus (new, 2026-08-13)

`benchmarks/corpus/` — 34 classes, 76 `vulnerable/` files (must detect) and 67 `safe/` files
(must stay quiet). Both sides scored **identically**: "did any rule fire on this file."
Runner: `benchmarks/suites/ilb-competitor-parity/head-to-head.mjs` (refuses to run against
the monorepo dist — see §5).

| | Them | Us |
|---|---|---|
| Vulnerable files detected | 11/76 (14.5%) | **65/76 (85.5%)** |
| Classes won | 0 | **26** |
| Classes only this side detects | 0 | **23** |
| **False positives on `safe/`** | **7/67 (10.4%)** | 15/67 (22.4%) |

We detect in 30 of 34 classes; they detect in 7. They win **zero** classes. The 23 classes
only we cover: SQLi, XSS, SSRF, hardcoded credentials, cert validation, postMessage origin,
log injection, error-message exposure, input validation, argument injection, code generation,
bidi, encoding/escaping, case sensitivity, resource injection, HTTP smuggling, info exposure,
fail-secure, weak password recovery, resource allocation, type confusion, external file-name
control, OWASP-LLM02.

**Caveats that cut against us, and must be stated with the 85.5%:**

- **This is our corpus.** We authored the fixtures. The 96.0% in §2 is the away-turf number
  and is the one to lead with in any external claim.
- **Scoring is "any rule fired"** — an upper bound for both sides, not attribution accuracy.
  See §5.
- **We fire on 15 of 67 files we ourselves wrote to be clean.** Their 10.4% is better. This
  is the most falsifiable number in the document and it is checked into our own repo.
- Real gaps: CWE-598 (GET with sensitive data) 0/2, CWE-943 (NoSQL injection) 0/2,
  CWE-327 (broken crypto) 2/4.
- `WCAG-1.1.1` 0/3 and `react-hooks` 0/2 are **not** gaps — those belong to `react-a11y`,
  not to these three plugins. They are excluded from the class tallies above.

## 4. Performance

164 files, median of 3 runs after a warm pass, same harness for both sides.
Runner: `benchmarks/suites/ilb-competitor-parity/head-to-head.mjs`.

**The criterion is throughput — rule·file evaluations per second**: (rules enabled × files
linted) ÷ seconds. This is the only size-normalised comparison available; wall-clock compares
14 rules against 121, which measures how much work was requested, not how fast it was done.

| | run A | run B |
|---|---|---|
| us | 108,289 | 134,791 |
| them | 55,686 | 60,165 |
| **ratio** | **1.94×** | **2.24×** |

**Report this as "≈2×", not to three significant figures.** Two runs of the same script on
the same machine and the same corpus disagreed by 15%. The corpus is 164 small files; per-run
variance swamps the precision.

**Wall-clock, stated as a caveat and not scored:** 147–183 ms vs 36–41 ms, i.e. they are
3.9×–4.4× faster. A user who enables both plugins pays that. It is not a criterion because
nothing about it is held equal, but it must never be omitted.

> **The previous revision's 3.35× did not reproduce, and cannot be checked.** That number came
> from 1,044 real source files scanned by a script that was never committed (§8). Measured
> ratios now span **1.94×–7.38×** across harnesses. **Quote no throughput figure externally
> until a committed runner measures real source.**

Honest framing: *"121 rules in ~4× the time of their 14 — roughly 2× the throughput on this
corpus."* Never *"we are faster"* unqualified.

## 5. Known-bad measurements — do not reuse

- **`lintText` silently ignores any `filePath` outside cwd.** It returns one
  `ruleId: null` message — `File ignored because outside of base path` — and zero findings.
  This scored **0/76 for BOTH sides** and read as a clean tie until the message was inspected.
  The corpus runner now throws on any `ignored` message rather than counting it as a miss.
- **ESLint flat config lints only `**/*.js` by default.** Without an explicit `files` pattern
  and a TS parser, every `.ts`/`.tsx` file is silently skipped and reports as a clean zero —
  14 of the 164 corpus files. Documented on 2026-08-11 and **hit again on 2026-08-13**; it
  costs a full run every time.
- **Any-rule-fires scoring inflates.** Both §2 and §3 count a file as covered if *any* rule
  fires, even a topically unrelated one. Applied symmetrically it is fair as a head-to-head,
  but it is an upper bound, not detection accuracy. See `ilb-arena` for the file-level
  attribution trap.
- **The monorepo `dist/` is stale, and a printed warning does not save you.** Run from the
  repo root, `head-to-head.mjs` resolved `packages/` at 3.3.2 / 1.2.6 / 4.4.1 — thirty-odd
  releases behind published — and reported **63.2% detection / 37.3% FP** where published
  measures 85.5% / 22.4%. `run.mjs` prints a `[LOCAL dist]` caveat above a hundred lines of
  table, which is how the 22.6%-vs-36.9% version of this mistake happened in the first place.
  `head-to-head.mjs` now **exits 1** on local resolution unless `--allow-local` is passed;
  `run.mjs` should be changed to match.
- **A measurement with no committed runner is not a measurement.** The 8-repo real-source
  scan in §8 — the source of the "we are marginally noisier" finding and of the 27%-FP claim
  earmarked for adoption PRs — has no script in `benchmarks/scripts/` and its clones are
  gone. It cannot be re-derived. Any figure quoted from a one-off scan must ship its runner
  in the same commit.
- **A benchmark doc can outlive its branch.** The 2026-08-11 revision claimed 100% weighted
  parity while every artifact behind that claim sat on an unpushed local branch and the
  published packages measured 20.0%. Check `git cat-file -e origin/main:<path>` before
  trusting a number in this file.

## 6. What this says about the campaign

*(Guidance updated 2026-08-13; the 8-repo noise data it leans on is from 2026-08-11.)*

At 96.0% weighted parity the **"replace eslint-plugin-security"** pitch is now defensible for
the first time — but not until three things are closed, because each is falsifiable in one
command by anyone we pitch:

1. **The `detect-non-literal-fs-filename` member-expression FN** (§2). We cannot claim
   replacement while `fs.readFileSync(req.query.f)` is silent.
2. **Our 22.4% FP rate on our own `safe/` fixtures** (§3). Worse than theirs, in our repo.
3. **The unreproduced throughput number** (§4).

The remaining honest gaps, in priority order: CWE-943 (NoSQL) 0/2, CWE-598 0/2, CWE-327 2/4,
and the four HTTPS rules that still fire together on one `http://` string.

`buffer-noassert`, `pseudoRandomBytes` and `no-csrf-before-method-override` stay a deliberate
**won't-fix**, stated openly in `wont-fix.json` with a `reconsiderIf` for each.

---

## Carried over from 2026-08-11 — NOT re-measured

> Everything below predates three releases on our side (secure-coding 3.6.1→4.1.0,
> browser-security 1.3.0→1.3.2, node-security 4.9.1→4.12.0) and 94 published versions.
> Rule counts referenced below say 110; the current figure is 121. Re-run before quoting.

### 7. Where we win: the 15-PoC coverage table

15 hand-written proof-of-concept vulnerabilities, one per class. **Us 15/15, them 2/15.**

Two findings worth internalizing:

**Their `detect-possible-timing-attacks` is a name matcher.** It tests identifiers against
`^(password|secret|api|apiKey|token|auth|pass|hash)$` — anchored and exact. So
`if (userPassword === supplied)` is invisible to it, as is
`computedSignature === receivedSignature`. This is the single most demonstrable
false-negative class we have, and it is trivially reproducible in a PR.

**Prototype pollution — us 6 shapes, them 2.** All six shapes covered: recursive merge loop,
`obj[req.body.key] = v`, `Object.assign(target, JSON.parse(...))`, deep path set, and both
**class-pollution** shapes (`inst.constructor.prototype[k]=v`, `MyClass[k]=v`) which we are
the only side to cover. The merge loop was closed by scoping to the copy-loop shape whose
SOURCE is a function parameter — the `merge(target, source)` helper behind every real npm
pollution CVE. A guarded loop (`hasOwnProperty`, `__proto__` check, allowlist) stays quiet,
because that guard IS the documented fix.

**Harness note:** SDK plugins are **evidence-gated** — `no-unsafe-where` opens with
`if (!fileUsesMongo(ast)) return {}`. Any PoC for an SDK rule must import that SDK or the
MISS is the harness's fault. See [[sdk-evidence-gate-pattern]].

### 8. Real-world noise: 8 repos

> ⚠️ **NOT REPRODUCIBLE.** The eight repos were cloned to a transient working directory that
> no longer exists, and **no runner for this scan is committed** — `benchmarks/scripts/`
> holds only `extract-competitor-cases.cjs`, `generate-fixtures.js`, `run-benchmark.js` and
> `score-fp-fn.ts`, none of which perform it. The repo list below survives only in
> [ADOPTION-TARGET-NETWORK.md](./ADOPTION-TARGET-NETWORK.md). Every number in this section is
> therefore unverifiable until the scan is re-implemented and committed. Treat it as a lead,
> not as evidence — and do not put it in front of a maintainer.

The eight, all public GitHub repos linted from a clean clone:
[postmanlabs/openapi-to-postman](https://github.com/postmanlabs/openapi-to-postman),
[LavaMoat/LavaMoat](https://github.com/LavaMoat/LavaMoat),
[ahaenggli/AzureAD-LDAP-wrapper](https://github.com/ahaenggli/AzureAD-LDAP-wrapper),
[ApparyllisOrg/SimplyPluralApi](https://github.com/ApparyllisOrg/SimplyPluralApi),
[lifion/lifion-kinesis](https://github.com/lifion/lifion-kinesis),
[shardeum/json-rpc-server](https://github.com/shardeum/json-rpc-server),
[add2cal/add-to-calendar-button](https://github.com/add2cal/add-to-calendar-button),
[OWASP/cwe-sdk-javascript](https://github.com/OWASP/cwe-sdk-javascript).
They are 8 of the 131 qualified adoption targets in ADOPTION-TARGET-NETWORK.md.

Excluding vendor/minified files, both sides at `recommended`:
**them 2,469 / us 2,533 on real source — we are marginally NOISIER**, and louder on 3 of 8
repos. Vendor/minified files were 68% of their raw output and 14% of ours. Any "we are
quieter" claim is false and must not appear in a PR.

**Their false positives — measured, not asserted.** Of their 1,332 real-source
`detect-object-injection` findings, a mechanically verifiable **356 (27%)** cannot be
prototype pollution: 106 numeric literal indices, 208 loop counters, 42 ALL_CAPS constant
keys. 27% is a **floor** — it is only what a regex can prove; a hand-read 12-line sample
across 4 repos was 12/12 FP.

That is the defensible PR claim — *"27% of this rule's findings in your repo are numeric
indices and constants that cannot be prototype pollution"* — with the repro attached. Not
*"their plugin is noisy"*.

**Our own noise, stated plainly.** `detect-non-literal-fs-filename` produced 1,132 — our
loudest rule, essentially the same volume as their equivalent (1,105). And `no-http-urls` +
`detect-mixed-content` + `require-https-only` + `no-unencrypted-transmission` still fire
together on one `http://` string: four findings for one defect.

### 9. Install footprint

Marginal cost in a project that already has ESLint: eslint-plugin-security 828 KB / 3 pkgs;
browser-security **828 KB / 2**; node-security 836 KB / 2; secure-coding 2,368 KB / 5.

We match on bytes and beat them on package count for 2 of 3. An isolated install of ours
pulls 13 MB / 60 packages only because we correctly declare `eslint` as a non-optional peer;
they declare **no peer dependency at all**. Their tarball ships `test/`, `docs/`, `.github/`
and a 20 KB CHANGELOG — 83 KB of 145 KB is dead weight. Ours ships `src` + README + LICENSE.

Remaining real gap: `secure-coding` pulls `scslre` + `@eslint-community/regexpp` (~1.5 MB)
for ReDoS analysis used by 3 of 33 rules. Lazy-loading tracked in
[PARITY-SUPREMACY-PLAN.md](./PARITY-SUPREMACY-PLAN.md) §A1.

### 10. Documentation, oxlint, runtime size

**Docs — we win on depth.** 108 rule docs averaging 6,709 bytes vs their 14 averaging 1,368.
Every `meta.docs.url` in all three plugins previously 404'd — fixed via
`withCanonicalDocsUrls()` at plugin-export time (4 files, not 110), locked by
`docs-url.lock.test.ts` per package, mutation-verified.

**Offline docs — theirs ship, ours don't.** They bundle `docs/` in the tarball (18 files).
Deliberate on our side, but a genuine edge for air-gapped users.

**oxlint — uncontested.** All three plugins ship an `./oxlint` export.
`eslint-plugin-security` has no oxlint story at all. As the ecosystem moves to oxlint this
compounds.

**Runtime size per rule — their genuine win.** Excluding README/LICENSE/docs/tests: they are
2.93 KB/rule; browser-security 3.44, node-security 4.73, secure-coding **9.89**.
`detect-object-injection` (24 KB), `no-hardcoded-credentials` (20 KB), `no-xpath-injection`
and `no-weak-password-recovery` (16 KB each) carry the outlier.
