# Benchmark results — Interlace security plugins

**Measured 2026-08-13** · `eslint-plugin-secure-coding@4.1.0` + `eslint-plugin-browser-security@1.3.2` + `eslint-plugin-node-security@4.12.0` · vs `eslint-plugin-security@4.0.1` · ESLint 10.8.1 · Node 24

Criteria: [BENCHMARK-CRITERIA.md](./BENCHMARK-CRITERIA.md) · **Exact configuration and rule lists: [BENCHMARK-METHODOLOGY.md](./BENCHMARK-METHODOLOGY.md)** · Full write-up: [BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md](./docs/planning/BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md)

---

## The highlight

> **We detect 100% of `eslint-plugin-security`'s live test cases — measured against its own
> test suite — with 121 rules to its 14. On 23,682 files of real open-source code we report
> 58 findings per 1,000 files against its 985.**

One line, if that is all the room there is:

> **100% drop-in parity with `eslint-plugin-security`, measured on its own test suite, with
> 121 rules to its 14.**

**Evidence tiers** used throughout: `PUB` publishable — committed runner, code we did not
author · `INT` internal — committed runner, our own fixtures; a regression gate, not a claim ·
`VOL` volume only — counts findings, not correctness.

---

## Full criteria

### A · Detection and correctness

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| A1 | **Drop-in parity**, their test suite, live cases | **51/51 — 100%** | — | **Interlace** | PUB |
| A2 | Raw parity incl. declared won't-fix | 51/84 — 60.7% | — | — | PUB |
| A3 | CWE detection, labelled corpus (76 files) | **76/76 — 100%** | 11/76 | **Interlace** | INT |
| A3a | — under `recommended` alone (177 rules, not all 276) | **76/76** | — | — | INT |
| A4 | CWE classes detected (of 34) | **30** | 7 | **Interlace** | INT |
| A5 | Classes only this side detects | **23** | 0 | **Interlace** | INT |
| A6 | Distinct CWE identifiers in rule metadata | **75** | 0 | **Interlace** | PUB |
| A7 | Deprecated rules carrying a working `replacedBy` | **6/6** | n/a — never deprecates | **Interlace** | PUB |
| A7a | Deprecated rules shipped in `recommended` | **0** (was 1 — `no-clickjacking`, removed) | n/a | — | PUB |

### B · Precision

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| B1 | **False positives**, 67 clean labelled fixtures, `recommended` | **0/67 — 0.0%** | 7/67 — 10.4% | **Interlace** | INT |
| B1a | — same fixtures with **every** rule at `error` (276) | 1/67 — 1.5% | — | — | INT |
| B2 | **Measured precision**, hand-labelled stratified sample | **≈67%** (12 TP / 6 FP / 4 undecidable of 22) | ≈20% (3 TP / 12 FP / 1 undecidable of 16) | **Interlace** | PUB |
| B2a | — **prior** sample (20 findings), same sampling method, before the 2026-08-14 precision work | ≈47% (8 TP / 9 FP / 3 undecidable of 20) | — | — | PUB |
| B2b | **TP / FP / FN, labelled corpus** (`ilb-juliet`) | **69 / 0 / 0 — F1 100%** | 10 / 7 / 59 — F1 23.3% | **Interlace** | INT |
| B3 | Findings per 1,000 files, 20 OSS projects | **54** | 985 | **Interlace** | VOL |
| B4 | Louder on N of 20 projects | **0 of 20** | 20 of 20 | **Interlace** | VOL |
| B5 | Output concentrated in a single rule | 18% (`no-http-urls`) | **87%** (`detect-object-injection`) | **Interlace** | PUB |
| B6 | Fires on the other side's `valid` cases | 15/105 (was 23) | 0/105 | eslint-plugin-security | PUB |
| B6a | — of which a **defensible scope difference** | **15** (11 shell-free `spawn`, 3 literal `eval`, 1 `new Buffer`) | — | — | PUB |
| B6b | — of which **genuine noise**, now fixed | **0** (was 8) | — | — | PUB |

