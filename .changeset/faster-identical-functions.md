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
