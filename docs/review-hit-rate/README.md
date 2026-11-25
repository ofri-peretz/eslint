# Claude reviewer hit rate

Does the `review` check (`.github/workflows/claude-code-review.yml`) find things only a reader
can find, and does anyone act on them? Measured by `scripts/review-hit-rate.ts`.

- **Finding**: a distinct `path:line` the reviewer cites, in its summary comment or inline.
- **Acted on**: a later commit on the same PR touches that file. This is a proxy, because a
  touch can be unrelated to the finding.
- **Label**: a reader sorts each finding into `judgment` (needs a reader), `gate` (a program
  in CI would report it) or `noise` (a citation that is not a finding).

```bash
npx tsx scripts/review-hit-rate.ts --last 10 --dump docs/review-hit-rate/<date>.jsonl
```

## Baseline: 2026-11-25, PRs 1766..1792 (20 merged, old prompt)

| Label     | Findings |    Acted on |
| --------- | -------: | ----------: |
| judgment  |        7 |           4 |
| gate      |        3 |           0 |
| noise     |        9 |           1 |
| **total** |   **19** | **5 (26%)** |

**Signal share** (judgment / all citations) is **37%**. Gate duplicates are 16%, and none was
acted on. Noise is mostly "verified correct ✓" notes that cite a line. The rows are in
`baseline-2026-11-25.jsonl`. The labels came from a fresh reader that had not seen the
prompt change; use the same kind of reader for the comparison.

## Comparison: the 10 PRs after the judgment-only prompt merges

Expected if the change works: gate drops toward 0, noise drops (citations are now reserved
for findings), signal share and acted-on rate rise. If signal share does not move, the
prompt change did nothing and should be reverted rather than kept as ceremony.

_Pending._
