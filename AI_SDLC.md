# AI-native SDLC — the delivery contract for this repo

> Read [CLAUDE.md](./CLAUDE.md) for behaviour and [AGENTS.md](./AGENTS.md) for
> the release flow. This file is the layer above both: it says which artifact
> each stage of work owes, **which gate refuses to advance without it**, and
> which number moves as a result.

---

## Why this document exists

The quality bar is not new. It is spread across
[`distribution/EVALUATION_METRICS.md`](./distribution/EVALUATION_METRICS.md)
(50+ metrics, 12 categories, a weighted scorecard),
[`CASE_PHILOSOPHY.md`](./CASE_PHILOSOPHY.md),
[`BENCHMARK-CRITERIA.md`](./BENCHMARK-CRITERIA.md) and nine ratchet baselines
under `benchmarks/budgets/`. What was missing is the binding: **a bar that
lives in prose is skipped by whoever is in a hurry**, and in this repo that is
increasingly an agent working unattended at 2am against a task description.

So every claim below names the command that fails when the claim stops being
true. If a row has no command, it is marked `(gap)` and it is work, not policy.

Two questions this answers:

1. **What makes our plugins a great product**, expressed as numbers that can
   only move one way.
2. **How we measure our ability to acquire users** with the same rigour we
   apply to precision — because a rule nobody installs has a precision of
   nothing.

---

## The six stages

| #   | Stage        | Artifact it owes                                             | Enforced by                                                      | Number that moves                            |
| --- | ------------ | ------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------- |
| 1   | **Plan**     | `intent` — what is wanted, why, under which constraint       | `(gap)`                                                          | —                                            |
| 2   | **Design**   | A **case** in `benchmarks/cases/registry.json` that FAILS    | `check:case-registry`                                            | verified cases (grow-only)                   |
| 3   | **Build**    | Rule using devkit spellings, not open-coded reads            | `check:spellings`, `check:key-vocabulary`, `lint:name-inference` | spelling debt (shrink-only)                  |
| 4   | **Test**     | A sealed case per fixed FP/FN; ≥3 classified cases a side    | `check:rule-cases`, `check:per-rule-budget`                      | sealed FP+FN (grow), floor breaches (shrink) |
| 5   | **Deploy**   | A changeset naming **every** package whose behaviour changed | `check-changeset-coverage`                                       | uncovered packages (must be 0)               |
| 6   | **Maintain** | A dated receipt under `benchmark-results/`                   | `check:audit-freshness`                                          | scorecard (grow-only)                        |

### 1 — Plan

The AI-native part of planning is that **intent must survive the session**. A
prompt is not an artifact; the agent that picks the work up next week has only
what is in the repo.

Today the "why" of a rule change lives in its commit message, which is not
addressable and not checkable. What is owed is a short, version-controlled
statement — what is wanted, why, what it must not break, and which case id it
answers.

