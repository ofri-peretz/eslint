# Benchmark run sheet — everything prepared, in execution order

**Prepared:** 2026-08-13. **Purpose:** a fresh session should be able to run the full
benchmark and produce the presentation without re-deriving anything.

Criteria: [BENCHMARK-CRITERIA.md](./BENCHMARK-CRITERIA.md) · Results: [BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md](./docs/planning/BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md) · Open work: [PERFECTION-PLAN.md](./PERFECTION-PLAN.md)

---

## STOP — do not run the benchmark yet

Three blockers make any run produced today unpublishable. Fix them first or the numbers
have to be thrown away and re-measured, which has already happened four times.

### Blocker 1 — 4 red tests
`packages/eslint-plugin-secure-coding`, all in `no-format-string-injection`. Three pin the
behaviour deliberately removed (a template literal with no `%s`/`%d` reported as CWE-134).
**Decision needed:** rewrite the three tests (they assert a defect), or revert the gate and
accept the FP. Nothing else should be built on a red suite.

### Blocker 2 — three FP bugs found by hand-reading, not yet fixed
From a 48-finding sample on `parse-server`, **48/48 false positives**, three causes:

| Bug | Fix |
|---|---|
| `spec/` directories are linted | add `spec\|specs\|e2e\|benchmark` to `SKIP_DIR` in `ilb-real-source/run.mjs`; also make rules self-skip `*.spec.*` |
| `localhost` / `example.com` not exempt in `no-insecure-websocket` and `no-http-urls` | port `isLoopbackUrl` from `no-unencrypted-transmission`; add RFC 2606 domains |
| `no-unsafe-deserialization` double-reports one line | mirror the `handledMemberExpressions` WeakSet pattern from `detect-object-injection` |

Bug 1 alone invalidates the 20-repo table for **both sides**.

### Blocker 3 — nothing is committed
All work is uncommitted on `fix/perfection-phase0-1` in the `eslint-perfection` worktree
(created off `origin/main` at `f737aa5f`). The main `eslint/` tree is 257 commits behind
and must not be used for rule edits.

---

## Execution order

### Phase 1 — green the tree
```bash
cd /Users/ofri/repos/ofriperetz.dev/eslint-perfection
npx vitest run --coverage.enabled=false   # per package; expect 4 red in secure-coding
```
Resolve Blocker 1, then Blocker 2, each with a lock test that fails on the unfixed code.

### Phase 2 — rebuild, then the labelled gates
```bash
npx turbo run build --filter='eslint-plugin-*'
node fp-audit.mjs                                    # expect FP 0/67
node det-audit.mjs                                   # detection, 3 plugins
node det-all.mjs                                     # detection, 7 plugins — expect 73/76
node benchmarks/suites/ilb-competitor-parity/run.mjs --allow-local
node benchmarks/suites/ilb-competitor-parity/head-to-head.mjs --allow-local
```
`fp-audit.mjs`, `det-audit.mjs`, `det-all.mjs`, `miss-all.mjs` live at the worktree root and
are scratch — **move them into `benchmarks/suites/` before committing.**

### Phase 3 — real source (the only publishable tier)
```bash
node benchmarks/suites/ilb-real-source/run.mjs --corpus=popular   # 20 repos, ~24k files
node benchmarks/suites/ilb-real-source/run.mjs --corpus=adoption  # 20 pitch targets
node benchmarks/suites/ilb-real-source/run.mjs --corpus=all --json > results.json
```
Takes ~10 min for the first clone pass; cache is reused after. Add LOC counting and
`stats: true` per-rule timing before this run — findings per 1k **LOC** is the criterion,
not per file.

### Phase 4 — the sample read (converts volume into precision)
≥20 findings per side, stratified across repos and the top 5 rules. Label TP / FP /
undecidable with a one-line reason each. `sample.mjs` at the worktree root does the
extraction. **Without this, no volume number may be published.**

### Phase 5 — Juliet
```bash
npx tsx benchmarks/suites/ilb-juliet/run.ts
```
Never verified. It is the only instrument that yields **real FN** on code we did not
author. Check it before building anything new for FP/TP/FN.

---

## Numbers already measured (2026-08-13, re-verify before publishing)

| Criterion | Us | Them | Tier |
|---|---|---|---|
| OpenSSF Scorecard | **8.1** | 6.8 | Publishable |
| — Vulnerabilities check | **10** | 0 | Publishable |
| Rules | **121** | 14 | Publishable |
| CWE ids in rule metadata | **75** | 0 | Publishable |
| Configurable rules | **87 (72%)** | 0 | Publishable |
| messageIds | **419** | 0 | Publishable |
| Suggestion-providing rules | **64** | 0 | Publishable |
| Docs bytes per rule | **6,410** | 546 | Publishable |
| Rules with a doc page | 105/121 | 14/14 | **we lose** |
| Weighted parity (their suite) | **96.0%** (48/50) | — | Publishable |
| Detection, our corpus, 7 plugins | **73/76** | 11/76 | Internal |
| FP on our `safe/` fixtures | **0/67** | 7/67 | Internal |
| Real source, 20 repos, 24,078 files | 3,921 | 25,702 | **volume only** |
| — per 1,000 files | 163 | 1,067 | **volume only** |
| Downloads/mo | 31,326 | 13,109,041 | **we lose** |

**Anomalies to explain before publishing:** `parse-server` 300 findings on 368 files (spec
dirs — Blocker 2); `express` and `node-jsonwebtoken` at **zero** (verify `SKIP_DIR` isn't
eating `lib/`); `mongoose` 2,101 vs 21 (their `detect-object-injection` carpet-bombing, or
our missing NoSQL coverage — `mongodb-security` is not loaded in `ilb-real-source`).

---

## Presentation spec

Publish as an artifact. Structure:

1. **Headline** — the four Publishable claims from BENCHMARK-CRITERIA §D4, each with its command.
2. **Scorecard** — 35 criteria, winner column, tier badge (Publishable / Internal) per row.
3. **OpenSSF** — 18-check table, both repos.
4. **Detection & precision** — labelled corpora, with any-rule vs attribution-correct TP shown separately.
5. **Real source** — 20-repo table, findings per 1k LOC, `louder on N of M`, sampled-FP beside it.
6. **AI feedback** — BENCHMARK-CRITERIA §C. The differentiator. Include our own defects (uncalibrated CVSS, truncated interpolation, no FP-recognition guidance) — self-criticism is what makes the rest credible.
7. **What we lose** — docs completeness, adoption, tarball size. Stated plainly.

Every number carries its command. Every claim carries its caveat in the same sentence.

---

## Hard-won traps — do not re-learn these

1. `lintText` with a `filePath` outside cwd returns one `ruleId: null` "File ignored" message and **zero findings**. Scored 0/76 for both sides and read as a tie.
2. Flat config lints only `**/*.js` without an explicit `files` pattern — every `.ts` is silently skipped. Cost three separate runs. The ecosystem is majority TypeScript.
3. The monorepo `dist/` is stale (3.3.2/1.2.6/4.4.1). A printed warning does not work; `head-to-head.mjs` exits 1, `run.mjs` still only warns.
4. Any-rule scoring inflates: 4 corpus files were credited to `no-missing-authentication` firing on unrelated Express boilerplate, with no rule detecting the CWE under test.
5. The benchmark loads 3 of 30 plugins. Loading the 4 owning plugins moved detection 61→73.
6. A measurement with no committed runner is not a measurement — the 8-repo scan is gone.
