# ADR 0002 — Corpus fixtures are cut from other people's code, never authored

- **Status:** accepted
- **Date:** 2026-08-31
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/2026-09-01-every-rule-owes-a-real-code-tp.md`](../intents/2026-09-01-every-rule-owes-a-real-code-tp.md)

## Context

`check-corpus-coverage.ts` published, for months, a figure called INDEPENDENT
that it computed from the DIRECTORY a fixture sat in. Every fixture in those
directories had been written here — 85 by an AI in this project, 48 by the
author of the rules — and the headline said 68 rules had their precision
measured against code their author did not write. The true figure was zero.

The convention "fixtures should come from real code" was already written down
in an intent at the time. It did not help, because the gate measured a path.

The pressure to author fixtures is real and will recur: 145 rules are
currently unmeasured, authored fixtures take minutes each, and sourced ones
take an hour and sometimes fail.

## Decision

A corpus fixture is created ONLY by `scripts/add-sourced-fixture.mts`, which
copies bytes out of a git clone and records `@source <repo>@<sha> <path>:<line>`.
Promoting a rule's own test cases into `benchmarks/corpus/` is prohibited.

Provenance is mechanical, not conventional: the script is the only path in, and
the `@source` header carries a commit SHA so the claim can be checked.

## Consequences

- Coverage grows slowly. 145 unmeasured rules will take a long time, and some
  may never be measurable because no sampled repository contains the shape.
  That is the honest state, and it is reported rather than closed.
- The corpus depends on `real-source-scan.mts` to find material, which makes
  that scan load-bearing infrastructure rather than a nice-to-have. See ADR 0003.
- Any future gate that counts "independent" fixtures must read the `@source`
  header, never the directory. The directory is where this went wrong once.
- Two shipping false positives were found within five sourced fixtures — a 40%
  yield against 0% from 18,547 authored cases. That is the argument for paying
  the cost.
