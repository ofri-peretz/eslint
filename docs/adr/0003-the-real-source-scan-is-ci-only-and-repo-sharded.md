# ADR 0003 — The real-source scan runs only in CI, sharded by repository

- **Status:** accepted
- **Date:** 2026-09-01
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/2026-09-01-every-rule-owes-a-real-code-tp.md`](../intents/2026-09-01-every-rule-owes-a-real-code-tp.md)

## Context

`real-source-scan.mts` clones ~113 repositories (9.7GB) and lints ~346,000
files against 566 rules with a TypeScript parser. It produces the inventory
that says which rules have real-world material, which is the input to every
sourced fixture (ADR 0002).

Run on a developer machine on 2026-08-31 it took the disk to 99% and the load
average to 53 on a 14-core box. `git log`, `ps` and `pkill` all began timing
out; recovering the machine cost more than the scan was worth, and several
unrelated pushes failed with `EPERM` while it ran.

Lifting it into CI unchanged does not work either. At ~1 file/second/worker,
346,000 files is ~96 hours single-threaded, and a hosted runner has 4 cores —
about two days against a 6-hour job ceiling.

The pre-existing `--shard i/n` slices the FILE list among forked workers on one
machine. Every file-shard still needs all 113 repositories present, which is
more disk than a hosted runner has.

## Decision

The scan runs in CI only, on a weekly schedule and `workflow_dispatch`, as a
20-way matrix over `--repo-shard=i/n`, which slices the REPOSITORY list before
anything is cloned. A merge job combines the partials.

`merge-real-source-inventory.mts` refuses to merge shards whose `configHash` or
`reposHash` disagree.

## Consequences

- Each runner clones ~6 repositories instead of 113, so the job fits a hosted
  runner's disk, and 20 shards × 2 workers is forty-way parallelism.
- Sharding is deterministic and index-based, so shard k holds the same
  repositories every run and a failed shard can be re-run alone.
- The inventory is at most a week old. Anything needing fresher material must
  dispatch the workflow, not run the script locally.
- A partial matrix cannot silently produce a number describing no actual scan,
  because mismatched hashes are refused rather than averaged.
