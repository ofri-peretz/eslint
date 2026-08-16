# Perfection plan — closing every measured gap vs `eslint-plugin-security`

**Created:** 2026-08-13
**Baseline:** [BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md](./BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md) (re-measured 2026-08-13)
**Living tracker** — update the status column in place; do not fork a second copy.

Every gap below was **measured**, not assumed, and every one carries the command that
proves it. Nothing enters this plan on a hunch.

---

## What "perfect" means, numerically

| Criterion | today | target |
|---|---|---|
| Weighted parity (their corpus) | 96.0% (48/50) | **100% (50/50)** |
| Detection, neutral corpus | 85.5% (65/76) | **100% (76/76)** |
| FP on our own `safe/` fixtures | 22.4% (15/67) | **0% (0/67)** |
| Fires on their `valid` cases | 23/105 | **≤4/105** (see §1.8 — 4 are correct findings) |
| Rules with a doc page | 105/121 (87%) | **121/121** |
| Doc URLs resolving | 116/121 (96%) | **121/121** |
| OpenSSF Scorecard | 8.1 | **9.0+** |
| Claims with a committed runner | 3 of 5 sections | **5 of 5** |

**Explicitly NOT goals:** downloads (13.1M vs 31k), stars (2,368 vs 14), contributors.
Those are time and distribution, not engineering, and no amount of plan closes them this
quarter. Row 31 stays lost and stays stated.

---

## The rule that governs every phase

> **No precision work ships without the recall gate run in the same session.**

Per [[precision-sweep-buys-recall-loss]] a previous sweep moved FP 10→3 while FN went
18→34. And per [[no-accepted-fp-fn]], documenting a defect is not mitigating it. Every item
below therefore has both an **exit test** and a **recall guard**, and per
[eslint/CLAUDE.md](./CLAUDE.md) every fix lands with a lock test that fails on the unfixed
code.

---

## Phase 0 — Instrument first (blocks everything else)