### C · Rule surface and configurability

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| C1 | Total rules | **121** | 14 | **Interlace** | PUB |
| C2 | Rules in `recommended` | **80** | 14 | **Interlace** | PUB |
| C3 | Configurable rules (options schema) | **87 — 72%** | 0 — 0% | **Interlace** | PUB |
| C4 | Rules offering an automated suggestion | **64** | 0 | **Interlace** | PUB |
| C5 | Auto-fixable rules | **5** | 0 | **Interlace** | PUB |
| C6 | Shareable presets | **15** | 2 | **Interlace** | PUB |
| C7 | Environment targeting | **browser / node / universal** | one flat plugin | **Interlace** | PUB |
| C8 | TypeScript types shipped | **yes** | no | **Interlace** | PUB |
| C9 | oxlint export | **yes (3/3)** | none | **Interlace** | PUB |
| C10 | Node engines supported | **>=18.0.0** | ^18.18 \|\| ^20.9 \|\| >=21.1 | **Interlace** | PUB |

### D · Documentation

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| D1 | Rules with a documentation page | **121/121 (100%)** | 14/14 (100%) | **Interlace** — same completeness across 8.6× the surface | PUB |
| D2 | Rule doc pages published | **121** | 14 | **Interlace** | PUB |
| D3 | Average documentation depth | **6,410 bytes** | 546 bytes | **Interlace** | PUB |
| D4 | Per-rule doc URL in metadata | **121/121 (100%)** | 14/14 (100%) | **Interlace** — same reasoning as D1 | PUB |
| D5 | Docs shipped offline in the tarball | no (deliberate) | **yes** | eslint-plugin-security | PUB |

### E · Agent readability

Lint output is increasingly consumed by a model, not only a human. No existing lint benchmark
measures this; criteria are defined in [BENCHMARK-CRITERIA.md](./BENCHMARK-CRITERIA.md) §C.

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| E1 | Structured `messageId`s | **419** | 0 (inline strings) | **Interlace** | PUB |
| E2 | Machine-readable CWE/OWASP in `meta` | **yes** | no | **Interlace** | PUB |
| E3 | Average message length (remediation depth) | **216 chars** | ~60 chars | **Interlace** | PUB |
| E4 | Structured fix suggestions an agent can apply | **64 rules** | 0 | **Interlace** | PUB |
| E5 | Guidance on what a false positive looks like | **none** | none | tie — *open gap on both sides* | PUB |
| E6 | Severity calibration — distinct CVSS values | **9 values** (7.5×30, 9.8×18, 5.3×14, 8.1×8, …) | none quoted | **Interlace** | PUB |
| E7 | Rules quoting a CVSS at all | 80/121 — *41 carry none* | 0/14 | **Interlace**, gap noted | PUB |

### F · Performance

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| F1 | **Throughput** (rule·file evaluations/sec) | **~108k–135k** | ~56k–60k | **Interlace ≈2×** | PUB |
| F2 | Wall-clock, 164 files | 147–183 ms | **36–41 ms** | eslint-plugin-security | PUB |
| F3 | Runtime dependencies | 1 / 1 / 3 | **1** | tie | PUB |
| F4 | Published tarball size | 217 / 289 / 348 KB | **149 KB** | eslint-plugin-security | PUB |

F2 is reported but **not scored**: it compares 14 rules against 121, so nothing is held equal.
F1 is the size-normalised metric. Report it as "≈2×" — two runs on the same corpus disagreed
by 15%.

### G · Supply chain and project health

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| G1 | **OpenSSF Scorecard, public badge** | **8.5** | **not registered** (404) | **Interlace** | PUB |
| G2 | OpenSSF Scorecard, identical local run | **8.1** | 6.8 | **Interlace** | PUB |
| G3 | — Vulnerabilities | **10** | 0 | **Interlace** | PUB |
| G4 | — Fuzzing | **10** | 0 | **Interlace** | PUB |
| G5 | — CI-Tests | **10** | 5 | **Interlace** | PUB |
| G6 | — Maintained | **10** | 7 | **Interlace** | PUB |
| G7 | — Token-Permissions | **10** | 8 | **Interlace** | PUB |
| G8 | — Pinned-Dependencies | **8** | 1 | **Interlace** | PUB |
| G9 | — SAST | **8** | 5 | **Interlace** | PUB |
| G10 | — Branch-Protection | 4 | **6** | eslint-plugin-security | PUB |
| G11 | — Contributors | 3 | **10** | eslint-plugin-security | PUB |
| G12 | — Code-Review | 0 | **8** | eslint-plugin-security | PUB |
| G13 | — CII-Best-Practices | 0 | 0 | tie — unclaimed by both | PUB |
| G14 | Tests passing | **5,166** | not published | **Interlace** | PUB |
| G15 | License permissiveness | MIT | Apache-2.0 | tie | PUB |

