# Benchmark Output Audit — eslint × eslint-benchmark-suite

> **Audit date:** 2026-08-22
> **Scope:** every file under `benchmarks/results/` in `ofri-peretz/eslint` and `results/` in `ofri-peretz/eslint-benchmark-suite`
> **Method:** every claim verified against the actual file or source code. File and function names are given; line numbers are omitted intentionally.
> **No data was modified, deleted, or moved.**

---

## 1. File inventory

### eslint project — `benchmarks/results/` (97 files, 67 MB)

| Directory | Files | Size | Primary consumer (reads, not writes) | Valid by `result-schema.json`? |
|---|---|---|---|---|
| `ilb-flagship/` | 3 | 55 MB | `apps/docs/src/lib/scorecard.ts` (`loadLatestFlagshipSnapshot`), `scripts/check-per-rule-budget.ts` (`loadFlagshipRows`) | ✅ all 3 pass |
| `ilb-arena/` | 7 | 688 KB | `scripts/ilb-scorecard.ts` (`loadArena`), `scripts/ilb-severity-audit.ts` | ✅ all 7 pass |
| `ilb-cwe-corpus/` | 9 | 1.4 MB | `scripts/ilb-scorecard.ts` (`loadCweCorpus`), `scripts/recall-gate.ts` (`loadLatestCweCorpus`) | ⚠️ 5 files: missing `benchVersion` + `toolchain` (warnings, pre-contract) |
| `ilb-ai/` | 26 | 6.6 MB | `scripts/ilb-scorecard.ts` (`loadAi`) | ✅ all pass (backfilled) |
| `ilb-llm-tokens/` | 2 | 32 KB | `scripts/ilb-scorecard.ts` (reads `latest.json`) | ✅ both pass |
| `ilb-llm-fix/` | 6 | 148 KB | `scripts/ilb-scorecard.ts` (reads `latest.json`) | ✅ all 6 pass |
| `ilb-perf-import/` | 1 | 4 KB | `scripts/ilb-scorecard.ts` (`loadPerf`) | ✅ passes |
| `ilb-arena-quality/` | 3 | 640 KB | `benchmarks/FP_FN_REMEDIATION_TRACKER.md` (doc link only — no code reads it) | ✅ all 3 pass |
| `ilb-formatter/` | 5 | 908 KB | `benchmarks/suites/ilb-formatter/runner.ts` (reads `baseline.json` for comparison) | ✅ all 5 pass |
| `ilb-juliet/` | 2 | 268 KB | `scripts/ilb-severity-audit.ts` (comment reference) | ⚠️ `2026-08-14.json`: missing `benchVersion` + `toolchain` |
| `ilb-corpus-truth/` | 2 | 100 KB | `.github/workflows/benchmark.yml` (uploads as CI artifact — no script reads it) | ✅ both pass |
| `ilb-confidence/` | 1 | 4 KB | **No reader** — `ilb-smoke.ts` runs the benchmark; nobody reads the result | ✅ passes |
| `ilb-determinism/` | 1 | 4 KB | **No reader** — `ilb-smoke.ts` runs the benchmark; nobody reads the result | ✅ passes |
| `ilb-diff/` | 1 | 4 KB | `scripts/ilb-diff-publish.ts` (comment reference) | ✅ passes |
| `ilb-discover/` | 1 | 52 KB | **No reader** — `ilb-smoke.ts` runs the benchmark; nobody reads the result | ✅ passes |
| `ilb-mutate/` | 1 | 4 KB | **No reader** — `ilb-smoke.ts` runs the benchmark; nobody reads the result | ✅ passes |
| `ilb-cache-matrix/` | 1 | 4 KB | **No reader** — `ilb-smoke.ts` runs the benchmark; nobody reads the result | ✅ passes |
| `ilb-node-matrix/` | 1 | 8 KB | **No reader** — `ilb-smoke.ts` runs the benchmark; nobody reads the result | ✅ passes |
| `ilb-tsc-matrix/` | 1 | 8 KB | **No reader** — `ilb-smoke.ts` runs the benchmark; nobody reads the result | ✅ passes |
| `ilb-remediation/` | 1 | 8 KB | **No reader** found | ✅ passes |
| `ilb-perf-import-nestjs/` | 7 | 968 KB | `benchmarks/suites/ilb-perf-import-nestjs/run.ts` (writes only — no downstream reader) | ✅ all pass |
| `ilb-perf-import-no-cycle/` | 3 | 20 KB | **No reader** found beyond `ilb-scorecard.ts` comment | ✅ all 3 pass |
| `ilb-perf-import-recommended/` | 1 | 4 KB | **No reader** found | ✅ passes |
| `ilb-perf-import-shapes/` | 1 | 8 KB | **No reader** — mentioned in `methodology.md` only | ✅ passes |
| `ilb-oxlint-parity/` | 5 | 24 KB | **No reader** — `.github/workflows/oxlint-parity.yml` runs the benchmark; nobody reads the result JSONs | ✅ all 5 pass |
| `landscape-data/` | 1 | 36 KB | **No reader** found | ✅ passes (`bench: ILB-Landscape`) |
| `ilb-ai-overnight/` | 1 (README only) | 2 KB | **No reader** — README points to `eslint-benchmark-suite`; no JSON files | N/A (no JSON) |
| `ilb-juliet-cwe/` | 1 | 4 KB | **No reader** — documented as orphan in `ilb-result-schema-backfill.ts` | ✅ passes (`bench: ILB-Juliet`) |
| `published/` | 1 | 24 KB | **No reader** — uses a different schema (`benchmark-v1.json`), not the vocabulary contract | ❌ missing `bench`, `benchVersion`, `timestamp`, `toolchain` |

