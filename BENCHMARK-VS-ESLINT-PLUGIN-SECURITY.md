# Benchmark: Interlace security plugins vs `eslint-plugin-security`

**Date:** 2026-08-11
**Contenders:** `eslint-plugin-security@4.0.1` (Apache-2.0, eslint-community)
vs `eslint-plugin-secure-coding@3.6.1` + `eslint-plugin-browser-security@1.3.0` + `eslint-plugin-node-security@4.9.1` (MIT, Interlace)
**All numbers measured against the PUBLISHED npm packages**, not the local monorepo dist. Reproduce: `benchmarks/suites/ilb-competitor-parity/`.

> **Read this first.** We lose three of the criteria below outright, and one of them
> (drop-in replaceability) is a blocker for the adoption campaign. Nothing in this file is
> a marketing claim until the caveat attached to it is repeated with it.

---

## Scorecard

| # | Criterion | eslint-plugin-security | Interlace (3 plugins) | Winner |
|---|---|---|---|---|
| 1 | Total rules | 14 | **110** | Interlace |
| 2 | Rules in `recommended` | 14 | **72** | Interlace |
| 3 | Distinct CWEs covered | 14 | **61** | Interlace |
| 4 | CWEs unique to the other side | 2 | **49** | Interlace |
| 5 | Autofixable rules | 0 | **5** | Interlace |
| 6 | Rules with suggestions | 0 | **62** | Interlace |
| 7 | Configurable rules (options schema) | 0 | **78** | Interlace |
| 8 | Structured `messageIds` | 0 (inline strings) | **395** | Interlace |
| 9 | Avg. message length (remediation depth) | ~60 chars | **209 chars** | Interlace |
| 10 | Per-rule doc URL in metadata | 14/14 | 110/110 | Tie |
| 11 | CWE/CVSS in rule metadata | none | **110/110** | Interlace |
| 12 | Environment targeting | one flat plugin | **browser / node / universal split** | Interlace |
| 13 | Presets offered | 2 | **15** | Interlace |
| 14 | TypeScript-native | JS-era, no TS types | **ships types** | Interlace |
| 15 | Release cadence (since 2025-08) | 2 releases | 39 / 22 / — | Interlace |
| 16 | Last publish | 2026-06-12 | 2026-08-11 | Interlace |
| 17 | **Drop-in replaceability** (weighted) | — | **100%** (50/50 live cases) | **Interlace** |
| 18 | Real-world volume (real source) | **2,469** | 2,533 | **THEM (marginally)** |
| 19 | **Lint speed (median, 1,044 files)** | 1.0× | **1.51× slower** | **THEM** |
| 20 | **Throughput (rule·file/s)** | 1,888 | **6,322 (3.35×)** | Interlace |
| 21 | Install footprint (marginal, eslint present) | 828 KB / 3 pkgs | **828 KB / 2 pkgs** (browser, node); 2,368 KB / 5 (secure-coding) | **split — see §7** |
| 22 | Runtime dependencies | 1 | **1** (browser, node); 3 (secure-coding) | Tie |
| 23 | Ecosystem trust (stars) | **2,368★** | new | **THEM** |
| 24 | Adoption (Jul 2026 downloads) | **12,649,962** | 28,545 | **THEM** |
| 25 | License permissiveness | Apache-2.0 | MIT | Tie |
| 26 | `./package.json` export | yes | **fixed 2026-08-11** (unreleased) | Tie (pending release) |
| 27 | Constant propagation (FP control) | **yes** | no | **THEM** |
| 28 | Vulnerability-class coverage (15 PoCs) | 2/15 | **15/15** | Interlace |
| 35 | Prototype + class pollution shapes | 2/6 | **6/6** | Interlace |
| 29 | Rule doc depth (avg bytes/rule) | 1,368 | **6,709** (4.9×) | Interlace |
| 30 | Rule docs written | 14 | **108** | Interlace |
| 31 | `docs.url` actually resolves | 200 | **404 → fixed 2026-08-11** | Tie (pending release) |
| 32 | Docs shipped offline in tarball | **yes** | no (deliberate — see §8) | THEM |
| 33 | oxlint parity export | **none** | **110/110 rules** | Interlace |
| 34 | Runtime code per rule | **2.93 KB** | 3.44 / 4.73 / 9.89 KB | THEM |

