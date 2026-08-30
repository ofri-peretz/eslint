# Intent — Infrastructure observability: bundle size and infra-layer metrics

> Stage 1 artifact of the AI-native SDLC. What is wanted, why, and the
> constraints. Design lives in `design.md` beside this file.

**Status:** shipped (tier 1 + tier 2) · **Opened:** 2026-08-30 · **Owner:** @ofri-peretz

---

## What is wanted

Two things, one theme — _make the cost of this ecosystem visible where the
decision is actually made._

1. **Bundle size becomes a pull-request signal**, not a release-time footnote.
2. **The infrastructure layer gets metrics that describe it as infrastructure** —
   the cost `@interlace/eslint-devkit` imposes on the 30 packages that depend on
   it, not just the size of its own tarball.

## Why now

### The existing check cannot do its stated job

`scripts/check-artifact-size.ts` opens with its own purpose:

> "The point is that growth becomes a _noticed decision_ instead of a surprise
> discovered months later on npm."

It cannot achieve that as wired. It runs in exactly one place —
`.github/workflows/release.yml`, stage 2 — under `continue-on-error: true`.
By the time it prints, the version is cut and the decision is already made.
A PR that doubles a package never sees it.

This is not a criticism of the advisory _policy_, which is right (see
Constraints). It is a placement problem: the right report at the wrong point in
the cycle.

### Four packages ship unmeasured

`.agent/artifact-size-baseline.json` was generated 2026-08-04 and covers 27
packages. There are 31 publishable packages. Absent:

- `eslint-plugin-anthropic-security`
- `eslint-plugin-gemini-security`
- `eslint-plugin-mcp-sdk-security`
- `eslint-plugin-openai-security`

The script reports an unbuilt package as UNMEASURED rather than removed —
deliberately, and correctly. But nothing fails when a _published_ package stays
unmeasured indefinitely, so the newest four have no size history at all.

### The infrastructure layer is measured as a leaf, not as infrastructure

devkit's baseline entry is `369` KB unpacked. That number describes devkit as a
tarball. It says nothing about devkit as infrastructure:

- It is imported at ~1,100 sites across 30 packages. A regression inside it
  multiplies by 30; a regression inside a plugin does not.
- Its single largest historical win — making `@typescript-eslint/utils` an
  optional peer, which removed a non-optional 24 MB `typescript` peer from every
  install of every plugin — is invisible to every metric we have. It was found
  by reasoning and defended with a parity test. Nothing would have _caught_ it,
  and nothing would catch its regression today.
- `oxc-resolver` is a devkit peer needed only by `src/resolver/` (18% of the
  package, one consumer: import-next). It is lazily loaded today. Nothing
  measures whether that stays true.

The pattern: our expensive infrastructure decisions are about **what a consumer
is forced to install and load**, and we measure none of it.

## Constraints

1. **Advisory-by-default survives.** The existing docstring is right: a hard cap
   "would just get raised on every release until it meant nothing." New signals
   report and annotate; they do not gate a release. The one exception is
   _coverage of the metric itself_ — a published package having no measurement
   may fail, because that is a hole in the instrument, not a judgement about a
   number.
2. **No new PR-CI job.** Per the repo's own working agreement, probe-shaped
   checks belong on a schedule, not in the PR path, and Actions minutes are
   watched. Size measurement must ride inside a job that already builds the
   packages, and must not add a build.
3. **100% coverage gate applies.** Any new script ships with tests; the repo
   enforces 100% statements/branches/functions/lines.
4. **No new runtime dependency.** `npm pack --dry-run --json` already returns
   `size` and `entryCount` next to the `unpackedSize` we read today. Adding
   metrics must not add tooling (`size-limit`, `bundlewatch`) we then own.
5. **Locks, per CLAUDE.md.** Every metric added is a metric that can silently
   stop being collected. Each one gets a test that fails if it disappears.

## Explicit non-goals

- Tree-shaking analysis or per-rule bundle attribution. ESLint plugins are
  required whole by the config loader; per-rule bytes are not a cost a user pays.
- Browser bundle metrics. These are Node-side lint packages.
- Replacing `check-artifact-size.ts`. It is well-reasoned and its failure modes
  are documented from real incidents. This extends it.
- Moving `src/resolver/` out of devkit. Considered and rejected this session:
  the packaging harm is already mitigated by lazy loading, leaving only a
  cohesion argument that does not justify the blast radius.

## How we will know it worked

- A PR that grows a package by more than the warn ratio says so, on the PR,
  before merge.
- `publishable packages == measured packages`, enforced.
- A change that re-introduces a mandatory heavy peer on devkit fails a test.
- Every metric below has a committed baseline and a lock test.

## Open questions — resolved in `design.md`

- `install_footprint` scope → devkit plus 3 representatives, on the weekly cron.
  31 real installs is minutes of CI for a number that moves rarely. **Deferred:
  not built in this change.**
- PR-time surface → GitHub job summary. No bot token, no PR-write permission,
  no comment noise.

## Stage 6 — Maintain: what closes the loop

Measured at ship (2026-08-30, `origin/main` f6eb8d321):

| Metric                            | Value                  |
| --------------------------------- | ---------------------- |
| publishable packages measured     | 31 / 31 (was 27 / 31)  |
| ecosystem unpacked                | 3 493 kB               |
| devkit unpacked / tarball / files | 378 kB / 100 kB / 101  |
| devkit mandatory peers            | `eslint` only          |
| devkit barrel externals at import | none                   |
| devkit barrel own load            | 180 kB across 45 files |
| devkit barrel exports             | 234                    |

**Control breaches become new intents.** Two surfaced while building this and
are logged rather than silently fixed:

1. `scripts/__tests__/lazy-rules-artifact.test.ts` parses a child process's
   `console.log` with `Number()`. In any shell with `FORCE_COLOR=1` Node wraps
   that output in ANSI codes even when piped, and the count becomes `NaN` —
   the lock fails for a reason unrelated to what it locks.
   `devkit-infra-metrics.ts` pins `FORCE_COLOR=0`/`NO_COLOR=1` for exactly this
   reason; the older test still does not.
2. `barrelExports` is 234. That is a large surface for a package 30 others
   depend on, and nothing currently argues it down — the metric only ratchets
   on growth. Worth its own intent about what belongs in the barrel.

**Deferred from this change:** `install_footprint` (metric 4 in design.md) and
`devkit_share` (metric 8). Both need a weekly cron rather than the PR path.
