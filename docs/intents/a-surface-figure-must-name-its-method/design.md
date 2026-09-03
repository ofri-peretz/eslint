# Design — a `command` field, and a lock that requires it

> Stage 2 artifact. Accepts [intent.md](./intent.md).

**Status:** shipped · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## Requirements

1. Every JSON artefact under `.agent/` and `benchmarks/budgets/` states the
   command that regenerates it.
2. The command is runnable by a reader, not a scheduled pipeline.
3. A new artefact without one fails a gate.
4. Hand-maintained artefacts are allowed — but must say so explicitly, rather
   than being silent and read as measured.

## Design

One field:

```json
{ "command": "npx tsx scripts/find-computed-key-blind-spots.mts" }
```

or, for a file no command produces:

```json
{
  "command": null,
  "maintainedBy": "hand — <who decides, and on what evidence>"
}
```

`null` is deliberately not the same as absent. Absent means nobody thought
about it, which is how `.agent/api-surface-manifest.json` came to hold ten
typed percentages that read as measurements for months. `null` plus
`maintainedBy` is a claim a reviewer can disagree with.

A lock test at `scripts/__tests__/artefacts-name-their-method.lock.test.ts`
walks both directories, parses every `.json` whose top level is an object, and
fails on any that has neither.

## Verification

1. **27 of 27** artefacts annotated before the lock was written, so it started
   green rather than with an exemption list. 25 had nothing at all; 2 had a
   command buried in prose inside `note`.
2. Both failure modes proven:
   - a new artefact with no `command` → fails, naming the file
   - `command: null` with no `maintainedBy` → fails, saying why that is not
     the same as an owner
3. The commands are not decoration. Every one was resolved against
   `package.json` scripts and the filesystem: **22 resolve** to a real script,
   **5 are `null`** with a named owner, **0 broken**.

## A generated artefact needs its GENERATOR to emit the field

The gate caught this within minutes of being written, on the commit that
introduced it. `.agent/oxlint-jsplugins-manifest.json` is written by
`scripts/generate-oxlint-shims.ts`, so the hand-added `command` was dropped the
next time the shim check ran and `shim-drift` blocked the commit.

The fix is one line in the generator, and it is now demonstrated there:

```ts
const manifestBase = {
  command: 'npm run oxlint:shims',
  generatedBy: '…',
```

Regenerated, and the field survives.

**Sixteen scripts write artefacts under these two directories, and fifteen have
not been patched.** That is deliberate rather than forgotten. Patching fifteen
generators unattended, each with a different output shape, risks more than it
buys; and the failure mode is benign and self-correcting: the next person to
regenerate one of them gets a lock failure naming the file, with a worked
one-line example already in the tree. That is the same pressure the
description ratchet applies — the debt is paid by whoever is already in the
file, not by a campaign.

## Rejected alternatives

**A regex over prose in intents and READMEs.** Rejected in the intent and again
here: prose is prose, and a linter demanding a code fence beside every digit
produces noise that gets suppressed, taking the real signal with it. Machine
artefacts are where the rule is enforceable and where the damage has been.

**An exemption list for the hand-maintained files.** Rejected: an exemption
list is a second place to record "this one is different", and it drifts from
the file it exempts. `command: null` puts the admission in the artefact itself,
where anyone reading the number sees it.

**Deriving the command from the filename.** Tempting — `corpus-coverage-baseline.json`
looks like `check-corpus-coverage.ts --update`. Rejected because it is a guess
that would be right often enough to be trusted and wrong quietly: three of the
27 are produced by scripts whose names do not match, and one is produced by a
workflow rather than a script at all.

## Out of scope

Retrofitting figures already published in intents, PR bodies and rule docs. The
debt is real — this quarter found five wrong ones — but it is prose, and the
gate deliberately does not reach it. Stopping the next machine artefact from
being unattributable is the whole of this change.
