# Intent — 270 rules are recorded as catching nothing, by an artifact that cannot say what it asked

> Stage 1 artifact of the AI-native SDLC. Opened after measuring the real-source
> inventory against the config it claims to describe.

**Status:** draft · **Opened:** 2026-09-02 · **Owner:** @ofri-peretz

---

## What is wanted

"Scanned and never fired" is the strongest negative claim this project makes
about one of its own rules. It may be published only when the artifact behind it
can name the rule set it asked and the repositories it asked about, and when
both match what is on disk.

## Why now

`benchmarks/budgets/real-world-rule-inventory.json` lists **270 of 470 rules**
as having no real-world material. That number has been read as a product
finding. It is not one.

The file carries **no `configHash` at all** — it predates the stamp — so nothing
records which rules it asked. `check:audit-freshness` already refuses to
attribute it, in these words:

> inventory records no configHash — it predates the stamp, so which rules it
> asked is unknown

Measured rather than assumed: under the **current** `eslint.real-source.config.mjs`,
two small files fire **20 rules** — 11 of them `react-a11y` rules that the
inventory lists as never firing, plus `maintainability/cognitive-complexity`,
`reliability/no-silent-errors` and `react-features/jsx-no-literals`.

Whole plugins read as "catches nothing" because they were never asked:

| Plugin            | Rules recorded silent | Rules that fired |
| :---------------- | --------------------: | ---------------: |
| `react-features`  |                    61 |                0 |
| `react-a11y`      |                    37 |                0 |
| `conventions`     |                    15 |                0 |
| `maintainability` |                    12 |                0 |
| `reliability`     |                     9 |                0 |

A generic code-quality rule firing zero times across 345,841 real files is not a
finding about the rule. `maintainability/cognitive-complexity` scoring zero is
impossible, and it is the tell that the instrument, not the product, is what the
number describes.

## Why it was stuck, and why it is not any more

The scan must never run on a developer machine, so it runs in CI; and
`workflow_dispatch` resolves from the default branch, so it could not be
triggered while the fix sat on a feature branch. **That branch merged on
2026-09-02** (#793). The block is gone.

Two defects found on the way there are already fixed and shipped with it: the
sharded merger wrote `withoutMaterial` as a COUNT while every reader spreads it
as a list — the first inventory it committed would have killed every later
`rule-case-ledger` run — and it merged whatever shards arrived, so a failed
shard produced a partial inventory that looked complete. It now refuses fewer
shards than `--expect`.

## Constraints

- **`real-source-scan.mts` must never run on a developer machine.** It clones
  112 repositories and lints 345,841 files; it runs in CI or not at all.
- **A partial scan may not produce an inventory.** The merger refuses fewer
  shards than `--expect`, because a failed shard uploads no artifact and
  `download-artifact` skips it silently.
- **Shards that disagree on `configHash` or `reposHash` may not be merged** —
  they answered different questions.
- **The existing artifact is not to be deleted.** It is the evidence for this
  intent; it is superseded by a scan, not tidied away.

## Success criteria

- **Now:** 1 inventory, 0 attribution, 270 rules under an unfalsifiable claim.
- **Wanted:** an inventory whose `configHash` and `reposHash` match the files on
  disk, and a reachability figure derived from it.
- **Breach:** any consumer quoting `withoutMaterial` while the hashes disagree.
- **Proven by:** `check:audit-freshness` exiting 0 on the committed artifact —
  it exits 1 today, naming the missing `configHash`.

## What follows from it, and only from it

Three pieces of work are waiting on this number and should not start before it:

1. **Batch 2 corpus fixtures.** "Reachable" is read off this inventory. Cutting
   fixtures against the current one aims at a list produced by a config that
   never ran seven plugins.
2. **The honest "no real-world instance" report.** Cannot be written today. The
   correct answer to "which rules never fire" is presently _we cannot say_.
3. **The corpus-coverage ceiling.** 145 rules are unmeasured and only 33 have
   any known material — but that 33 comes from the same unattributed file.

## Open questions for Design

1. Does the freshness gate become blocking, or stay advisory with the refusal
   living in each consumer?
2. `real-source-repos.json` pins 112 repositories chosen before several plugins
   existed. Is the sample still the right question to ask?