Without this phase, every later fix silently rots. This is not optional overhead: a 20-point
parity drop already shipped to npm unnoticed (node-security 4.11.0, PR #546).

| # | Gap | Fix | Exit test |
|---|---|---|---|
| 0.1 | Parity has no CI ratchet — `run.mjs` has baseline logic but **no `baseline.json` exists** and nothing invokes it | Generate `baseline.json`, add `ilb:competitor-parity` to the PR workflow, fail on any class regressing | A PR that reverts the child-process fix goes red |
| 0.2 | `run.mjs` only *warns* on stale monorepo dist | Make it `exit 1` like `head-to-head.mjs` already does | Running from repo root exits 1 without `--allow-local` |
| 0.3 | The 8-repo real-source scan has **no committed runner**; its clones are gone | Re-implement as `benchmarks/suites/ilb-real-source/`, clone-on-demand, commit it | `npm run ilb:real-source` reproduces a noise table |
| 0.4 | Throughput unquotable — measured 1.94×–7.38× across harnesses, 3.35× claim unverifiable | Fold throughput into 0.3 so it runs on real source, report a range not a point | A committed command prints the number in the doc |

**Phase 0 exit:** every number in the benchmark doc has a command next to it that reproduces
it, and CI fails if any of them regresses.

---

## Phase 1 — Precision: 15 → 0 false positives

All 15 were hand-read; **all 15 are genuine false positives**. One rule causes 8 of them.

Reproduce: `node benchmarks/suites/ilb-competitor-parity/head-to-head.mjs` (from an npm-installed dir).

| # | Rule | FP files | The defect | Fix |
|---|---|---|---|---|
| **1.1** | `secure-coding/no-missing-authentication` | **8** | Fires on `app.use(helmet())`, `app.use(rateLimit(...))`, `app.use(express.json())` — **middleware registration is not a route handler**. 24 of our 34 total findings. | Only treat `.get/.post/.put/.patch/.delete/.all` as route handlers. For `.use`, require a path-string first argument, and never flag a call whose argument is an imported middleware factory |
| 1.2 | `secure-coding/detect-object-injection` | 2 | `ALLOWED[req.body.key]` and `MESSAGES[locale]` where the object is a **const literal allowlist** — the documented fix for this very CWE. This is the same defect we bill them for (27% of their findings are constant keys) | Suppress when the base resolves to a `const` object literal in scope with no dynamic writes |
| 1.3 | `browser-security/no-unencrypted-transmission` | 2 | Fires on `require('http')` + `http.createServer` (**inbound server, not transmission**) and on `'test-api-key'` placeholder values | Gate on outbound calls only; skip `createServer`. Skip obvious test placeholders |
| 1.4 | `secure-coding/no-directive-injection` | 1 | `node.innerHTML = DOMPurify.sanitize(...)` — the sanitizer is the adjacent call | Recognise known sanitizers (DOMPurify, sanitize-html, xss) wrapping the assigned value |
| 1.5 | `secure-coding/no-format-string-injection` | 1 | Template literal used as a **file path** (`` `./uploads/${req.params.id}` ``), not a format string | Require a format-string sink (`util.format`, `printf`-family), not any template literal |
| 1.6 | `secure-coding/no-insecure-comparison` | 1 | `verifyToken(token).valid === true` — comparing a **boolean to a literal**, not a secret | Skip when either side is a boolean/null/undefined literal |
| 1.7 | `browser-security/no-missing-security-headers` + `require-csp-headers` | 1 | Fire on a pure string-comparison utility with **no HTTP response anywhere in the file** | Evidence-gate on an actual response object, per [[sdk-evidence-gate-pattern]] |
| **1.8** | `node-security/detect-child-process` | — | Fires on `spawn(str)` / `child.spawn(str)`. **`spawn` does not invoke a shell** unless `shell: true`; they are right and we are over-firing. 19 of our 23 hits on their valid corpus | Only report `spawn`/`spawnSync`/`execFile` when `shell: true` is passed. Keep `exec`/`execSync` unconditional |

**1.8 is free.** `spawn` appears in **11 of their `valid` cases and 0 of their `invalid` cases**
— verified against the vendored corpus — so this cannot cost a single point of parity.

### 1.1b — the deeper defect behind 1.1 (found while fixing it)

After 1.1, four findings remain, and they expose a design gap rather than a bug:
**the rule treats every route as requiring authentication.** It has no concept of a route
that is public *by definition*.

| Fixture | Route | Verdict |
|---|---|---|
| CWE-640 | `app.post('/forgot-password', csrfProtection, …)` | **Clear FP.** A password-reset endpoint cannot require auth |
| CWE-843 | `app.get('/search', …)` | Public search — FP in context |
| CWE-209 | `app.get('/reports/:id', …)` | Defensible finding |
| CWE-178 | `app.get(/^\/admin\/users$/i, …)` | **Genuine finding** — an admin route with no auth |

On real code this fires on every login, signup, forgot-password, health check, metrics
endpoint and public search. `ignorePatterns` exists but **defaults to empty**, so every
consumer inherits the noise.

**Fix:** ship a default `ignorePatterns` covering conventionally-public routes
(`login`, `signup`, `register`, `forgot-password`, `reset-password`, `health`, `healthz`,
`status`, `metrics`, `public`, `webhook`), overridable as today.

**Do NOT fix this by editing the fixtures.** Per [[benchmark-corpus-is-a-calibrated-instrument]],
altering corpus files silently restates every published number. Two of the four are real
findings and must stay red until the rule earns them.

**Exit test:** `head-to-head.mjs` reports `FALSE POS us 0/67`.
**Recall guard:** the same run must still report `DETECTION us ≥65/76`, and
`ilb:competitor-parity` must still report weighted ≥96.0%. Run both before committing.

---

## Phase 2 — Recall: parity to 50/50, corpus to 76/76

| # | Gap | Evidence | Fix |
|---|---|---|---|
| **2.1** | `detect-non-literal-fs-filename` is silent on every `MemberExpression` / `CallExpression` argument | `fs.readFileSync(x)` fires; `fs.readFileSync(req.query.f)`, `fs.readFileSync(x.y)`, `fs.readFileSync(getPath())` do not | Same node-type fall-through already fixed in `detect-child-process` — port that fix. **Closes both remaining parity cases → 100%** |
| 2.2 | CWE-943 NoSQL injection **0/2** | `head-to-head.mjs` | `mongodb-security` rules are SDK-evidence-gated; the fixtures may not import the SDK. **Verify the fixture first** — per [[sdk-evidence-gate-pattern]] a missing import makes the MISS the harness's fault, and that exact error already corrupted one PoC table |
| 2.3 | CWE-598 GET with sensitive data **0/2** | `head-to-head.mjs` | No rule covers it. Candidate for a new rule; check [SECURITY-RULE-CANDIDATES.md](../SECURITY-RULE-CANDIDATES.md) before writing one |
| 2.4 | CWE-327 broken crypto **2/4** | `head-to-head.mjs` | Two shapes uncovered — identify which before scoping |
| 2.5 | CWE-020 / CWE-444 / CWE-636 / CWE-770 partials | 1-of-2 in the stale-dist run, 2-of-2 published — **re-measure before acting** | Confirm against published; do not chase a stale-dist artifact |

**Exit test:** weighted parity 50/50, `DETECTION us 76/76`.
**Precision guard:** FP must stay at whatever Phase 1 achieved. Both directions, same session.

---

## Phase 3 — Documentation completeness

We publish **7.5× more docs than they do** (105 pages, 6,410 bytes average, vs 14 pages at
546) and still lose the row, because completeness is what is scored.

| # | Gap | Detail |
|---|---|---|
| 3.1 | 16 rules have no doc page (105/121) | Rules grew 110→121 while docs grew 108→105. Docs are not keeping pace with rules |
| 3.2 | 5 doc URLs 404 | `secure-coding/no-bidi-characters`, `secure-coding/no-template-injection`, `node-security/no-shell-injection`, `node-security/no-dynamic-algorithm-selection`; `node-security/no-dynamic-dependency-loading` errored |
| 3.3 | No gate prevents 3.1/3.2 recurring | `no-bidi-characters` shipped in 4.1.0 **with a 404 doc URL** — the docs-URL defect was fixed once and regressed on the next new rule |

**Fix 3.3 first.** A CI check that every exported rule has a doc page and that every
`meta.docs.url` HEADs 200 makes 3.1 and 3.2 self-closing and permanent. Without it they
recur on the next rule.

**Exit test:** 121/121 doc pages, 121/121 URLs resolve, CI red if either drops.

---

## Phase 4 — OpenSSF Scorecard 8.1 → 9.0+

| Check | now | target | Action |
|---|---|---|---|
| Code-Review | 0 | 8+ | PRs need an approving review before merge. Conflicts with solo-merge habit — the cheapest path is requiring review on the ruleset and using it |
| CII-Best-Practices | 0 | 5+ | **Registration at bestpractices.coreinfrastructure.org — Ofri must do this**, it needs an account. Free 10 points; neither side has it |
| Branch-Protection | 4 | 6+ | Tighten the ruleset on `main` |
| Pinned-Dependencies | 8 | 10 | Pin remaining unpinned GitHub Actions to SHAs |
| SAST | 8 | 10 | Already 8; check what the scanner wants |
| Contributors | 3 | — | **Not addressable.** Requires contributors from ≥2 orgs. Accept the loss |

**Exit test:** `docker run gcr.io/openssf/scorecard:stable --repo=github.com/ofri-peretz/eslint`
reports ≥9.0.

---

## Phase 5 — Make every claim reproducible

The benchmark doc currently has **two sections that cannot be re-derived** (§8 noise, §10
docs/size, both carried from 2026-08-11 with no runner). A number nobody can reproduce is a
liability in a PR to a maintainer, not an asset.

| # | Action |
|---|---|
| 5.1 | Re-run §7 (15-PoC table) against published 4.1.0/1.3.2/4.12.0 — the current numbers describe 3.6.1/1.3.0/4.9.1 |
| 5.2 | Re-run §9 install-footprint against current tarballs |
| 5.3 | Re-measure §10 runtime-size-per-rule (rule count moved 110→121) |
| 5.4 | Delete or re-derive §8 once 0.3 lands |

**Exit test:** the "carried over, NOT re-measured" banner is deleted because nothing is.

---

## Sequencing

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 5
   │                       ▲
   └──► Phase 3 ───────────┘
        Phase 4 (independent, any time)
```

Phase 0 gates everything: without the ratchet, Phase 1 and 2 fixes regress the way #546
regressed the last ones. Phases 3 and 4 are independent and can run in parallel.

**Highest value per hour, in order:**
1. **1.1** — one rule, 8 of 15 FP files, takes FP from 22.4% to 10.4% and ties them
2. **1.8** — free, zero recall cost, kills 19 of 23 hits on their valid corpus
3. **2.1** — one predicate, takes parity to 100% and closes a live CWE-22 blind spot
4. **0.1** — the ratchet, so none of the above silently reverts

Those four alone produce: parity **100%**, FP **≈7/67**, their-valid **≈4/105** — every
headline row won except adoption, docs completeness, and tarball size.

---

## Status

| Phase | Item | Status |
|---|---|---|
| 0 | 0.1 ratchet | ☐ |
| 0 | 0.2 stale-dist exit 1 in `run.mjs` | ☐ |
| 0 | 0.3 real-source runner | ☐ |
| 0 | 0.4 throughput on real source | ☐ |
| 1 | 1.1 `no-missing-authentication` middleware | **☑ done** — 24 findings/7 files → 4/4. Mutation-verified. Branch `fix/perfection-phase0-1` |
| 1 | **1.1b (NEW)** `no-missing-authentication` has no notion of a public route | ☐ — see below |
| 1 | **1.9 (NEW)** rule writes `DEBUG MSG:` to stdout | **☑ done** — shipped defect, corrupts JSON/SARIF output |
| 1 | 1.2 object-injection const allowlist | ☐ |
| 1 | 1.3 unencrypted-transmission server/test | ☐ |
| 1 | 1.4 sanitizer awareness | ☐ |
| 1 | 1.5 format-string sink | ☐ |
| 1 | 1.6 boolean comparison | ☐ |
| 1 | 1.7 header rules evidence gate | ☐ |
| 1 | 1.8 `spawn` without `shell:true` | ☐ |
| 2 | 2.1 fs member-expression FN | ☐ |
| 2 | 2.2–2.5 corpus gaps | ☐ |
| 3 | 3.1–3.3 docs + CI gate | ☐ |
| 4 | 4.x scorecard | ☐ |
| 5 | 5.1–5.4 re-derive carried claims | ☐ |


---

## 2026-08-14 — phase 2 close-out

Measured after every change, with the suite that owns each number.

| | recommended (177 rules) | all rules (276) |
|---|---|---|
| Detection, labelled corpus | **76/76** | **76/76** |
| False positives, safe corpus | **0/67** | 1/67 |

The single finding under all-rules is `CWE-327/safe/verify-allowlist.js`, caught by
three **opt-in** JWT hardening rules (issuer, audience, maxAge). The fixture is safe for
CWE-327, which is what it is labelled for. That is a second-axis finding, not a defect,
and the fixture is left alone — `benchmarks/corpus` is a calibrated instrument.

Competitor parity, on `eslint-plugin-security`'s own RuleTester suite:

| | before | after |
|---|---|---|
| Weighted parity | 51/51 | **51/51** |
| Raw parity | 51/84 | **51/84** |
| Fires on their `valid` cases | 23/105 | **15/105** |

All 23 were read by hand. Eight were genuine false positives and are fixed. The
remaining 15 are scope differences where our finding stands: 11 non-literal `spawn`
(they treat shell-free spawn as safe; a `spawn(str)` still runs an attacker-named
binary), 3 `eval` of a literal, 1 `new Buffer`.

### What still needs a decision, not an implementation

- **Six deprecated rules are still exported.** Each carries a working `replacedBy` and
  none ship in `recommended`. Removing them is a breaking change across several plugins,
  so it is a major-version call rather than something to slip into this PR.
- **Real-source absolute numbers must be re-run against npm after release.** A run
  against the local build reports different totals than the published JSON, because the
  local dist carries rules the published versions do not. Per
  [BENCHMARK-PUBLISHING-PLAN.md](./BENCHMARK-PUBLISHING-PLAN.md) §5 the order is
  merge → release → re-run → publish. Nothing in `BENCHMARK-RESULTS.md` has been
  restated from a local run.
- **E5, "what a false positive looks like", is still open on both sides.** Neither we
  nor the incumbent tell a reader how to recognise one. The rules fixed here now carry
  that knowledge in code comments; surfacing it in `docs/rules/*.md` is the next step.