**Validator output:** `ilb-validate-results` reports 6/93 files with issues, 14 total issues, 0 fatal. All issues are missing required fields (`benchVersion`, `toolchain`) on pre-vocabulary-contract files — warnings, not fatal errors.

### eslint-benchmark-suite project — `results/` (41 files, 3.2 MB)

| Directory | Files | Size | Primary consumer | Valid by project's own definition? |
|---|---|---|---|---|
| `ai-security/` | 17 | 1.6 MB | **No reader in this repo** — files are the source for eslint's `ilb-ai/` (copied + backfilled by `ilb-result-schema-backfill.ts`) | No schema or validator exists in this project |
| `ai-security-overnight/` | 12 | 960 KB | **No reader** — includes 10 backup JSONs + 1 log + 1 README | No schema or validator |
| `fn-fp-comparison/` | 6 | 188 KB | **No reader** — files are the source for eslint's `ilb-arena/` | No schema or validator |
| `quality-comparison/` | 2 | 424 KB | **No reader** — files are the source for eslint's `ilb-arena-quality/` | No schema or validator |
| `import/` | 1 | 4 KB | **No reader** — file is the source for eslint's `ilb-perf-import/` | No schema or validator |
| `import-no-cycle/` | 1 | 4 KB | **No reader** — file is the source for eslint's `ilb-perf-import-no-cycle/` | No schema or validator |
| `import-recommended/` | 1 | 4 KB | **No reader** — file is the source for eslint's `ilb-perf-import-recommended/` | No schema or validator |

**This project has no CI workflows, no validation script, no schema, and no code that reads from `results/`.** Every file is write-only — produced by a runner, never consumed by a downstream script in the same repo.

---

## 2. Dead, partial, superseded, or mislabeled

### Dead — no reader exists

| File / directory | Evidence |
|---|---|
| `published/benchmark-2026-08-14.json` | Uses a completely different schema (`$schema: "https://eslint.interlace.tools/schemas/benchmark-v1.json"`). No `bench` field. Grep for `published/benchmark` across `scripts/`, `apps/`, `.github/` returns zero matches. The validator flags it: missing `bench`, `benchVersion`, `timestamp`, `toolchain`. |
| `ilb-ai-overnight/` | Contains only a `README.md` pointing to `eslint-benchmark-suite`. No JSON files. The actual overnight results live in `ilb-ai/` (e.g., `overnight-multi-model-treatment-*.json`). |
| `ilb-perf-import-shapes/2026-08-02.json` | Zero code consumers. Only mention is in `benchmarks/suites/ilb-perf-import/methodology.md` (documentation). No script, test, or workflow reads it. |
| `ilb-perf-import-nestjs/fp-fn-scorecard.md` | Zero code consumers. Grep for `fp-fn-scorecard` across `scripts/`, `apps/`, `.github/` returns zero matches. |
| `ilb-perf-import-nestjs/2026-05-14.md` | Zero code consumers. Same grep, same result. |
| All benchmark-suite `results/` files | No CI, no tests, no pages, no scripts in `eslint-benchmark-suite` read from `results/`. The directory is write-only. Files are only consumed when copied into the eslint project by `ilb-result-schema-backfill.ts`. |

### Superseded — replaced by a newer version

