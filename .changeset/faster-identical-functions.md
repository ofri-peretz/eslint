---
'eslint-plugin-maintainability': patch
---

Make `identical-functions` ~35x faster without changing a single finding.

The rule compared every pair of functions in a file and built a full
|a|x|b| Levenshtein matrix for each pair. Measured with `TIMING` over 60 files
(~14.6k lines) with four plugins enabled, it accounted for **933 ms — 90.9% of
all rule time**, against 21.8 ms for the next-slowest rule. Cost grew
quadratically: 4.3x the source took 8.3x the time.

Two exact prunes now skip work that provably cannot produce a match:

- **Length bound** — edit distance is at least the length difference, so
  similarity can never exceed `shorter.length / longer.length`. If that ceiling
  is already under the threshold, no matrix is built.
- **Distance budget** — a match needs a distance no greater than
  `longer.length * (1 - threshold)`; once an entire DP row exceeds it the walk
  stops, and the matrix is two rows rather than |a|+1 of them.

Same corpus after: **26.2 ms**, and the rule falls from 90.9% to 21.2% of rule
time. Findings are byte-for-byte identical — 42 before, 42 after, including the
reported `{{similarity}}%`, which is computed only over pairs already above the
threshold and therefore never touched by a prune.

The distance budget is computed as `L - ceil(L * threshold)` rather than the
more obvious `floor(L * (1 - threshold))`. The latter is lossy: `1 - 0.9` is
`0.09999999999999998`, so at the default threshold every length that is a
multiple of 10 came out one unit short, and a pair sitting exactly on the
threshold — two 20-character bodies differing by exactly 2 — was pruned away
instead of reported. That is a false negative, the one failure mode a prune
must never have. Caught in review; it left the 600-file corpus above unchanged
at 215 findings, because the defect needs a pair to land precisely on the
boundary, but it is locked now by a sweep over five thresholds and lengths
10..200 in `identical-functions-perf.test.ts`.