**On the two Scorecard numbers.** 8.5 is our public badge, generated by the OpenSSF's own
infrastructure, and it is the citable figure — `eslint-plugin-security` has no badge because
it is not registered. 8.1 is a local run with an admin-scoped token, which can additionally
evaluate `Branch-Protection` (scoring 4); the public run marks that check unmeasurable and
excludes it, which *raises* the average. **G2 is the only apples-to-apples comparison** —
same scanner, same token scope, both repos.

### H · Ecosystem and adoption

| # | Criterion | Interlace | eslint-plugin-security | Winner | Tier |
|---|---|---|---|---|---|
| H1 | **Downloads per month** | 31,326 | **13,109,041** (418×) | **eslint-plugin-security** | PUB |
| H2 | GitHub stars | 14 | **2,368** | **eslint-plugin-security** | PUB |
| H3 | Releases since 2025-08 | **94** | 2 | **Interlace** | PUB |
| H4 | Last publish | **2026-08-14** | 2026-06-12 | **Interlace** | PUB |

---

## Tally

**Interlace 36 · eslint-plugin-security 11 · tie 5.**

The eleven we lose group into four honest categories:

1. **Adoption** (H1, H2) — 418× downloads, 169× stars. Time and distribution, not engineering.
2. **Single-maintainer structure** (G10, G11, G12) — Scorecard checks that measure multi-human activity.
3. **Size and speed of a larger rule set** (F2, F4, F3) — 121 rules cost more bytes and more wall-clock than 14.
4. **Real, fixable defects** (B6, A7, D5) — over-firing on their valid corpus, six deprecated rules still exported, no offline docs.

---

## What the numbers do not say

**Volume is not precision.** B3 measures how much each plugin says, not how much is right.

**Measured precision is ≈67%** (B2) — 12 true positives, 6 false positives, 4 undecidable in a
hand-labelled sample of 22 findings across repos and rules. It was 47% before the 2026-08-14
precision work; the same sampling method on the competitor puts them at ≈20%.

Every point of that move came from removing name-matching rather than adding analysis:

| Rule | Defect | Findings |
|---|---|---|
| `no-xpath-injection` | declaration name + initialiser name, no XPath anywhere; `select` matched Mongoose's projection API | 66 → 29 |
| `no-improper-sanitization` | shell metacharacters (`\| ; ( ) $`) in an HTML-escaping character list | 24 → 9 |
| `no-http-urls` | reported `indexOf('http://')` — the guard that checks for http | 245 → 229 |

Total across 20 projects: **1,351 → 1,283 findings**. Corpus false positives stayed at 0/67,
parity at 51/51 and detection at 73/76 throughout — the reductions are noise, not coverage.

A second pass read all 23 of the cases where our rules fire on `eslint-plugin-security`'s
own `valid` corpus. Eight were genuine false positives and are fixed; the rest are scope
differences where our finding stands. **Fires-on-valid 23 → 15, recall unchanged.**

| Rule | Defect | |
|---|---|---|
| `no-dynamic-require`, `no-dynamic-dependency-loading`, `detect-non-literal-regexp`, `no-unlimited-resource-allocation` | asked "is this a `Literal` node" instead of "can this change" — `` require(`b`) ``, `require(__dirname + '/utils')`, `new RegExp(source)` with `const source = 'ab+c'` | 4 |
| `require-secure-credential-storage` + `require-storage-encryption` | byte-identical implementations firing on any `.setItem`/`.writeFile` — `writeFile(sitemapPath, sitemap)` was two unencrypted-credential findings | 2 |
| `no-insecure-comparison` | `var a = 'user'; if (a != 'user')` — both operands provably strings, so there is no coercion to warn about | 1 |
| `detect-child-process` | tracked the module by name, so a local `var foo = /hello/` inherited the alias from a module-scope `require('child_process')` | 1 |

The first attempt at the last one accepted only ES `import` bindings as legitimate, which
broke `const { execFile } = require('child_process')` and silently dropped both CWE-088
fixtures — detection 76 → 74, parity 51 → 49. It was caught by re-running the suites, not
by reading the diff. That is the whole argument for [BENCHMARK-CRITERIA.md](./BENCHMARK-CRITERIA.md) §0.1.

For calibration, the incumbent's `detect-object-injection` is **87% of its entire output**
(B5), and a prior analysis found 27% of that rule's findings to be *mechanically provable*
non-defects. Neither side is clean. The difference is that a maintainer reading our output
reads 20 findings and finds 8 real ones, rather than reading 985.

