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

## The reviewer split (2026-11-25)

Each repo gets one reviewer, chosen by human merges in the last 7 days:

| Repo             | Merges / 7d | Reviewer   | Why                                                     |
| ---------------- | ----------: | ---------- | ------------------------------------------------------- |
| burgee           |         233 | Claude     | high volume                                             |
| eslint           |         208 | Claude     | high volume; `review` is a required check               |
| interlace        |         118 | Claude     | high volume                                             |
| agents           |          31 | Claude     | private: CodeRabbit's free tier covers public repos     |
| blog             |          25 | Claude     | its `REVIEW.md` checklist is fed to the Claude reviewer |
| serverless       |          21 | CodeRabbit | low volume keeps it under its free limit                |
| subagent-gateway |          19 | CodeRabbit | low volume keeps it under its free limit                |

On eslint CodeRabbit still answers `@coderabbitai review`. Measure each side on its own repos:
`--reviewer 'coderabbitai[bot]' --repo ofri-peretz/serverless --last 10`.

## Uncertainty, the human check, and comparing

Every rate is printed with its 95% Wilson interval. Claude's baseline signal share is
`8/20 = 40% (22–61%)`. `--compare a.jsonl b.jsonl` calls a change only when the two intervals do
not overlap, and refuses dumps that mix reviewer models or prompt versions (each row carries
`model` and `promptSha`).

Claude vs CodeRabbit on the same 23 PRs gives `8/20 = 40% (22–61%)` vs `12/13 = 92% (67–99%)`,
so the verdict is "improved" for CodeRabbit. Read it with care: its 13 findings came from 2 PRs,
and findings within one PR are not independent, so its true interval is wider than printed.

**Human check of the labeller, still needed.** `human-sample.jsonl` holds 20 findings (10 from
each reviewer, chosen deterministically) with the model's `label` and an empty `humanLabel`. Fill
each `humanLabel` with `judgment`, `gate` or `noise` (about 15 minutes), then run
`npx tsx scripts/review-hit-rate.ts --kappa docs/review-hit-rate/human-sample.jsonl`. Below a
kappa of 0.6, the labels decide nothing until the definitions are fixed.

## Comparison: Claude after the judgment-only prompt merges

Expected if the change works: gate drops toward 0, noise drops (citations are now reserved
for findings), signal share and acted-on rate rise. The scheduled comparison adds merged PRs
until `--compare` gives a verdict other than "no detectable change", or 60 PRs pass. If it is
still "no detectable change" at 60, the prompt change did nothing detectable and is reverted
rather than kept as ceremony.

_Pending._
