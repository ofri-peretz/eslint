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

| #   | Stage        | Artifact it owes                                                     | Enforced by                                                        | Number that moves                            |
| --- | ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| 1   | **Plan**     | A `docs/intents/` file — what is wanted, why, under which constraint | `check:intent`                                                     | undeclared packages (must be 0)              |
| 2   | **Design**   | A **case** in `benchmarks/cases/registry.json` that FAILS            | `check:case-registry`, `check:new-rule-cases`                      | verified cases (grow-only)                   |
| 3   | **Build**    | Rule using devkit spellings, not open-coded reads                    | `check:spellings`, `check:key-vocabulary`, `check:name-vocabulary` | spelling debt (shrink-only)                  |
| 4   | **Test**     | A sealed case per fixed FP/FN; ≥3 classified cases a side            | `check:rule-cases`, `check:per-rule-budget`                        | sealed FP+FN (grow), floor breaches (shrink) |
| 5   | **Deploy**   | A changeset naming **every** package whose behaviour changed         | `check-changeset-coverage`                                         | uncovered packages (must be 0)               |
| 6   | **Maintain** | A dated receipt under `benchmark-results/`                           | `check:audit-freshness`                                            | scorecard (grow-only)                        |

### 1 — Plan

The AI-native part of planning is that **intent must survive the session**. A
prompt is not an artifact; the agent that picks the work up next week, and the
human reviewing a 45,000-line diff, have only what is in the repo.

The failure mode this aims at is **drift**. An agent given a broad task starts
on `no-zip-slip`, notices something in `no-ssrf`, and eleven plugins later
nobody can say whether the result is the work that was asked for. A declared
blast radius turns that from a feeling into a diff.

`docs/intents/<date>-<slug>.md` declares `packages:`, `cases:`, and four prose
sections. `check:intent` refuses four things a stub cannot fake:

1. An intent file was **added** on this branch, when the diff changes
   consumer-visible source. Editing an old one is not new intent.
2. **`packages:` is a superset of what the diff touches.** The substantive
   one — work that spreads past its declared radius fails, naming the packages
   nobody declared.
3. Every id in `cases:` **exists** in the registry. Intent that cannot name a
   case it answers is a wish.
4. **No placeholders.** `TODO` in a required field looks satisfied and is not.

The frontmatter parser is hand-written and deliberately strict — neither
`yaml` nor `js-yaml` is a declared dependency here, and a lenient parser that
silently dropped a `packages:` entry would turn the drift check into a no-op
with nothing to show for it.

> This document declared Stage 1 a `(gap)` on 2026-08-30 and the branch it was
> written on had run for five days with no intent file. That omission is what
> produced the directory. `docs/intents/2026-08-26-precision-ratchet.md` is marked as
> a reconstruction rather than backdated, because an intent file that pretends
> to have come first makes the gate look satisfied and teaches nobody anything.

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

#### The hole in this stage, and what closed it

The contract said the case comes first. Nothing enforced it. `check:rule-cases`
requires three RuleTester cases a side — which proves a rule matches some
strings, not that anyone stated what defect it exists to catch — and
`check:case-registry` ratchets the verified set, so it cannot notice a rule
that never had a case at all.

The measurable consequence: **34 of 470 rules carry a registry case**, up from 27 — and all nine
flagship rules now have one, up from two. The stage the whole case-first method
rests on still holds for 7% of the suite; the rules it holds for are now the
ones we lead with.

`check:new-rule-cases` closes it forward. It diffs the generated rule manifest
between the merge base and HEAD — the manifest and not the filesystem, because
a rule directory also holds helpers and a helper is not a rule — and refuses a
newly-exported rule id that no case names in its `coverage[]`. A rename counts
as new, which is exactly when someone should restate what the rule catches.

Ratchet, not retrofit. Writing 443 registry entries is not work anybody
finishes; this asks that rule 471 arrives with one. An absent manifest at the
base reads as "nothing to compare", never as "no rules" — the second would mark
every rule in the suite as new and the gate would be switched off within a day.

### 3 — Build: the reads are primitives, not hand-rolled

The compounding defect in a 470-rule codebase is not a wrong rule, it is the
same read implemented 82 different ways. A probe that asked every rule the same
question found **1,156 sites** where a rule saw `'foo'` but not `` `foo` ``, or
`o.foo` but not `o['foo']`.

`@interlace/eslint-devkit` exports the five spellings — `staticString`,
`propertyName`, `objectKeyName`, `memberPath`, `readsRequestShape` — and
`check:spellings` refuses a **new** open-coded read while holding the existing
841 as frozen debt.

