# ESLint 10 migration runbook (Open Item #6)

> **What this is.** A pre-staged, audited migration plan to fix Open Item #6 in [`value-philosophy.md`](value-philosophy.md) §6.5 — the cross-version benchmark finding that **140 of 217 Interlace rules use removed-in-ESLint-10 context APIs** (`context.getFilename()`, `context.getSourceCode()`, `context.getCwd()`).
>
> **Why a runbook, not an automatic fix.** A 141-file mass `sed` refactor across 11 plugin packages is a scope escalation beyond a documentation session. This runbook captures the exact commands, audit, verification, and rollback steps so a maintainer (or AI agent with explicit authorization) can execute the fix with one command and have full reversibility.
>
> **Status:** ⏸️ Awaiting authorization. Verified against the source as of 2026-05-10. The runbook should be re-verified if the source changes materially before execution.

## Why this needs to happen

| Property | Pre-migration (today) | Post-migration |
| :--- | :--- | :--- |
| Interlace rules using removed-in-v10 APIs | 140 / 217 (64.5%) | 0 |
| `eslint10-compat-test.mjs` warmup result | RUNTIME-FAILED at first rule | Expected: success on full lodash corpus |
| CLAIMS.md "Supports ESLint 10" row | **Caveated** — partial support, structurally false in practice | Restored to full support |
| Same class of break we cite as disqualifying for `eslint-plugin-security@4.0.0` | ✗ — we have it too | Closed: claim symmetry restored |

## What's changing — three 1:1 API renames

ESLint deprecated these context methods in v8.40 (March 2023) and removed them in v10. The new properties are available in v8.40+ and v9, so the migration is forward-compatible across all currently-supported majors:

| Removed-in-v10 method | Replacement (available in v8.40+, 9, 10) | Files affected (TS source) |
| :--- | :--- | ---: |
| `context.getFilename()` | `context.filename` | **122** |
| `context.getSourceCode()` | `context.sourceCode` | **32** |
| `context.getCwd()` | `context.cwd` | **1** |
| **Total distinct files** | | **141** |

**No semantics change.** These are not behavior changes; they are the same value accessed via property instead of method. ESLint's internal implementation has provided both forms via dual-getter for years; only the function-form is removed in v10.

## Pre-flight: scope re-verification

Run this before executing the migration to confirm the audit numbers haven't drifted:

```bash
echo "Files using context.getFilename():"
grep -rl 'context\.getFilename()' packages/eslint-plugin-*/src/rules | wc -l

echo "Files using context.getSourceCode():"
grep -rl 'context\.getSourceCode()' packages/eslint-plugin-*/src/rules | wc -l

echo "Files using context.getCwd():"
grep -rl 'context\.getCwd()' packages/eslint-plugin-*/src/rules | wc -l

echo "Total distinct files:"
grep -rl -E 'context\.(getFilename|getSourceCode|getCwd)\(\)' packages/eslint-plugin-*/src/rules | wc -l
```

Expected (as of 2026-05-10): 122, 32, 1, 141. If the totals have moved by more than ±5%, re-do the §6.5 Open Item #6 assessment before executing.

## Migration: two-phase sed

The migration is two phases because some files already use the dual fallback pattern `context.filename || context.getFilename()`. Phase 1 swaps bare old APIs for new properties; Phase 2 cleans up redundant `X || X` patterns that result.

### Phase 1 — replace bare old-API calls

```bash
find packages/eslint-plugin-*/src/rules \
  -type f \( -name '*.ts' -o -name '*.mts' -o -name '*.cts' \) \
  ! -name '*.test.ts' ! -name '*.spec.ts' \
  -exec sed -i '' \
    -e 's/context\.getFilename()/context.filename/g' \
    -e 's/context\.getSourceCode()/context.sourceCode/g' \
    -e 's/context\.getCwd()/context.cwd/g' \
    {} +
```

(macOS BSD sed; on GNU/Linux, replace `-i ''` with `-i`.)

### Phase 2 — collapse redundant fallback patterns

After Phase 1, lines like `context.filename || context.getFilename()` become `context.filename || context.filename`. Collapse:

```bash
find packages/eslint-plugin-*/src/rules \
  -type f \( -name '*.ts' -o -name '*.mts' -o -name '*.cts' \) \
  ! -name '*.test.ts' ! -name '*.spec.ts' \
  -exec sed -i '' \
    -e 's/context\.filename || context\.filename/context.filename/g' \
    -e 's/context\.sourceCode || context\.sourceCode/context.sourceCode/g' \
    -e 's/context\.cwd || context\.cwd/context.cwd/g' \
    {} +
```

### Test files: skip

Only one test file references the old API and only in a comment — the test logic itself doesn't use it. Test files are excluded from both phases via `! -name '*.test.ts' ! -name '*.spec.ts'` to be safe; manual review of tests post-migration is recommended but not required for correctness.