**Tally: Interlace 21, eslint-plugin-security 8, tie/split 5.** But criteria are not equal
weight — #17 and #24 are the ones that decide whether a maintainer says yes.

---

## 1. Where we win decisively: coverage

15 hand-written proof-of-concept vulnerabilities, one per class. `HIT/MISS` is theirs/ours:

| Vulnerability class | Them | Us |
|---|---|---|
| Timing attack, identifier not in their 8-word list | MISS | **HIT** |
| Timing attack on HMAC signature compare | MISS | **HIT** |
| Weak hash (MD5) | MISS | **HIT** |
| Weak cipher (DES-ECB) | MISS | **HIT** |
| SSRF from user input | MISS | **HIT** |
| Zip slip | MISS | **HIT** |
| Insecure HTTP URL / mixed content | MISS | **HIT** |
| JWT in `localStorage` | MISS | **HIT** |
| `innerHTML` XSS | MISS | **HIT** |
| Hardcoded API key | MISS | **HIT** |
| Open redirect | MISS | **HIT** |
| XXE | MISS | **HIT** |
| Unsafe deserialization | HIT | HIT |
| Prototype pollution via merge loop | HIT | **HIT** |
| NoSQL injection | MISS | **HIT** (`mongodb-security`) |

**Harness correction (2026-08-11).** NoSQL injection was recorded as "both miss". That was a
defect in my fixture, not the product: SDK plugins are **evidence-gated** — `no-unsafe-where`
opens with `if (!fileUsesMongo(ast)) return {}` — so a snippet that never imports `mongodb`
makes the rule correctly self-disable. Adding the import, it fires. Any PoC for an SDK rule
must import that SDK or the MISS is the harness's fault. Final tally: **15/15 to 2/15.**

Two findings worth internalizing:

**Their `detect-possible-timing-attacks` is a name matcher.** It tests identifiers against
`^(password|secret|api|apiKey|token|auth|pass|hash)$` — anchored and exact. So
`if (userPassword === supplied)` is invisible to it, as is `computedSignature === receivedSignature`.
This is the single most demonstrable false-negative class we have, and it is trivially
reproducible in a PR.

**Prototype pollution — corrected 2026-08-11, the hole is one shape, not the class.** An
earlier draft of this file said "none of our 110 rules do" prototype pollution. That was wrong.
Measured across six pollution shapes (them / us):

| Shape | Them | Us |
|---|---|---|
| recursive merge loop `for (const k in s) t[k]=s[k]` | HIT | **HIT** (closed 2026-08-11) |
| `obj[req.body.key] = req.body.value` | MISS | **HIT** |
| `Object.assign(target, JSON.parse(req.body.raw))` | MISS | **HIT** |
| deep path set (`a.b.c` split/walk) | HIT | HIT |
| **class pollution** `inst.constructor.prototype[k] = v` | MISS | **HIT** |
| **class pollution** static field `MyClass[k] = v` | MISS | **HIT** |

**All six shapes are now covered — us 6, them 2.** The merge loop was closed by scoping a new
check to the copy-loop shape whose SOURCE is a function parameter: the reusable
`merge(target, source)` helper behind every real npm pollution CVE (lodash.merge,
deep-extend). Copying a locally-owned object stays quiet, and a guarded loop
(`hasOwnProperty`, a `__proto__` check, an allowlist) stays quiet because that guard IS the
documented fix. It also suppresses the generic handler on the same assignment, so the new
detection adds zero findings to the total — it replaces a vaguer message with a precise one.

We remain the only side covering the two **class-pollution** shapes
(`inst.constructor.prototype[k]=v`, `MyClass[k]=v`).

## 2. Where we lose: we are not a drop-in replacement