#### The vocabulary gate was nearly blind

`check:name-vocabulary` asks whether a rule that decides from an identifier
NAME lets the consumer replace the vocabulary. It reported **0** — and it chose
which rules to look at by grepping each file for `makeNameTest` or
`identifierWords`. Of the 25 most name-dependent rules in the suite, **three
import those helpers and 22 do not**, so its `0` meant "no rule using the
helpers lacks an option", not "no rule lacks one".

A second static pattern would not have fixed it. It now reads the **rename
probe** instead: `scripts/name-dependence-probe.mts` renames every local
binding to `foo1, foo2, …` and re-runs the suites, so a rule whose verdict
changes decided from a name. That is the litmus in `CASE_PHILOSOPHY.md`,
settled by experiment rather than by pattern.

The probe takes minutes, so it commits `benchmarks/budgets/name-dependence.json`
with the hash of the script that produced it, and the gate refuses to report
when that hash does not match — the lesson from the real-source inventory,
which sat with the right date and the wrong instrument for four days.

First honest reading: **56 rules decide from a name. 24 expose a replaceable
option or cite an authority. 32 do neither**, and are baselined shrink-only.
The gate is a floor, not a certificate — it asks whether a rule exposes SOME
replaceable vocabulary, not one for the vocabulary it actually decided from.
Both limitations are stated in the script header.

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

#### Institutional knowledge drifts too

The gates above check the CODE. Nothing checked whether the documents that
describe how this repo works still describe this repo — and `CLAUDE.md`, which
every agent reads first, had gone badly out of date.

It listed six required checks. **Five of the six names had never existed as job
names**: `Prettier (format check)`, `TypeScript (typecheck)`,
`Vitest (unit + lock tests)`, `Playwright (e2e + a11y)`, `Build (apps/docs)`.
The real jobs are spelled `Typecheck (whole-graph tsgo)`,
`Unit Tests + Coverage (N/10)`, `Build (N/4)`, `axe-core strict scan`. An agent
polling for one of the phantoms waits for something that cannot arrive — the
same failure as the `.state` poll bug, approached from the other side.

Worse, branch protection requires exactly two contexts and the list omitted the
one that blocks: **`Quality (Full) Gate`**, which runs on
`ready_for_review, labeled, synchronize`. A draft PR without the `run-full-ci`
label never receives it, so the PR sits `BLOCKED` with every visible check
green and nothing to click.

`claude-md-contract.test.ts` now asserts that every check the document presents
as required is a real workflow job, that the heavy gate is named and its draft
behaviour explained, and that every lock test, npm script and workflow file it
cites exists. Job names rather than the live branch-protection API, so it runs
offline and never flakes.

### 4 — Test: the gates are the eval suite

There is no separate "eval". CI is it, and it reports what is true today:

```
470 rules
TP 7412   TN 10996   FP 22   FN 33
sealed against real code (FP+FN)          55
open misses, documented not sealed         2
rules under 3 classified cases a side      3
fires on real code                       200   (112 repos, 345,841 files)
real-code inventory                      STALE — see below
```

#### A gate that does not run is not a gate

Three of the gates named in the table above ran **only in the pre-commit
hook** until 2026-08-30: `check:spellings`, `check:key-vocabulary` and
`check:case-registry` — two thirds of Build's enforcement and all of Design's.

A hook is a convenience, not a gate. It is absent in a fresh worktree, absent
for a commit made through the GitHub web UI, and absent for anyone who has not
run `lefthook install`. Those stages were enforced on the machines that
happened to be configured for it, which is not enforcement.

All three now run in the cheap CI job — 0.9s, 0.7s and 7.0s, no build and no
network. `gates-run-in-ci.test.ts` asserts that every gate the stage table
names is run by some workflow, and deliberately does **not** accept a lefthook
entry as coverage: this repo already forbids `--no-verify` precisely because
the hook is skippable, and a gate whose only home is a skippable mechanism is
one skip away from absent.

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

### The uncomfortable number, and why it was not the one we thought

The ledger used to print **"270 of 470 rules scanned and never fired"** and we
read it as a product-quality finding: 57% of our rules never observed catching
anything in 345,841 files of other people's code.

It was an instrument artifact.