| File / directory | Evidence |
|---|---|
| `ilb-juliet-cwe/2026-05-03.json` | Documented as an orphan in `scripts/ilb-result-schema-backfill.ts` (comment: "The `ilb-juliet-cwe/` directory is an orphan from an earlier schema"). The canonical Juliet results live in `ilb-juliet/`. No consumer reads `ilb-juliet-cwe/`. |
| `ilb-cwe-corpus/2026-05-03.json` | Has `bench: "ILB-Juliet"` — the old enum value before `ILB-CWE-Corpus` was added. The backfill script comment explains: "the enum had not been updated... the emitted results have always said ILB-CWE-Corpus; only the enum lagged." This file predates the fix. All 2026-08-* files in the same directory correctly use `ILB-CWE-Corpus`. |
| `ilb-ai/backups/` (7 files) | Pre-backfill versions of the main files. Verified: content is identical to the main files except the main files have `bench`, `benchVersion`, `toolchain` added by `ilb-result-schema-backfill.ts`. The backups are the raw imports from `eslint-benchmark-suite`; the main files are the backfilled versions. |
| `ilb-formatter/latest.json` | Byte-identical to `2026-05-11-formatter-0.1.0.json`. A duplicate, not a symlink. |
| `ilb-llm-fix/latest.json` | Byte-identical to `2026-05-03-oss-opus-v1.3.json`. A duplicate, not a symlink. |
| benchmark-suite `ai-security/backups/` (7 files) | All 7 byte-identical to the corresponding files in `ai-security/`. Pure duplication. |
| benchmark-suite `ai-security-overnight/backups/` (10 files) | All 10 byte-identical to the corresponding files in `ai-security/`. The "overnight backups" are copies of the main directory taken before an overnight run — but the overnight run wrote to `ai-security/`, not `ai-security-overnight/`, so the backups are duplicates of the current state, not a pre-run snapshot. |

### Mislabeled — directory name does not match `bench` field

| File / directory | `bench` field | Expected | Explanation |
|---|---|---|---|
| `ilb-flagship/*.json` | `ILB-Wild` | `ILB-Flagship` (not in enum) | Documented in `ilb-result-schema-backfill.ts`: `'ilb-flagship': 'ILB-Wild'`. Comment: "ilb-flagship aggregates Wild + Edge." There is no `ILB-Flagship` in the schema enum. This is a known mapping, not a bug — but the directory name is misleading to anyone who doesn't read the backfill script. |
| `ilb-oxlint-parity/*.json` | `ILB-Wild` | `ILB-Oxlint-Parity` (not in enum) | Same backfill mapping: `'ilb-oxlint-parity': 'ILB-Wild'`. Comment: "ilb-oxlint-parity is a comparative parity report against Wild." |
| `ilb-cwe-corpus/2026-05-03.json` | `ILB-Juliet` | `ILB-CWE-Corpus` | Pre-enum-update file. The backfill script comment explains the history. All 2026-08-* files in the same directory correctly use `ILB-CWE-Corpus`. |
| `landscape-data/2026-08-02.json` | `ILB-Landscape` | (matches) | Directory doesn't follow the `ilb-*` prefix convention, but the `bench` field is correct. The backfill script maps it: `'landscape-data': 'ILB-Landscape'`. |

### Partial — write-only directories (produced and validated, but no downstream consumer reads the result)

These directories pass validation but serve no downstream purpose beyond existing:

| Directory | What writes it | What reads the result |
|---|---|---|
| `ilb-confidence/` | `benchmarks/suites/ilb-confidence/run.ts` | Nobody — `ilb-smoke.ts` runs the benchmark but doesn't read the output |
| `ilb-determinism/` | `benchmarks/suites/ilb-determinism/run.ts` | Nobody — same |
| `ilb-mutate/` | `benchmarks/suites/ilb-mutate/run.ts` | Nobody — same |
| `ilb-cache-matrix/` | `benchmarks/suites/ilb-cache-matrix/run.ts` | Nobody — same |
| `ilb-node-matrix/` | `benchmarks/suites/ilb-node-matrix/run.ts` | Nobody — same |
| `ilb-tsc-matrix/` | `benchmarks/suites/ilb-tsc-matrix/run.ts` | Nobody — same |
| `ilb-discover/` | `benchmarks/suites/ilb-discover/run.ts` | Nobody — same |
| `ilb-diff/` | `benchmarks/suites/ilb-diff/run.ts` | `ilb-diff-publish.ts` (comment reference only — no active reader found) |
| `ilb-remediation/` | `benchmarks/suites/ilb-remediation/run.ts` | Nobody |
| `ilb-oxlint-parity/` | `benchmarks/suites/ilb-oxlint-parity/run.ts` | Nobody — `oxlint-parity.yml` runs the benchmark; nobody reads the result JSONs |
| `ilb-perf-import-nestjs/` | `benchmarks/suites/ilb-perf-import-nestjs/run.ts` | Nobody — the runner writes JSON + MD; no downstream script reads either |
| `ilb-perf-import-recommended/` | `benchmarks/suites/ilb-perf-import/run.ts` | Nobody |
| `ilb-perf-import-shapes/` | `benchmarks/suites/ilb-perf-import/run.ts` | Nobody |
| `landscape-data/` | Unknown (no runner found in `benchmarks/suites/`) | Nobody |

