# ILB-Corpus-Truth — corpus changes

Every change to `repos.json` changes the denominator the per-rule ceilings in
`baseline.json` were recorded against. Each one is logged here with the
arithmetic that carried the baseline across it. A baseline is amended by
subtracting the removed repositories' own contributions, never by re-recording
the whole corpus, because a fresh full re-measure would silently absorb any
regression that landed since the last recording.

| Date       | Change                    | Repository                                      | Pin                                        | Reason           |
| ---------- | ------------------------- | ----------------------------------------------- | ------------------------------------------ | ---------------- |
| 2026-10-19 | removed (107 → 106 repos) | `autobe` — `https://github.com/wrtnlabs/autobe` | `f5de9927c8eee6805afa3aeafd204f4c45037e49` | upstream deleted |

## 2026-10-19 — autobe removed

The upstream repository `wrtnlabs/autobe` was deleted: the GitHub API returns
404 and `git ls-remote` fails with "Repository not found". The pinned commit
can no longer be fetched, so the scheduled run from 2026-10-13 failed in both
corpus jobs (`ILB-Corpus-Truth` and `ILB-Preset-Budget`), and every later run
would fail the same way (#1228). The other 106 repositories and their pinned
commits were all re-checked on 2026-10-19, and every one is still fetchable.

autobe's contribution was measured on a clean checkout of the pinned commit
(tracked files only, which is what CI's depth-1 fetch sees), with the same file
walk, lint config and off-SDK classification as `run.ts`:

| Rules measured with                      | Rules | Files | Findings | Off-SDK |
| ---------------------------------------- | ----: | ----: | -------: | ------: |
| baseline commit `d4cbc1846` (2026-08-11) |   151 | 1,382 |       42 |       0 |
| `main` at removal                        |   162 | 1,382 |       28 |       0 |

Baseline arithmetic:

- Per-rule off-SDK ceilings: `ceiling − 0 = ceiling` for all 151 rules, so no
  rule's ceiling changed.
- `filesScanned`: 107,384 − 1,382 = **106,002**.
- `corpusHash`: `sha256:ff73f5f0…3740` (107 pins) became
  `sha256:c1702ff5…8a11` (106 pins). It is re-derived from `name@commit` of the
  remaining pins, the same way `corpusHash()` computes it, and the old value
  reproduces exactly from the old `repos.json`.

`benchmarks/corpus-index.json` still lists autobe. That file indexes the local
`oos/` clone set, which still holds it, and the gate does not read it.