`(gap)` — no `check:intent` exists. See [What is missing](#what-is-missing).

### 2 — Design: the case comes before the code

This is the stage the repo already does best, and it is the AI-native
replacement for a design doc: **an executable claim**.

`benchmarks/cases/registry.json` holds each case under a permanent `ILB-nnnn`
id, modelled on CVE/CWE practice — a title, a rationale, a CWE, a severity with
its source, references, occurrences, the code, and a `kind`:

- **`defect`** — must fire.
- **`decoy`** — looks like the defect, must stay quiet.
- **`remedy`** — the fixed form, must stay quiet.

**A case that cannot fail is not a case.** The registry entry is written and
verified failing _before_ `create()` is written. ILB-0004 had to be rewritten
after exactly this: sabotaging the fix left the gate green, because the case
had been seeded with a locally-constructed array that an older path already
cleared.

`check:case-registry` ratchets the verified **set** by id — not the count — so
a case cannot be quietly swapped for an easier one.

### 3 — Build: the reads are primitives, not hand-rolled

The compounding defect in a 470-rule codebase is not a wrong rule, it is the
same read implemented 82 different ways. A probe that asked every rule the same
question found **1,156 sites** where a rule saw `'foo'` but not `` `foo` ``, or
`o.foo` but not `o['foo']`.

`@interlace/eslint-devkit` exports the five spellings — `staticString`,
`propertyName`, `objectKeyName`, `memberPath`, `readsRequestShape` — and
`check:spellings` refuses a **new** open-coded read while holding the existing
843 as frozen debt.

Two rules bind what a rule is allowed to know:

- **AST-structural only.** The litmus: rename every binding to `foo1, foo2, …`
  — does the rule still fire? A rule that fails the litmus is deciding from a
  name.
- **A name is allowed only when it is somebody else's published contract.**
  `sk_live_`, `AKIA`, `req.query`, `dangerouslySetInnerHTML` are contracts —
  cite the authority in a `@vocabulary` comment. A guess at what the _consumer_
  calls their variable is an **option**, and replacing the default must be
  possible. `check:key-vocabulary` and `check:name-vocabulary` both sit at
  **0** — that debt is fully paid, and the gates exist to keep it there.

### 4 — Test: the gates are the eval suite

There is no separate "eval". CI is it, and it reports what is true today:

```
470 rules
TP 7412   TN 10996   FP 22   FN 33
sealed against real code (FP+FN)          55
open misses, documented not sealed         2
rules under 3 classified cases a side      3
fires on real code                       200   (112 repos, 345,841 files)
scanned and never fired                  270
```

`FP 22 / FN 33` are **not** open bugs. They are _sealed_ — every one is a
false positive or a miss we found on real code, fixed, and pinned with a case
that fails on the unfixed rule. The count going **up** is the system working.
The number to worry about is the third one: open misses, documented and not yet
sealed. It is 2.

### 5 — Deploy: the changeset is part of the change

A behaviour change with no changeset does not get a version bump and does not
get a changelog entry — it reaches npm folded silently into whatever unrelated
release comes next.

`check-changeset-coverage` used to assert that _a_ changeset exists, not that
it names every affected package. That is how this branch reached CI with **20
packages** carrying consumer-visible source changes and **2** of them declared,
and a green check.

It now compares the changed workspaces against the packages the added
changesets actually name, and reports `partial` for the difference. Two
subtleties are locked by tests, because both would make it lie:

- It matches on the **published name**, not the directory. `packages/devkit`
  publishes as `@interlace/devkit`; a directory comparison marks every scoped
  package uncovered forever.
- Tests under `src/` are **not** consumer-visible. The prose always said so;
  the pattern did not, and the moment the gate started naming packages it
  accused ten plugins whose only change was a new test case.

### 6 — Maintain: every number is a ratchet

Nine baselines under `benchmarks/budgets/` are the memory of what we have
already paid for:

| Baseline                        |          Today | Direction   |
| ------------------------------- | -------------: | ----------- |
| `case-registry-baseline.json`   |   115 verified | grow-only   |
| `rule-spelling-baseline.json`   |      843 sites | shrink-only |
| `corpus-coverage-baseline.json` | 147 unmeasured | shrink-only |
| `rule-case-floor-baseline.json` |        4 rules | shrink-only |
| `rule-case-baseline.json`       |        2 rules | shrink-only |
| `key-vocabulary-baseline.json`  |        0 sites | shrink-only |
| `name-vocabulary-baseline.json` |        0 rules | shrink-only |
| `per-rule-p95.json`             |    per-rule ms | shrink-only |

**Ratchet, don't remediate.** When a probe found 1,113 sites, the answer was
not to fix 1,113 sites — it was to refuse rule 1,114 and let the debt drain
opportunistically. This is the only strategy that survives a codebase growing
toward 700 rules.

---

## What makes a plugin a great product

Five properties. Each has a number and the command that defends it.

### 1. It is right

Precision before recall, always. A false positive is spent on every single
build a consumer runs; a miss costs one finding.

| Claim                     | Measure                         | Where                   |
| ------------------------- | ------------------------------- | ----------------------- |
| Rules do not over-report  | FP/kLoC on real source          | `check:corpus-coverage` |
| Rules do not under-report | F1 / MCC vs corpus ground truth | `ilb:scorecard`         |
| Every fix stays fixed     | 55 sealed FP+FN cases           | `check:rule-cases`      |

### 2. It is structural

A rule that fires because a variable is spelled `password` is a dictionary, not
an analysis. **2,046 of 2,380** renamed bindings leave rule behaviour unchanged
(85%); the remaining 334 across 57 rules are the work queue.

Every name a rule still reads must be justified as an external contract or
turned into a replaceable option. Both vocabulary gates sit at 0.

### 3. It is accountable

Every rule carries **≥3 classified cases a side** — three that must fire, three
that must not. 3 rules are below the floor; that number only goes down.

Nothing is asserted that was not executed. When a case says a peer plugin is
silent on its own documented example, that was run. When a case says our rule
catches what a peer misses, both were run, and the peer got a positive control
first so we never score a broken installation as a win.

### 4. It is portable

Rules are portable; runtimes are commodity. ESLint + Oxlint parity is checked
per rule (`audit:portability`), because the moat is that a rule outlives the
engine that runs it.

### 5. It is legible — to a human and to an agent

Every option appears in its rule's Options table
(`documented-options-exist`). Every message names the CWE, the CVSS, and the
fix. This is not decoration: an LLM reading a lint message is now a primary
consumer, and a message that says "unsafe usage" gives it nothing to act on.

### The uncomfortable number

**270 of 470 rules were scanned across 345,841 files in 112 repositories and
never fired once.** Some are correct — a rare defect is still worth catching.
Some are dead. We do not currently know which, and **13 rules** have any case
drawn from real code at all.

That is the highest-value open question about product quality in this repo, and
it is deliberately printed by `check:rule-cases` on every run rather than
buried.

---

## How we measure acquisition

The product side is instrumented to 50+ metrics. The acquisition side is
mostly `(gap)` — it is measured as _health signals_ (§9 of EVALUATION_METRICS:
downloads, stars, release cadence) rather than as a funnel with conversion
between stages. Health signals tell you whether a project looks alive. They do
not tell you where a prospective user stopped.

### The North Star

> **Weekly count of new repositories with an Interlace plugin in their
> lockfile.**

Not downloads. Downloads are dominated by CI re-runs of existing adopters and
go up when nothing has happened. A new repository in a lockfile is a number
that only moves when a human chose us.

The scan already exists in a form — the outreach database enumerates ~28,000
repositories running peer plugins, which is simultaneously our addressable
market and the denominator. `(gap)` — it does not yet count _our_ plugins on a
schedule.

### The funnel

| Stage          | Question                 | Metric                                | Source               | Status                              |
| -------------- | ------------------------ | ------------------------------------- | -------------------- | ----------------------------------- |
| **Reach**      | Did anyone see it?       | Article views, impressions            | Dev.to API, PostHog  | instrumented                        |
| **Landing**    | Did they arrive?         | Docs sessions, entry page             | PostHog (`428927`)   | instrumented                        |
| **Evaluation** | Did they look at a rule? | Discover → Configure conversion       | PostHog funnel       | partial — copy-button event missing |
| **Install**    | Did they install?        | Weekly downloads, first-seen packages | npm, Supabase impact | instrumented                        |
| **Activation** | Did it lint anything?    | **Time to first finding**             | —                    | `(gap)`                             |
| **Adoption**   | Is it in their lockfile? | New repos/week, total adopting repos  | outreach DB scan     | `(gap)` for our own plugins         |
| **Retention**  | Did they stay current?   | Share of adopters on latest major     | outreach DB          | `(gap)`                             |
| **Advocacy**   | Did they say so?         | Download→star ratio                   | peer-health          | instrumented                        |

### The four numbers to run the business on

Everything above is diagnostic. These four are the dashboard:

1. **New adopting repos / week** — the North Star. Growth.
2. **Download→star ratio** — silent adoption vs visible endorsement. This is
   already the headline growth metric and it is the honest measure of whether
   people _like_ us or merely _have_ us.
3. **Discover→Configure conversion** — the only number that tells us whether
   the docs are doing their job, and the cheapest to move.
4. **Share of adopters on the latest major** — the retention proxy. Of the 20
   organically-verified adopters, all but one are 1–2 majors behind. That is
   both a warning and the warmest upgrade list we own.

### The collection cadence

A number nobody collects on a schedule is an anecdote. Eighteen workflows
already run on cron; these are the ones that produce the comparison, and every
one commits a **dated artifact** to the repo so drift is visible in review
rather than in someone's memory.

| Cadence     | Workflow             | Produces                            | Ours | Theirs |
| ----------- | -------------------- | ----------------------------------- | ---- | ------ |
| Mon 06:00   | `weekly-corpus-scan` | findings on 112 real repos          | ✅   | —      |
| Mon 08:00   | `peer-health`        | downloads, stars, cadence, TTFR     | ✅   | ✅     |
| Mon 09:00   | `weekly-benchmark`   | head-to-head rule scores            | ✅   | ✅     |
| Mon 09:00   | `metrics-freshness`  | staleness alarm on all of the above | ✅   | ✅     |
| Tue 09:00   | `benchmark`          | ILB corpus F1 / precision           | ✅   | ✅     |
| Daily 08:15 | `cve-latency`        | CVE-disclosure → rule latency       | ✅   | —      |
| Daily 08:45 | `codecov`            | coverage                            | ✅   | —      |
| Sun 10:00   | `oxlint-parity`      | engine portability                  | ✅   | —      |
| Monthly     | `resource-profile`   | memory, cold start                  | ✅   | ✅     |

`peer-health` was the hole. It ran every Monday for eighteen months across
seventeen neighbours and **none of our own packages** — so it could say how
everyone else was doing and nothing about us, and no artifact anywhere put the
two beside each other. It now discovers our published plugins from the
workspace (so the list cannot drift), tags each row `ours` or `peer`, and
renders a head-to-head. First run:

| Category | Ours / week | Leader                      | Theirs / week | Share |
| -------- | ----------: | --------------------------- | ------------: | ----: |
| security |      17,230 | `eslint-plugin-security`    |     4,220,475 | 0.41% |
| general  |       7,054 | `eslint-plugin-n`           |     8,603,925 | 0.08% |
| imports  |       3,235 | `eslint-plugin-import`      |    60,541,256 | 0.01% |
| react    |       2,990 | `eslint-plugin-react-hooks` |    97,021,523 | 0.00% |

Security is where we are least far behind, which matches where we specialise.

Download-to-star, the growth headline — **1,695** downloads per star across the
family, against 8,289 for `@typescript-eslint/eslint-plugin` and 10,192 for
`eslint-plugin-import`. Read it carefully: a _lower_ number means more of the
people using it chose to say so, which is the reading we want, but ours rests
on **18 stars**, so it is one good week away from moving 30%. It is a real
signal at this size, not a reliable one.

### Why acquisition belongs in the SDLC and not in a growth doc

Because it is the same discipline. A funnel stage with no instrumentation is a
`(gap)` marker exactly like a metric row with no bench, and the repo already
has an invariant for that: **no `(gap)` markers survive** — write the
measurement first, wire the npm script, then fill the row. Adding a claim
without a measurement is a documentation regression.

---

## What is missing

Honest list, ranked. These are the `(gap)` rows above.

| #   | Gap                                                                                                   | Cost of leaving it                                      | Status                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `check-changeset-coverage` checked that _a_ changeset exists, not that it names every changed package | 18 packages nearly shipped unversioned on this branch   | **Closed.** Compares changed workspaces against the packages added changesets actually name, matching on the _published_ name so scoped packages are not permanently uncovered. Tests under `src/` are excluded — `files` publishes `dist/` only, so a test cannot reach a consumer. Locked by 3 new assertions. |
| 2   | `peer-health` tracked 17 neighbours and none of ours                                                  | No artifact anywhere put the two side by side           | **Closed.** Our published plugins are discovered from the workspace, tagged `ours`, and rendered as a head-to-head with a download-to-star table.                                                                                                                                                                |
| 3   | No adoption scan — new repos with us in their lockfile                                                | The North Star is unmeasured                            | Open. Point the existing ~28k-repo peer scan at our package names, weekly.                                                                                                                                                                                                                                       |
| 4   | No activation metric                                                                                  | We cannot tell an install from a use                    | Open. Emit a first-run event, or infer from docs `?from=cli`.                                                                                                                                                                                                                                                    |
| 5   | 270 rules never observed firing                                                                       | We cannot distinguish a rare rule from a dead one       | Open. Widen the real-source corpus; require a `@source` case for flagship rules.                                                                                                                                                                                                                                 |
| 6   | No `check:intent`                                                                                     | Stage 1 has no artifact                                 | Open. A short `intent` file per initiative, referenced by case id.                                                                                                                                                                                                                                               |
| 7   | 14,935 undescribed cases                                                                              | A test that does not state its claim cannot be reviewed | Open. Ratchet down, as with spellings — refuse new undescribed cases.                                                                                                                                                                                                                                            |

---

## The standing question

For every change, in every stage:

> **If I revert this, does CI go red?**

If the answer is no, the change is half-done. That applies to a rule fix, a
docs claim, a benchmark number, and a growth metric equally.