---

## 3. Size analysis

### Outliers

| File | Size | Justified? |
|---|---|---|
| `ilb-flagship/2026-05-11.json` | 53 MB | **Disproportionate.** Contains 1 result entry (vs 10 in `2026-05-10.json` at 2.7 MB). The single entry is `import-next/no-cycle` against `next.js` with 6 cold + 4 warm runs, each containing raw per-file timing data. The per-entry size is 40 MB — 15× the per-entry size of the 10-entry file. This is likely a one-off deep-dive, not a regular snapshot. |
| `ilb-ai/overnight-multi-model-treatment-7iter-2026-02-09.json` | 2 MB | Justified — 7-iteration overnight run with 6 models across 20 prompts. |
| `ilb-ai/checkpoints/` (7 files) | 2.5 MB total | Justified by iteration count (7-10 iterations each), but these are intermediate snapshots — the final result is in `ilb-ai/overnight-multi-model-treatment-*.json`. The checkpoints could be cleaned up after the final run is complete. |
| `ilb-ai/backups/` (7 files) | 720 KB | **Not justified** — pre-backfill versions superseded by the main files. Pure dead weight. |
| benchmark-suite `ai-security/backups/` (7 files) | 560 KB | **Not justified** — all byte-identical to the main files. Pure duplication. |
| benchmark-suite `ai-security-overnight/backups/` (10 files) | 800 KB | **Not justified** — all byte-identical to `ai-security/` main files. The "pre-overnight backup" is a copy of the current state, not a pre-run snapshot. |

### Duplicate `latest.json` files

| File | Duplicate of | Action |
|---|---|---|
| `ilb-formatter/latest.json` | `2026-05-11-formatter-0.1.0.json` (byte-identical) | The `latest.json` convention is used by `ilb-scorecard.ts` to find the most recent result. A byte-copy works but a symlink would be cheaper and self-documenting. |
| `ilb-llm-fix/latest.json` | `2026-05-03-oss-opus-v1.3.json` (byte-identical) | Same. |
| `ilb-llm-tokens/latest.json` | `2026-05-03-formatters-1.3.3.json` (different — has backfilled fields) | Not a duplicate — the `latest.json` has vocabulary-contract fields that the dated file lacks. |
| `ilb-perf-import-no-cycle/latest.json` | `2026-05-03-snappy-dashboard.json` (different) | Not a duplicate. |

---

## 4. Convention divergence

| Concept | eslint (`benchmarks/results/`) | eslint-benchmark-suite (`results/`) |
|---|---|---|
| **Root directory** | `benchmarks/results/` | `results/` |
| **Subdirectory naming** | `ilb-<name>/` (prefixed) | `<name>/` (no prefix) |
| **Bench type field** | `bench` (enum: `ILB-Arena`, `ILB-CWE-Corpus`, …) | `benchmark` (free-form string, e.g., `"Import Plugin Benchmark"`) or absent |
| **Required fields** | `bench`, `benchVersion`, `timestamp`, `toolchain` (enforced by `ilb-validate-results.ts`) | None enforced — no schema, no validator |
| **Structured blocks** | `cost`, `effectiveness`, `latency` with allow-listed keys | None — ad-hoc per-benchmark format |
| **Validation** | `scripts/ilb-validate-results.ts` + `benchmarks/lib/result-schema.json` | None |
| **`latest.json` convention** | Used by `ilb-llm-tokens/`, `ilb-llm-fix/`, `ilb-formatter/` | Not used |
| **Backups** | `backups/` subdirectory (pre-backfill versions) | `backups/` subdirectory (pre-run snapshots — but contents are identical to main) |
| **Consumers** | Many: `scorecard.ts`, `ilb-scorecard.ts`, `check-per-rule-budget.ts`, `recall-gate.ts`, etc. | None in-repo — files are only consumed when copied into the eslint project |
| **CI** | `.github/workflows/benchmark.yml` runs benchmarks and uploads artifacts | No `.github/workflows/` directory |
| **Cross-project flow** | Receives files from benchmark-suite via `ilb-result-schema-backfill.ts` (adds `bench`, `benchVersion`, `toolchain`) | Origin of `ilb-ai/` and `ilb-arena/` files |