Seven whole plugins — `react-a11y`, `react-features`, `conventions`,
`maintainability`, `reliability`, `operability`, `nestjs-security` — fired
**zero** rules between them. The corpus contains MUI, chakra-ui, shadcn/ui,
storybook and react-router, so "react-a11y never fires" was never credible. It
was never run: the scan's old config matched `**/*.js` with no TypeScript
parser, so 214,855 TypeScript files were walked, handed to ESLint, and matched
by no config block.

`eslint.real-source.config.mjs` fixed that on 2026-08-26 at 07:24. The
inventory was committed at 21:23 the same day — **still carrying the pre-fix
numbers**. Under the current config, a ten-line JSX file produces eight
`react-a11y` findings.

Nothing about the stale file looked stale, which is the whole problem. So the
scan now records the **hash of the config it ran with**, and the ledger refuses
to print the silence count when that hash does not match the config on disk:

```
real-code inventory   STALE — produced by a different
                      eslint.real-source.config.mjs, so "never fired"
                      cannot be distinguished from "never ran".
```

A number that cannot be vouched for is not printed as a number. The real
figure is unknown until the scan is re-run, and the ledger now says so instead
of guessing.

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

### What the cadence does not cover

The table above is what runs. It is not the same as what stays fresh.
`check:audit-freshness` gives eleven artifacts a TTL, and **six of them have
nothing that regenerates them at all** — no workflow, scheduled or otherwise:

| Artifact              |  Age | Refresh command           | Scheduled? |
| --------------------- | ---: | ------------------------- | ---------- |
| Peer leaderboard      | 112d | `ilb:leaderboard-publish` | no         |
| CWE coverage report   | 112d | `docs:cwe-coverage`       | no         |
| Federated wild-corpus | 112d | `ilb:federated-aggregate` | no         |
| Stock-corpus overlap  | 108d | `audit:stock-overlap`     | no         |
| Compliance crosswalk  | 112d | `ilb:mappings-report`     | no         |
| ISO 25010 crosswalk   | 112d | `ilb:iso25010-report`     | no         |

The last two report **fresh** — they carry a 180-day TTL, so they are 112 days
into a clock nothing can reset. Counting stale artifacts would have missed them
for another two months; asking "what refreshes this?" found them immediately.

A TTL with no refresher does not produce freshness. It produces a gate that
goes red and stays red, and a permanently red gate is one everybody learns to
scroll past — worse than not tracking the artifact, because the staleness is
now both real and ignored. `freshness-has-a-refresher.test.ts` freezes the six
and fails on a seventh.

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

| #   | Gap                                                                                                   | Cost of leaving it                                                              | Status                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `check-changeset-coverage` checked that _a_ changeset exists, not that it names every changed package | 18 packages nearly shipped unversioned on this branch                           | **Closed.** Compares changed workspaces against the packages added changesets actually name, matching on the _published_ name so scoped packages are not permanently uncovered. Tests under `src/` are excluded — `files` publishes `dist/` only, so a test cannot reach a consumer. Locked by 3 new assertions. |
| 2   | `peer-health` tracked 17 neighbours and none of ours                                                  | No artifact anywhere put the two side by side                                   | **Closed.** Our published plugins are discovered from the workspace, tagged `ours`, and rendered as a head-to-head with a download-to-star table.                                                                                                                                                                |
| 3   | No adoption scan — new repos with us in their lockfile                                                | The North Star is unmeasured                                                    | Open. Point the existing ~28k-repo peer scan at our package names, weekly.                                                                                                                                                                                                                                       |
| 4   | No activation metric                                                                                  | We cannot tell an install from a use                                            | Open. Emit a first-run event, or infer from docs `?from=cli`.                                                                                                                                                                                                                                                    |
| 5   | The real-code inventory was stale, and nothing said so                                                | Seven plugins read as "never fires" when they were never run                    | **Half closed.** The scan records its config hash and the ledger refuses the number when it does not match. Re-running the 112-repo scan to get a true figure is still open.                                                                                                                                     |
| 6   | Stage 1 had no artifact and no gate                                                                   | Intent lived in commit messages, unaddressable and uncheckable against the diff | **Closed.** `docs/intents/` + `check:intent`, with a drift check that fails when work spreads past its declared radius. 12 lock assertions.                                                                                                                                                                      |
| 7   | 14,935 undescribed cases                                                                              | A test that does not state its claim cannot be reviewed                         | Open. Ratchet down, as with spellings — refuse new undescribed cases.                                                                                                                                                                                                                                            |

---

## The standing question

For every change, in every stage:

> **If I revert this, does CI go red?**

If the answer is no, the change is half-done. That applies to a rule fix, a
docs claim, a benchmark number, and a growth metric equally.
