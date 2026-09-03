# Design — an inventory that names its own inputs

> Stage 2 artifact. Accepts [intent.md](./intent.md).

**Status:** shipped · **Opened:** 2026-09-02 · **Owner:** @ofri-peretz

---

## Requirements

1. The artifact records the hash of the config it ran with and the repository
   list it ran over.
2. A consumer refuses to quote it when either hash disagrees with disk.
3. A partial shard set cannot produce an artifact at all.
4. `withoutMaterial` is a list, because every reader spreads it.

## Design

All four already existed or were built alongside this intent, which is why it
shipped in one run rather than in a sequence:

- `real-source-scan.mts` stamps `configHash` and `reposHash`.
- `check:audit-freshness` reads them and exits 1 on a mismatch — it was already
  refusing to attribute the old artifact, in those words, before this intent
  was opened. The gate was right and unread.
- `merge-real-source-inventory.mts --expect=20` refuses fewer shards than the
  matrix declares, because a failed shard uploads no artifact and
  `download-artifact` skips a missing pattern silently.
- The merger computes `withoutMaterial` as the union of every shard's universe
  minus everything that fired anywhere.

## Verification

- 20/20 shards succeeded; the merge reported `113 repos, 347301 files`.
- Both hashes present in the committed artifact and equal to the files on disk.
- `withoutMaterial` is an array of 84, not an integer.
- The figure moved 270 → 84, which is the finding: the claim was wrong by a
  factor of three and had been quoted as a product fact.

## Rejected alternatives

**Delete the stale artifact and regenerate quietly.** Rejected: it is the
evidence for this intent. An artifact that misled everyone for weeks is worth
keeping in history, and the diff on this PR is the clearest statement of what
was wrong.

**Make `check:audit-freshness` blocking in PR CI.** Rejected for now. It runs on
a schedule and files an issue; making it block every PR would stop unrelated
work on the freshness of a weekly artifact, which is how a useful gate gets
switched off. The refusal belongs in the consumers that quote the number, and
`rule-case-ledger.ts` already implements it.

**Trust the scan without the hashes.** This is what the previous artifact did.
It is the whole reason the intent exists.

## Out of scope

Whether the 84 rules that fired nowhere _should_ fire. That is a product
question per rule, and it is the work this number now makes possible rather
than something this change answers.