### The cross-project flow

The `ilb-ai-overnight/README.md` in the eslint project says `cd eslint-benchmark-suite` — confirming the benchmark-suite project is the execution environment for AI security benchmarks. The flow is:

1. **benchmark-suite** runs the benchmark → writes raw JSON to `results/ai-security/`
2. **eslint** imports the JSON → `ilb-result-schema-backfill.ts` adds `bench`, `benchVersion`, `toolchain` → writes to `benchmarks/results/ilb-ai/`

Verified by comparing `hydra-opus-2026-02-08.json` across both projects: the benchmark-suite version lacks `bench`, `benchVersion`, `toolchain`; the eslint version has them (backfilled). All other fields are identical.

The same flow exists for:
- `results/fn-fp-comparison/` → `benchmarks/results/ilb-arena/`
- `results/quality-comparison/` → `benchmarks/results/ilb-arena-quality/`
- `results/import/` → `benchmarks/results/ilb-perf-import/`
- `results/import-no-cycle/` → `benchmarks/results/ilb-perf-import-no-cycle/`
- `results/import-recommended/` → `benchmarks/results/ilb-perf-import-recommended/`

### What a single shared convention would look like

1. **One schema, two repos.** The vocabulary contract (`result-schema.json`) already exists in the eslint project. Publishing it as a shared package (or copying it to the benchmark-suite project) would let both repos validate against the same rules.

2. **Write at the source.** The benchmark-suite runners should emit the vocabulary-contract fields (`bench`, `benchVersion`, `timestamp`, `toolchain`) directly, eliminating the backfill step. The backfill script (`ilb-result-schema-backfill.ts`) exists because the source doesn't conform.

3. **One directory naming convention.** Either the benchmark-suite adopts the `ilb-<name>/` prefix, or the eslint project drops it. The prefix is redundant when the `bench` enum field already identifies the type.

4. **One `latest.json` convention.** Either both repos use it or neither does. The eslint project uses it for 3 directories; the benchmark-suite doesn't use it at all.

5. **One backup policy.** Both repos have `backups/` subdirectories, but neither has a cleanup policy. The benchmark-suite backups are pure duplicates; the eslint backups are pre-backfill versions. A shared policy would define what backups are for and when they expire.

---

## 5. What I could not verify

1. **`landscape-data/2026-08-02.json` origin.** No runner in `benchmarks/suites/` writes to this directory. The `bench` field is `ILB-Landscape`, which is in the schema enum. The backfill script maps `'landscape-data': 'ILB-Landscape'`. But I could not find the script that produces this file. It may be produced by a manual or scheduled process not in the repo.

2. **`published/benchmark-2026-08-14.json` origin.** Uses a completely different schema (`benchmark-v1.json`) and has no `bench` field. I could not find a script that produces it or a workflow that references it. The `$schema` URL (`https://eslint.interlace.tools/schemas/benchmark-v1.json`) suggests it was produced for external publication, but the schema URL returns 404 (not verified — I did not make an HTTP request).

3. **Whether `ilb-oxlint-parity/` results are consumed by the workflow itself.** The `oxlint-parity.yml` workflow runs `npm run ilb:oxlint-parity:cached`, which writes to `results/ilb-oxlint-parity/`. The workflow may read the results within the same job for parity reporting, but I did not trace the workflow's post-run steps to confirm. The results are not read by any script in `scripts/` or `apps/`.

4. **Whether `ilb-arena-quality/` results are consumed by any code.** The only reference I found is in `benchmarks/FP_FN_REMEDIATION_TRACKER.md` (a documentation link). No script, test, or workflow reads the JSON files. But the tracker document is a living document — it may be that the results are consumed by humans reading the tracker, not by code.

5. **Whether the benchmark-suite `ai-security-overnight/backups/` were intended as pre-run snapshots.** The contents are byte-identical to the current `ai-security/` files, which suggests the overnight run wrote to `ai-security/` (overwriting the pre-existing files) and the backups were taken before the run. But I did not verify the timestamps or git history to confirm this interpretation.

6. **Whether `ilb-perf-import-no-cycle/latest.json` and `2026-05-03-snappy-dashboard.json` are intentionally different.** The `latest.json` has different content from the dated file. I did not investigate which one is canonical or why they differ.

7. **Whether any benchmark-suite file is consumed by a CI workflow in a different repo.** I only checked `eslint-benchmark-suite` for CI workflows (none exist) and the `eslint` project for cross-references. A third repo could consume these files, but I did not search beyond these two projects.
