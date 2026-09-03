# ILB Doc-Harvest Stress Test

> Generated 2026-05-11 from each rule's own `## ❌ Incorrect` and `## ✅ Correct` doc blocks. Disagreements = the rule's documentation contradicts its implementation.

## Top-line

- **20** plugins scanned · **399** rules with docs · **280** rules contributed cases
- **557** total cases · **557** matched expectation
- **0** FN findings (rule silent on doc-labelled vulnerable example)
- **0** FP findings (rule fired on doc-labelled safe example)
- 0 snippets failed to parse · 0 plugins failed to load
- Duration: 2.3 s

## Rules with the most FN findings (rule misses its own bad examples)

| Rule | Cases | FN | FP | Matched |
|---|---:|---:|---:|---:|

## Rules with the most FP findings (rule fires on its own good examples)

| Rule | Cases | FP | FN | Matched |
|---|---:|---:|---:|---:|

## How to drill into a single rule

```bash
npm run ilb:stress-test-docs -- --rule=<rule-name>
```

Then inspect `benchmark-results/stress-test-docs.json` for the per-block verdict — each entry includes `section`, `blockIndex`, `expected`, `actual`, and `firstMessage`.
