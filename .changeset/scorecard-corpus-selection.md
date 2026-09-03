---
---

fix(benchmarks): the scorecard mixed two corpora and called it a regression

`ilb-wild.ts` writes both corpora into `benchmark-results/<date>/`, tagged by
`fpCorpusMode`: the Wild corpus (broad popular OSS) and the Edge corpus (five
adversarial-real repos chosen to provoke false positives). The scorecard took
the newest dated directory whatever it held.

When the 2026-08-03 Edge run landed, three rows silently changed meaning:

| row      | before                   | after the swap                                 |
| -------- | ------------------------ | ---------------------------------------------- |
| ILB-Perf | 5.4 ms/file              | 35.2 ms/file — _against a ≤15 SLO set on Wild_ |
| ILB-Cov  | 39/208 rules, 11 plugins | 25/111 rules, 3 plugins                        |
| ILB-Wild | 3.48 findings/kLoC       | 7.37, from code selected to produce findings   |

Nothing failed. The table looked authoritative, and the trend sparkline drew
both corpora as a single series — so a corpus swap read as a 6.5× performance
regression. That is worse than a missing number: it invites a fix for a problem
that does not exist, and I nearly reported it as one.

Runs are now selected by corpus. `ILB-Wild`, `ILB-Perf` and `ILB-Cov` read the
Wild corpus; `ILB-Edge` resolves the Edge corpus itself instead of being handed
whatever ILB-Wild loaded — that coupling was the bug.

Locked, and verified by sabotage: deleting the corpus filter fails the lock.

The real readings stand and two still miss their SLO — coverage at 19% against
≥70%, and Edge's 2,710 FP candidates still untriaged, so the ≤2% FP-rate SLO
has no verdict at all. Those are now visible as themselves rather than hidden
behind a phantom perf regression.
