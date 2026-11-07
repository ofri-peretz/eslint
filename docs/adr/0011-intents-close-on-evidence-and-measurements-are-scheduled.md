# ADR 0011 — Intents close on evidence; a number to reach is a scheduled measurement

- **Status:** accepted
- **Date:** 2026-11-07
- **Deciders:** @ofri-peretz

## Context

On 2026-11-07, `docs/intents/` held 23 directory intents that were not
`shipped` or `dropped`, some of them open since August. It also held 21 flat
per-PR records (`docs/intents/20*.md`, the `scripts/check-intent.ts` format)
with no status at all. Many stayed open for one of three reasons:

- The work had shipped, but nobody flipped the status.
- A success criterion was a number to reach ("≤ 60s", "< 25 rules",
  "0 unmeasured"). Such a number drifts, so the intent could never close, even
  after its instrument and its levers had shipped.
- A criterion asked for a new blocking gate.

`ofri-peretz/burgee` closed its roadmap the same way in October 2026. The
audit is `docs/roadmaps/intents-closing-list-2026-11.md`.

## Decision

- **A number to reach is a scheduled measurement, not a roadmap gate.** Such a
  criterion is met when a scheduled workflow measures the number and lands it
  where a control band or a failure issue can see it. The number itself does
  not have to be reached. A regression becomes a breach of that measurement,
  not a reason to keep an intent open.
- **An intent does not add a gate to close itself.** A criterion that only asks
  for a new blocking check is dropped, with that reason recorded in the intent.
  Repairing an existing gate that passes vacuously is not a new gate.
- **Close honestly.** `shipped` carries a dated `## Closed — <date>` section with
  the evidence for each criterion, plus a scoped-down note where the delivery was
  narrower than the wording. `dropped` carries a `## Dropped — <date>` section
  naming what superseded it. A `shipped` intent with no `design.md` gets an
  as-built one, as the intent lock requires.
- **A flat per-PR record carries a status once closed.** It is a
  `**Status:** shipped|dropped · **Closed:** <date>` line directly after the
  frontmatter, plus a `## Closed — <date>` note. The status goes in the body,
  not the frontmatter, because `parseFrontmatter` in `scripts/check-intent.ts`
  is strict on purpose and rejects unknown keys.

## Consequences

- Every intent under `docs/intents/` ends `shipped` or `dropped`. Work that
  remains after a close is either a scheduled measurement or ordinary backlog.
- A drifting number shows up in its scheduled job (control band, failure
  issue) rather than in a list of stale intents nobody reads.
- A record written under `check-intent.ts` starts with no status line, and
  gains one when it closes. `check-intent.ts` itself is unchanged.

## Alternatives considered

**Keep intents open until the number is reached.** Rejected: several numbers
regressed after their lever shipped (CI wall-clock, for one), so the intent
recorded a moving target and never the work.

**Add `status:` to the per-PR record frontmatter.** Rejected: it would change
the hand-written strict parser and its tests for a field that gate never reads.
A body line matches the directory intents' format and needs no code.

**Delete closed intents.** Rejected: `docs/intents/README.md` says a dropped
intent is kept because it is a record.
