---
slug: the-silence-instrument-is-recorded
opened: 2026-08-30
packages: []
cases: []
---

## What

Make `real-world-rule-inventory.json` say which instrument produced it, and
refuse to be read when that instrument has changed. Then re-run it.

Until this lands, **"110 rules have no evidence" is not a number** — it is a
number-shaped object, and the largest block inside it is known to be an
artifact.

## Why

`scripts/real-source-scan.mts` already documents this exact failure, in its own
header, about this exact plugin:

> `eslint.real-source.config.mjs` was introduced on 2026-08-26 because the
> previous config matched `**/*.js` with no TypeScript parser and never linted
> a single `.tsx` file — and the inventory committed fourteen hours AFTER that
> fix still carried the pre-fix numbers. So `react-a11y` read as "37 rules that
> never fire on real code" when the truth was "37 rules nobody ran": the current
> config produces eight react-a11y findings from a ten-line JSX file.

The header then says the remedy:

> Nothing about the stale file looked stale. Recording the hash is what makes
> that state detectable.

**Correction, 2026-08-31.** The first draft of this intent claimed the hash was
computed and never written. That was wrong, and the way it was wrong is worth
keeping: `writeInventory` gained `configHash` on 2026-08-30 in `74dc9d056`
("the ledger stops printing a number it cannot vouch for"), and
`rule-case-ledger.ts` enforces it. I read the committed artifact, saw no
`configHash`, and concluded the mechanism was missing — when the missing field
IS the mechanism working. The committed inventory was last written 2026-08-26
21:23, four days before the field existed, so its absence is the detector
firing rather than a hole in the detector.

What is actually true, and still worth an intent:

1. **The scan has not been re-run since 2026-08-26.** The react-a11y 37 is
   still the pre-fix number — measured by a config with no TypeScript parser
   that never linted a `.tsx` file. Until it is re-run, 37 of the 110 are known
   to be an artifact and the rest are unverified.
2. **Enforcement is one consumer deep.** `rule-case-ledger.ts` refuses to vouch
   for the number. `check-audit-freshness.ts` and `harvest-cases.mts` read the
   same artifact and do not check, so the same stale numbers still reach a
   freshness receipt and the case harvester unchallenged.
3. **Only the config is hashed, not the repo list.** A scan over a different
   `real-source-repos.json` is a different measurement, and
   `the-corpus-has-the-material` is about to change that file. Without a
   `reposHash` the next inventory will look comparable to this one and will not
   be.

## Constraints

- The hash covers **both** inputs, not just one: the ESLint config AND
  `benchmarks/real-source-repos.json`. A scan of a different repo list is a
  different measurement, and a rule that is silent because the corpus changed is
  not a rule that stopped working.
- The gate **refuses to report** on a mismatch rather than reporting with a
  warning. A stale number that prints is quoted; a number that refuses to print
  is investigated. `check:name-vocabulary` already works this way against the
  probe artifact — follow it.
- Re-running is 113 clones and is **not** a cron job. It stays manual, with the
  reason recorded, exactly as the freshness gate already baselines it.
- No number from this artifact may be quoted anywhere — `AI_SDLC.md`, an
  article, a benchmark receipt — while the hash does not match. Sabotage-verify
  by editing the config and confirming every consumer goes red.

## Done when

- `real-world-rule-inventory.json` records `configHash` and `reposHash`.
- Every consumer of the artifact refuses to report on a mismatch, verified by
  sabotage.
- The scan is re-run against the current config, and the new inventory is
  committed with both hashes.
- The corrected "rules that never fire" figure replaces the current one, and the
  react-a11y block is stated separately — because comparing it to the old number
  is the evidence that the instrument was the problem.

## Progress — 2026-08-31, the reader is shared and the stamp is complete

Items 2 and 3 are done. The scan is not re-run yet — that is 113 clones and
stays a deliberate manual act.

**The check is no longer one consumer deep.** `scripts/lib/real-source-inventory.ts`
is now the single reader, and it answers one question — may this number be
quoted — with the reason attached. `check-audit-freshness.ts` and
`harvest-cases.mts` use it; `rule-case-ledger.ts` already had its own copy of
the logic and keeps working. A fourth consumer gets the check by using the
artifact at all, which is the property that was missing: one file checking is a
habit, not a control.

**`reposHash` closes the other half.** The config decides which rules were
ASKED; `real-source-repos.json` decides what they were asked ABOUT. Only the
first was stamped, so the corpus change `the-corpus-has-the-material` is about
to make would have produced an inventory that looked comparable to this one and
was not.

The visible effect, immediately:

```
before   ✅ Real-source rule inventory: fresh (age 5d, TTL 45d)
after    ❌ Real-source rule inventory: stale (age 5d, TTL 45d)
            — inventory records no configHash — it predates the stamp,
              so which rules it asked is unknown
```

Five days of green on an artifact whose instrument had been replaced. The date
was never the problem, and the gate's own comment said so while checking only
the date.

Sabotage-verified in three directions: stamping the inventory with the current
hashes turns it green; changing the repository list turns it red again naming
`reposHash`; and `harvest-cases` exits 1 rather than seeding registry cases from
a scan nobody can reproduce. Locked by
`scripts/__tests__/real-source-inventory-is-vouched-for.test.ts`, five cases,
including that a missing artifact returns "unknown" instead of throwing — a
gate must be able to say it does not know.

### A guard that expired when the work succeeded

`name-vocabulary-spread.test.ts` asserted `offenders().length > 0` to stop its
real assertion — "this rule is NOT an offender" — from passing vacuously
against an empty list. That was correct until `the-rename-litmus-passes` drove
the offender list to **zero**, at which point the guard failed on exactly the
state it was hoping for.

**A non-vacuity check keyed to the number being fixed expires the moment the fix
lands.** Rewritten to the durable property: the gate INSPECTED a population —
53 rules decide by identifier name, and if that reads 0 the gate is blind and
every compliance claim under it is empty.

Fixing it surfaced a second thing worth keeping. The test then timed out at 5s
under full-suite load, because reading the gate three times means spawning a
whole-suite walk three times. A timeout reads exactly like a logic failure and
is not. Memoised to one spawn, with a timeout that admits the test shells out.