**"Quieter" is specific to this competitor.** Measured against `eslint-plugin-no-unsanitized`
— a narrow, precise XSS plugin — **we are louder: 184 findings per 1k files against 127, on
4 of 4 projects.** Any quietness claim must name the competitor it was measured against.

**False negatives on real source are unmeasured** and cannot be derived from unlabelled code.
Only a labelled corpus, or a repository checked out at a known-CVE commit, produces a real one.

---

## Doctrine — signal over noise

**We optimise for signal density, not finding count.** A rule that fires 2,000 times to be
right 400 of them does not make a codebase safer; it teaches the team to skip the category.
Noise creates apathy, and an ignored tool has zero recall regardless of what it detects.

Measured symmetrically — same sampling method, same labelling, both sides — across 20
open-source projects, 2.37M SLOC:

| | Interlace | eslint-plugin-security |
|---|---|---|
| Findings | 981 | 21,557 |
| **Measured precision** | **47%** | 20% |
| True positives (estimated) | 461 | **4,311** |
| False positives (estimated) | **520** | 17,246 |
| Findings per 1k SLOC | **0.41** | 9.09 |
| True positives per 1k SLOC | 0.19 | **1.82** |
| **Noise per 1k SLOC** | **0.22** | 7.27 — **33× more** |
| **Findings read per real issue** | **2.1** | 5.0 |

**They find more real issues in absolute terms.** 4,311 against 461, because they fire 22×
more often. We do not dispute that and it belongs in any honest comparison. The trade we
make is deliberate: you read two findings to get one real one, and carry a thirty-third of
the noise doing it.

### The doctrine, tested against ourselves

This is a stated value, not a rationalisation of a weakness — and we verified that by trying
the opposite. A measured 300-file recall gap in `no-unsafe-regex-construction` was real:
competitors caught `new RegExp(process_name.replace(...))` on a user-supplied pm2 process
name and we did not. We implemented the fix, then measured it before shipping:

- Findings went **29 → 2,243** on the same corpus
- A hand-read of 18 of the new findings put precision at **~25%**
- Overall precision would have fallen from ~45% to roughly 30%

**We reverted it.** The rule's existing test group — `"rule partition: attributed taint
reports, bare identifiers do not"` — encoded the right decision, and the measurement proved
it. What shipped from that work was only the piece with no recall cost: `new RegExp(re.source,
re.flags)` no longer reports, because re-compiling an already-accepted pattern adds no surface.

### What this commits us to

- **A rule earns its place by precision, not by coverage.** A class we cannot detect
  precisely, we do not ship a rule for.
- **Every recall gap is measured before it is accepted or closed.** The 300-file regex gap is
  documented, not hidden.
- **Precision is published, including when it is unflattering.** 47% is not a good number;
  it is our number, and the trend is tracked in the open.


---

## Reproduce

```bash
node benchmarks/suites/ilb-competitor-parity/run.mjs          # A1, A2 — their test suite
node benchmarks/suites/ilb-competitor-parity/head-to-head.mjs # A3–A5, B1 — labelled corpus
node benchmarks/suites/ilb-real-source/run.mjs                # B3–B5, F1 — 20 OSS projects
docker run --rm -e GITHUB_AUTH_TOKEN gcr.io/openssf/scorecard:stable --repo=github.com/ofri-peretz/eslint
```

Measure against **any** security plugin on npm:

```bash
npm i -D eslint-plugin-no-unsanitized
node benchmarks/suites/ilb-real-source/run.mjs --competitor=eslint-plugin-no-unsanitized
```

`--corpus=popular` (20 projects ≥5k stars) · `--corpus=adoption` (20 adoption targets) ·
`--corpus=all`. Every runner prints resolved package versions and **exits 1** if a plugin
resolves to the monorepo `dist/` rather than npm.

---

## Positioning

### The statement

**Interlace is the security layer for ESLint.** 121 rules across 75 CWEs, free, offline,
zero-config, MIT. It replaces the community security category — `eslint-plugin-security`,
`eslint-plugin-security-node`, `eslint-plugin-no-unsanitized`,
`@microsoft/eslint-plugin-sdl`, and the security rules of `eslint-plugin-sonarjs` — not as a
supplement to them, as their successor.

That is a claim, and it is backed by the only comparison that settles it: **five community
security plugins measured against ours on the same labelled corpus, same harness, same day.**

