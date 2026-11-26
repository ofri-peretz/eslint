# Claude reviewer hit rate

Does the `review` check (`.github/workflows/claude-code-review.yml`) find things only a reader
can find, and does anyone act on them? Measured by `scripts/review-hit-rate.ts`.

- **Finding**: a distinct `path:line` the reviewer cites on a PR, in its summary comment or
  inline. A re-review citing the same place again is the same finding.
- **Acted on**: a later commit on the same PR touches that file. This is a proxy, because a
  touch can be unrelated to the finding. A bare file name that matches several files in the
  PR (`index.ts`) never counts as acted on.
- **Label**: a reader sorts each finding into `judgment` (needs a reader), `gate` (a program
  in CI would report it) or `noise` (a citation that is not a finding).

```bash
npx tsx scripts/review-hit-rate.ts --last 10 --dump "docs/review-hit-rate/after-$(date +%F).jsonl"
```

## Baseline: 2026-11-25, PRs 1766..1792 (23 merged non-bot PRs, old prompt)

| Label     | Findings |    Acted on |
| --------- | -------: | ----------: |
| judgment  |        8 |           4 |
| gate      |        3 |           0 |
| noise     |        9 |           0 |
| **total** |   **20** | **4 (20%)** |

**Signal share** (judgment / all findings) is **40%**. Gate duplicates are 15%, and none was
acted on. Noise is mostly "verified correct ✓" notes that cite a line. Each row of
`baseline-2026-11-25.jsonl` carries its `label`. The labels came from fresh readers that had
not seen the prompt change; use the same kind of reader for the comparison.

## CodeRabbit on the same PRs (2026-11-25)

`--reviewer 'coderabbitai[bot]'` over the same 23 PRs. CodeRabbit reviewed only **2 of 23**: it
was rate-limited on the other 21 (its free OSS quota), while Claude reviewed all 23.

| Reviewer   | PRs reviewed | Findings | Judgment | Acted on | Judgment per reviewed PR |
| ---------- | -----------: | -------: | -------: | -------: | -----------------------: |
| Claude     |        23/23 |       20 |  8 (40%) |  4 (20%) |                     0.35 |
| CodeRabbit |         2/23 |       13 | 12 (92%) |  8 (62%) |                        6 |

Two PRs is far too few to rank the reviewers, and both touched `.claude/` tooling. What the
numbers do show: CodeRabbit's findings, when it runs, are almost all judgment. Its binding
constraint is quota, not quality. Five of its unacted findings are logic bugs in
`.claude/hooks/verify-before-stop.mjs` (for example `npm test || true` recorded as a pass),
tracked separately. Rows are in `coderabbit-baseline-2026-11-25.jsonl`.

## Comparison: the 10 PRs after the judgment-only prompt merges

Expected if the change works: gate drops toward 0, noise drops (citations are now reserved
for findings), signal share and acted-on rate rise. If signal share does not move, the
prompt change did nothing and should be reverted rather than kept as ceremony.

_Pending._