## Verification

### Step 1 — Confirm zero remaining old-API usage

```bash
grep -rE 'context\.(getFilename|getSourceCode|getCwd)\(\)' packages/eslint-plugin-*/src/rules
# Expected: zero output (no matches)
```

### Step 2 — Type-check the migrated source

```bash
npx turbo run build --filter='eslint-plugin-*'
# Expected: 21 successful builds (or 21 cache hits if no source actually changed,
# but post-migration the hashes will have changed and a fresh build will run)
```

If the type-check fails, the most likely cause is a TypeScript signature mismatch — `context.filename` is `string | undefined` in some `@typescript-eslint/utils` versions (vs `context.getFilename()` returning `string`). If a rule does:

```ts
const fn = context.getFilename();
fn.endsWith('.ts');  // assumes string
```

post-migration this becomes:

```ts
const fn = context.filename;
fn.endsWith('.ts');  // possible-undefined error
```

Fix per-site with `fn?.endsWith('.ts')` or `(fn ?? '').endsWith('.ts')`. Tracked-but-low-volume.

### Step 3 — Run unit tests

```bash
npx turbo run test --filter='eslint-plugin-*'
# Expected: all tests pass; the API rename is semantically equivalent on
# ESLint 8.40+ / 9 / 10 (which is what the test suite runs against).
```

If tests fail in a single plugin package, isolate:

```bash
cd packages/eslint-plugin-secure-coding && npm test
```

Failures here mean a rule's logic depended on a *side effect* of the old method (none should exist; this is a property rename). Investigate per-rule.

### Step 4 — Re-run the cross-version benchmark

```bash
CORPUS=node_modules/lodash node \
  --require ./cicd-impact/scripts/cjs-resolve-shim.cjs \
  --experimental-loader ./cicd-impact/scripts/loader-hook.mjs \
  ./cicd-impact/scripts/eslint10-compat-test.mjs
```

**Expected post-migration result:** clean run on lodash, similar latency to ESLint 9 (~0.94 ms/file), similar finding count (~1,351). If this passes, **Open Item #6 is closed**.

### Step 5 — Update CLAIMS.md and the open-items table

After Step 4 succeeds:

1. In [`CLAIMS.md`](../CLAIMS.md), the "Supports ESLint 8, 9 (full); ESLint 10 partial" row → restore to **"Supports ESLint 8, 9, and 10"** (with the v10-success benchmark date as evidence).
2. In [`value-philosophy.md`](value-philosophy.md) §6.5, mark Open Item #6 as ✅ Closed with the closure date.
3. In [`v0-competitor-scorecard.md`](v0-competitor-scorecard.md) Level G, add a "Post-migration result" subsection citing the verification run.

## Rollback

The migration is fully reversible via git:

```bash
git diff packages/eslint-plugin-*/src/rules > /tmp/eslint10-migration.patch
# Inspect the diff, sanity-check
git checkout packages/eslint-plugin-*/src/rules
# Or, after committing: git revert <migration-commit-sha>
```

## Risk register

| Risk | Probability | Mitigation |
| :--- | :--- | :--- |
| Type-check failure due to `string \| undefined` signature change | Medium | Per-site `?.` chain or `?? ''` fallback; ~5–15 spots expected |
| Test failure due to mocked `context.getFilename` in a test that builds its own context | Low | Test mocks should also use the new property; per-test fix |
| A non-rule file (e.g. utility shared across rules) uses the old API and is missed by the path filter | Low–Medium | Check `packages/eslint-plugin-*/src/utils/`, `helpers/`, etc.; expand the find path if needed |
| The migration produces working code on v9 but breaks edge cases on v10 (e.g. `context.cwd` being undefined where the old method threw) | Low | The eslint10-compat-test.mjs run is the gate; if it passes on lodash, the API surface is well-covered |
| Some `*.cts` / `*.mts` files exist in `src/` and weren't matched | Low | The find expression includes them explicitly |

## Lifecycle

1. Maintainer runs the **Pre-flight** to confirm scope.
2. Maintainer (or AI agent with explicit authorization) runs **Phase 1** + **Phase 2** sed commands.
3. Maintainer runs **Verification** Steps 1–4. If any fails, halts and investigates.
4. If all pass: maintainer commits with message `fix(eslint10): migrate context.getFilename/getSourceCode/getCwd to new property accessors (Open Item #6 closure)`.
5. Maintainer runs **Step 5** to update CLAIMS.md, value-philosophy.md §6.5, and the v0 scorecard.

After successful execution, this runbook itself can either be archived (move to `_archive/`) or kept as a reference for the next removed-API migration.

## Why the `git diff` will be small

A reasonable expectation: 141 files changed, ~3 lines per file on average → ~400 line edits. Most files have a single occurrence (`context.getFilename()` once, then used as a local `const filename`). The sed-driven migration produces a clean, mechanical diff — ideal for code review.