| Plugin | TP | FP | FN | F1 |
|---|---|---|---|---|
| **Interlace** | **69** | **0** | **0** | **100%** |
| eslint-plugin-sonarjs | 27 | 9 | 42 | 51.4% |
| eslint-plugin-security | 10 | 7 | 59 | 23.3% |
| @microsoft/eslint-plugin-sdl | 6 | 2 | 63 | 15.6% |
| eslint-plugin-no-unsanitized | 4 | 1 | 65 | 10.8% |
| eslint-plugin-security-node | 4 | 3 | 65 | 10.5% |

**Every vulnerable fixture any of the five detects, we also detect.** Verified fixture by
fixture, not inferred from totals — our detections are a strict superset of all five
combined, with zero exceptions:

| Plugin | Vulnerable fixtures it detects | That we miss |
|---|---|---|
| eslint-plugin-sonarjs | 27 | **0** |
| eslint-plugin-security | 10 | **0** |
| @microsoft/eslint-plugin-sdl | 6 | **0** |
| eslint-plugin-no-unsanitized | 4 | **0** |
| eslint-plugin-security-node | 4 | **0** |

So "replaces" is not a positioning word here. On this corpus, removing all five and keeping
Interlace loses **nothing** and adds 42 detections that none of them make.

And against `eslint-plugin-security`'s **own** test suite — the fairest possible must-detect
set, because they wrote it — **100% of live cases**, with 121 rules to its 14.

### What this is for an organisation

The community ESLint security category is five or six half-maintained plugins that each
cover a slice, overlap unpredictably, and were last released between 2 and 24 months ago. The
normal outcome is that a team installs one, gets noise, and turns it off.

**One dependency replaces that stack.** No SaaS, no seats, no CI minutes, no dashboard, no
procurement. It runs in the editor already open, on the config already present, and it is an
easy yes precisely because nothing about adopting it is a decision anyone has to defend.

### Boundaries

These define the product; they are not caveats attached to it.

- **This is the linter layer, not SAST.** No inter-procedural dataflow, no cross-file taint,
  no build integration, no SBOM, no secret-history scanning. SAST is a different product with
  a different price and a different place in the pipeline.
- **75 CWEs**, of roughly 900. The ones an AST can see.
- **Precision is ~45% on real open-source code**, measured and published. Roughly half of
  findings need triage today; the trend and the fixes are tracked in the open.
- **"Quieter" is measured against `eslint-plugin-security`.** Against a narrow single-purpose
  plugin we report more, and we say so.

Stating the ceiling is what makes the rest load-bearing. A maintainer who hits an unmentioned
false positive closes the PR; one who was told where the line is keeps the plugin.

### Headline candidates

**1 — recommended**
> **The security layer for ESLint.**
> 121 rules, 75 CWEs. 100% drop-in parity with `eslint-plugin-security`. Free, offline, zero-config.

**2 — replacement-forward**
> **Replaces every community ESLint security plugin.**
> `eslint-plugin-security`, `security-node`, `no-unsanitized`, `@microsoft/eslint-plugin-sdl`,
> `sonarjs`. Same corpus, same harness: F1 100%, next best 51% — and every finding any of
> them makes, we make too.

**3 — the easy yes**
> **Application security you can add before lunch.**
> One dev-dependency. No SaaS, no seats, no CI minutes, no dashboard. 121 rules in the editor you already have.

Lead with 1. Use 2 wherever there is room for the table — it is the strongest thing we can
prove. Use 3 for audiences deciding whether to adopt anything at all.

## README copy

Cleared for publication. Each is one command from being falsified, which is the point.

**Lead:**

> 121 security rules with a CWE identifier, a configurable schema and a structured message ID
> on every one. **100% drop-in parity with `eslint-plugin-security`, measured against its own
> test suite.**

**Supporting bullets:**

- **100% drop-in parity** — 51/51 live cases from `eslint-plugin-security`'s own RuleTester suite
- **8.5 OpenSSF Scorecard**, including a clean Vulnerabilities check
- **121 rules · 75 CWEs · 87 configurable · 64 with automated fix suggestions** — the incumbent ships 14 rules and zero of the rest
- **Built to be read by your agent**, not just your IDE — 419 structured message IDs and machine-readable CWE/OWASP metadata
- **58 findings per 1,000 files** across 20 open-source projects against 985 — *volume, not precision; see B2*

**Do not publish:** any speed claim unqualified; "quieter" without naming the competitor and
attaching the sampled precision; or any coverage figure that depends on plugins outside the
set being compared.
