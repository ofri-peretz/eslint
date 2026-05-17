# FP/FN Scorecard — `ilb-perf-import-nestjs`

Reference: **oxlint-builtin** (oxlint v1.62.0's Rust-native `import/no-cycle`).

Granularity: **file-level**. A "finding" is "the plugin reports at least one
cycle attached to file X". This is coarse — it can't distinguish two
different cycles in the same file — but it's the highest fidelity available
without changing user-facing diagnostic messages. (Only oxlint emits cycle
member paths in machine-readable form.)

| Metric | Value |
|---|---|
| Reference unique files | 164 |
| Reference raw diagnostics | 417 |
| Generated | 2026-05-14T04:38:24.291Z |

## Scorecard

| Plugin | Host | Total diags | Unique files | TP | FP | FN | Precision | Recall | F1 |
|---|---|---|---|---|---|---|---|---|---|
| `import-next` | eslint | 627 | 122 | 121 | 1 | 43 | 99.2% | 73.8% | 84.6% |
| `import-official` | eslint | 194 | 164 | 164 | 0 | 0 | 100% | 100% | 100% |
| `oxlint-import-next` | oxlint | 736 | 138 | 137 | 1 | 27 | 99.3% | 83.5% | 90.7% |

## Reading the numbers

- **Precision** = TP / (TP + FP) — when this plugin says "file X has a cycle", how often is it right?
- **Recall** = TP / (TP + FN) — of the files oxlint flags, how many does this plugin also catch?
- **Total diags vs Unique files**: large gap means many diagnostics on the same file (over-reporting via multiple import paths).
- **0 cycles** means the plugin's resolver or config isn't wired correctly — not an algorithm result.

## Known limitations

- **File-level only.** Two plugins reporting at the same file get scored as
  agreeing even if they found different cycles in that file. Fixing this
  requires our plugin to expose cycle members in the diagnostic (e.g.
  adding `{{cycle}}` to message templates in `no-cycle.ts`).
- **No Tier-B verification.** We treat oxlint's 417 cycles as ground truth.
  oxlint's defaults are `ignoreTypes: true`, so it suppresses type-only
  cycles; our plugin reports them. Some of our FPs may be legitimate cycles
  oxlint chose not to report. Sample-verifying 50 of them would tell us.
- **eslint-plugin-import-x under ESLint** reports 0 cycles — config bug, not
  algorithm result. Same for import / import-x under oxlint.

## Next steps to upgrade scoring

1. Modify [no-cycle.ts](../../../packages/eslint-plugin-import-next/src/rules/no-cycle.ts)
   message templates to include `{{cycle}}` so cycle members are in the
   diagnostic text — then the scorer can do cycle-level (not just file-level)
   matching.
2. Random-sample 50 of oxlint's 417 cycles, hand-verify, compute its precision
   on the sample. Use this to calibrate the reference.
3. Fix the `settings` propagation under oxlint for the JS-hosted import /
   import-x plugins — currently they detect 0 cycles, blocking those rows.