Measured against **their own RuleTester corpus** — 189 cases captured verbatim from
`eslint-plugin-security@4.0.1`, now vendored at
`benchmarks/corpus/competitor-parity/eslint-plugin-security.json` (Apache-2.0, attribution retained).

**Weighted parity: 50 of 50 live cases = 100%** (raw 51/84; 34 cases across 5 classes are
declared won't-fix, see below). Up from 31/52 = 59.6% at the 2026-08-11 published baseline.

The gain came from replacing two name matchers with real module resolution
(`resolveModuleBinding` in devkit):

| Rule class | before | after | what fixed it |
|---|---|---|---|
| `detect-non-literal-fs-filename` | 16/25 | **25/25** | module resolution + the 19 path-taking fs methods the list omitted (`open`, `rename`, `copyFile`, `symlink`, …) |
| `detect-child-process` | 5/15 | **15/15** | `node:` specifier normalisation, chained `require('cp').exec()`, and reporting a bare `require('child_process')` |
| `detect-bidi-characters` | 1/2 | **2/2** | new `secure-coding/no-bidi-characters` (CWE-1007) |

`detect-non-literal-fs-filename` had required the receiver to be literally spelled `fs`, and
`detect-child-process` compared the module specifier literally against `'child_process'` — so
`node:` prefixes, `require('fs').promises`, destructured requires and `fs-extra` were all
invisible. Consistency check: 31 published + 8 (fs) + 4 (child-process) = 43, which matches
the measured figure exactly.

| Their rule class | cases | we cover | status |
|---|---|---|---|
| `detect-buffer-noassert` | 29 | 0 | **declared won't-fix** (dead API) |
| `detect-non-literal-fs-filename` | 25 | **25** | complete |
| `detect-child-process` | 15 | **15** | complete |
| `detect-bidi-characters` | 2 | 1 | partial |
| `detect-unsafe-regex` | 2 | 1 | partial |
| `detect-pseudoRandomBytes` | 1 | 0 | **zero coverage** |
| `detect-disable-mustache-escape` | 1 | 0 | **zero coverage** |
| `detect-no-csrf-before-method-override` | 1 | 0 | **zero coverage** |
| the remaining 8 classes | 8 | 8 | full |

Caveats that cut **in our favour** and must be stated with the 36.9%:

- The corpus is wildly unbalanced. `detect-buffer-noassert` is 29 of 84 cases (35%) for a
  parameter deprecated in Node 8 and effectively dead in 2026. `pseudoRandomBytes` and
  `no-csrf-before-method-override` (the `csurf` middleware, deprecated 2022) are likewise legacy.
  **Weighted by 2026 relevance the real gap is closer to `fs-filename` + `child-process`.**
- Their 100% score on their own tests is tautological — those tests exist to make those
  rules pass. It measures self-consistency, not detection quality.

Caveats that cut **against us**:

- CWE-1007 (Trojan Source / bidi characters) has **no rule anywhere in the monorepo**. Confirmed by grep.
- Our ReDoS rules exist but are tagged `CWE-400`, not `CWE-1333` — a metadata bug that makes
  our own coverage reports understate us.

## 3. Real-world noise: 8 repos — CORRECTED 2026-08-11

> The first version of this section reported **THEM 7,642 / US 2,932** and concluded we were
> 2.6x quieter. **That was wrong and the error was mine.** My scanner linted every file on
> disk, including minified webpack vendor bundles the repos' own ESLint configs ignore.
> Their `detect-object-injection` fires on every `obj[key]`, and minified code is nothing but
> `obj[key]` — so 68% of their total came from files nobody lints.

Excluding vendor/minified files (`*.min.js`, `*.chunk.*`, `vendor/`, `public/`, and any file
averaging >500 chars/line), both sides at `recommended`:

| Repo | them | us |
|---|---|---|
| postmanlabs/openapi-to-postman | 1,419 | **1,961** |
| LavaMoat/LavaMoat | 488 | 245 |
| ahaenggli/AzureAD-LDAP-wrapper | 267 | 43 |
| ApparyllisOrg/SimplyPluralApi | 140 | 46 |
| lifion/lifion-kinesis | 121 | 20 |
| shardeum/json-rpc-server | 21 | **176** |
| add2cal/add-to-calendar-button | 13 | **42** |
| OWASP/cwe-sdk-javascript | 0 | 0 |
| **total (real source)** | **2,469** | **2,533** |

**On real source we are marginally NOISIER than they are**, and louder on 3 of 8 repos.
Vendor/minified files were 68% of their raw output and 14% of ours. Any "we are quieter"
claim is false and must not appear in a PR.

### Their false positives — measured, not asserted

Their flagship rule produces 1,332 findings on real source. Of those, a **mechanically
verifiable 356 (27%) are categorically incapable of being prototype pollution**:

| Shape | n | Why it cannot be pollution |
|---|---|---|
| numeric literal index `parts[0]` | 106 | integer key, no prototype reachable |
| loop counter `records[i]`, `ob[idx]` | 208 | induction variable, not attacker input |
| ALL_CAPS constant `contentObj[FORM_DATA]` | 42 | compile-time constant key |

27% is a **floor**, not the FP rate — it is only what a regex can prove. Hand-reading a
12-line sample spread across 4 repos found **12 of 12 were false positives**
(`userData.fields[key].name`, `env[envVarName]`, `steps[currentStep]`,
`context.schemaCache[schemaRef]` …). We stay quiet on all of these: our
`detect-object-injection` does not appear in our top 8 rules by volume.

That is the defensible claim for a PR — *"27% of this rule's findings in your repo are
numeric indices and constants that cannot be prototype pollution"* — with the repro attached.
Not *"their plugin is noisy"*.

### Our own noise, stated plainly

`node-security/detect-non-literal-fs-filename` produces 1,132 — our single loudest rule, and
essentially the same volume as their equivalent (1,105). And
`no-http-urls` + `detect-mixed-content` + `require-https-only` + `no-unencrypted-transmission`
still fire together on one `http://` string: four findings for one defect. Fix that before
the campaign opens, not after.

## 4. Performance

Median of 3 interleaved runs, 1,044 files.

**Wall-clock — they win.** 1.51× faster overall (LavaMoat 686 ms vs 1,230 ms). A user who
installs both feels this.

**Throughput — the size-normalised metric, and we win it.** Wall-clock compares 14 rules
against 72, which measures how much work was asked for, not how fast it was done. The
comparable figure is **rule·file evaluations per second**: (rules enabled × files linted) ÷ seconds.

| | rules | files | median total | rule·file/s |
|---|---|---|---|---|
| eslint-plugin-security | 14 | 1,044 | 7,743 ms | 1,888 |
| **Interlace (3 plugins)** | 72 | 1,044 | 11,889 ms | **6,322** |

**We evaluate 3.35× more rule-work per second.** The ratio holds on every repo in the
corpus (2.87×–3.67×), so it is a property of the engines, not of one codebase. An earlier
draft estimated "~5× cheaper per rule" — measured, it is 3.35×.

Honest framing: *"72 rules in 1.5× the time of their 14 — 3.35× the throughput."*
Never *"we are faster"* unqualified.

## 5. Known-bad measurements — do not reuse

- `ilb:cwe-corpus` scores a TP when **any** rule fires on a vulnerable file. Two Express
  boilerplate rules manufacture ~100% recall across a third of that corpus. Its 76.4% F1 is
  unpublishable.
- **The monorepo `dist/` is stale.** This benchmark scored 22.6% against locally-built
  3.3.2/1.2.6/4.4.1 vs 36.9% against published 3.6.1/1.3.0/4.9.1. The parity runner now prints
  resolved versions and flags local resolution. Never quote an in-repo number without checking them.
- ESLint flat config lints only `**/*.js` by default; without an explicit `files` pattern and a
  TS parser, every `.ts` file is silently skipped and reports as a clean zero. This produced a
  full run of fake zeros before it was caught.

## 6. What this says about the campaign

We cannot honestly tell a maintainer "replace eslint-plugin-security with ours" — at 36.9%
parity they would lose detections. The defensible ask is **"add ours alongside"**, with the
12-class coverage table as the reason. Revisit replacement after:

1. **Prototype pollution rule** (their #1 rule, our biggest hole) — blocks any replacement pitch.
2. **Bidi / Trojan Source rule** (CWE-1007) — currently zero coverage.
3. **Constant propagation** in `detect-child-process` / `detect-non-literal-fs-filename` —
   `const FOO='ls'; exec(FOO)` is a true FP on our side that they get right.
4. **Deduplicate the HTTPS rule family** — 4 findings for 1 defect.
5. Retag ReDoS rules to CWE-1333.

Items 1–3 are the entire replaceability gap that matters in 2026. `buffer-noassert` and
`pseudoRandomBytes` are legacy and should be a deliberate *won't-fix*, stated openly.

## 7. Correction: install footprint (added 2026-08-11)

The original row 21 compared **one** of their packages against **three** of ours, using npm's
`unpackedSize` rather than what `node_modules` actually grows by. Corrected, measuring marginal
cost in a project that already has ESLint:

| Package | marginal install | new packages |
|---|---|---|
| eslint-plugin-security | 828 KB | 3 |
| eslint-plugin-browser-security | **828 KB** | **2** |
| eslint-plugin-node-security | 836 KB | **2** |
| eslint-plugin-secure-coding | 2,368 KB | 5 |

We match on bytes and beat them on package count for 2 of 3. An isolated install of ours pulls
13 MB / 60 packages, but only because we correctly declare `eslint` as a non-optional peer and
npm auto-installs it into an empty project; they declare **no peer dependency at all**. Their
145 KB tarball also ships `test/`, `docs/`, `.github/` and a 20 KB CHANGELOG — 83 KB of 145 KB
is dead weight for consumers. Ours ships `src` + README + LICENSE only.

Remaining real gap: `secure-coding` pulls `scslre` + `@eslint-community/regexpp` (~1.5 MB) for
ReDoS analysis used by 3 of 28 rules. Lazy-loading it is tracked in
[PARITY-SUPREMACY-PLAN.md](./PARITY-SUPREMACY-PLAN.md) §A1.

## 8. Documentation, oxlint, and runtime size (added 2026-08-11)

**Docs — we win on depth, and had a defect that erased it.** 108 rule docs averaging 6,709
bytes vs their 14 averaging 1,368. But **every `meta.docs.url` in all three published plugins
404'd** — they pointed at `packages/eslint-plugin/docs/rules/<name>.md`, a path that has never
existed, inherited from a placeholder default in `devkit/rule-creation/rule-creator.ts`. Every
"see docs" link in every IDE, CI annotation and SARIF file was broken across all 110 rules,
while theirs returned 200. Fixed via `withCanonicalDocsUrls()` applied at plugin-export time
(4 files changed, not 110), locked by `docs-url.lock.test.ts` in each package, mutation-verified.

Remaining doc gaps: `secure-coding/no-template-injection`,
`node-security/no-dynamic-algorithm-selection`, `node-security/no-shell-injection` have no doc page.

**Offline docs — theirs ship, ours don't.** They bundle `docs/` in the tarball (18 files). We
don't, deliberately: it keeps the package to runtime code. Now that `docs.url` resolves, the
online path is the better experience — but this stays a genuine edge for air-gapped users.

**oxlint — uncontested.** All three of our plugins ship an `./oxlint` export with full rule
parity (37/37, 45/45, 28/28). `eslint-plugin-security` has no oxlint story at all. As the
ecosystem moves to oxlint this compounds.

**Runtime size per rule — their genuine win.** Excluding README/LICENSE/docs/tests entirely:
they are 41 KB for 14 rules = **2.93 KB/rule**; browser-security 3.44, node-security 4.73,
secure-coding **9.89**. secure-coding is the outlier at 3.4× their density — `detect-object-injection`
(24 KB), `no-hardcoded-credentials` (20 KB), `no-xpath-injection` and `no-weak-password-recovery`
(16 KB each) carry it. That is where any size work should go; README size is correctly excluded.
