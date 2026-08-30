# Design — Infrastructure observability

> Stage 2 artifact. Turns `intent.md` into requirements, a metric catalogue,
> and an implementation plan.

---

## Resolved open questions

| Question                  | Decision                                                                                                | Reason                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install_footprint` scope | devkit + 3 representative plugins (`import-next`, `secure-coding`, `node-security`), on the weekly cron | 31 real installs is minutes of CI per run for a number that moves rarely. These 4 cover the resolver peer, the largest security surface, and the widest rule count. |
| PR surface                | GitHub **job summary** in the existing Build job                                                        | Free, needs no bot token, no PR write permission, no comment noise. A sticky comment costs a token and a permission we do not otherwise need.                       |

## The metric catalogue

Three tiers. Tier 1 is per published artifact, Tier 2 is the infrastructure
layer specifically, Tier 3 is the ecosystem aggregate.

### Tier 1 — Per-package artifact metrics (all 31 publishable packages)

| #   | Metric        | Definition                      | Source                                       | Enforcement                                                 |
| --- | ------------- | ------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| 1   | `unpacked_kb` | Bytes on disk after install     | `npm pack --dry-run --json` → `unpackedSize` | Advisory; warn past ratio. **Exists today.**                |
| 2   | `tarball_kb`  | Gzipped bytes npm transfers     | same call → `size`                           | Advisory; warn past ratio. **New, free.**                   |
| 3   | `file_count`  | Files in the published artifact | same call → `entryCount`                     | Advisory, but a _step change_ is the signal. **New, free.** |
| 4   | `measured`    | Package has a baseline entry    | derived                                      | **Blocking.** A publishable package with no baseline fails. |

Metric 3 earns its place from history: source maps, `AGENTS.md`, and JSDoc each
shipped for months unnoticed. Every one of those is a file-count or
byte-per-file anomaly, not a total-size anomaly — a package can gain 40 junk
files without tripping a size ratio.

Metric 4 is the only blocking one. It does not judge a number; it fails when the
instrument has a hole. That distinction is what keeps the advisory policy honest
— "advisory" must not decay into "unmeasured".

### Tier 2 — Infrastructure-layer metrics (`@interlace/eslint-devkit`)

The layer's cost is what it forces on a consumer. Four metrics, in descending
order of how much money they would have saved historically.

| #   | Metric              | Definition                                                                                                         | Why it exists                                                                                                                                                              |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | `mandatory_peer_mb` | Installed MB a consumer **must** add because devkit requires it — non-optional peers, transitively                 | The 24 MB `typescript` peer. This is that incident expressed as a number. A regression that makes `@typescript-eslint/utils` non-optional again moves this from ~0 to ~24. |
| 6   | `barrel_load_kb`    | Bytes actually evaluated by `require('@interlace/eslint-devkit')` — sum of the module graph reached at import time | Catches the opposite of lazy loading. `oxc-resolver` is lazy inside `./resolver` today; nothing asserts it stays lazy.                                                     |
| 7   | `api_surface`       | Count of exported symbols from the barrel                                                                          | Coupling growth. 30 packages import this; every new export is 30 packages' worth of surface that can never be removed without a major.                                     |
| 8   | `devkit_share`      | For each plugin: devkit-attributable KB ÷ that plugin's `unpacked_kb`                                              | Answers "how much of a plugin _is_ infrastructure". A rising share across the board means the layer is absorbing work that belongs in plugins.                             |

Metrics 5 and 6 are the load-bearing pair. Both are _consumer-facing_ costs that
today are argued about in code comments and defended by prose, not measured.

### Tier 3 — Ecosystem aggregate

| #   | Metric                  | Definition                                    | Enforcement                                                   |
| --- | ----------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| 9   | `ecosystem_unpacked_mb` | Σ `unpacked_kb` across all published packages | Advisory, reported per release                                |
| 10  | `measured_ratio`        | measured ÷ publishable                        | **Blocking at 100%** — same rule as metric 4, stated globally |

## Requirements

**R1** — `check-artifact-size.ts` records `tarball_kb` and `file_count` beside
`unpacked_kb`, from the `npm pack` call it already makes. No new subprocess.

**R2** — The baseline schema becomes per-package objects rather than a bare
number, with a documented migration of the existing 27 entries.

**R3** — A publishable package absent from the baseline is a **failure**, not a
silent UNMEASURED. Unbuilt-in-this-tree stays UNMEASURED (that distinction is
load-bearing and already documented in the script).

**R4** — The report runs in the existing Build job on PRs and writes a GitHub job
summary. It adds no job and no build. It never fails the PR on a size number.

**R5** — Tier 2 metrics ship as a `devkit-infra-metrics` script with a committed
baseline and lock tests. `mandatory_peer_mb` and `barrel_load_kb` get tests that
fail on regression — these are gates, because both encode incidents we have
already paid for once.

**R6** — Every metric has a lock test asserting it is still collected. A metric
that silently stops being emitted is the failure mode this whole intent exists
to prevent.

## Implementation plan

| Step | Change                                                                                          | Risk                                                                    |
| ---- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Extend `collect()` to read `size` + `entryCount`; widen baseline schema; migrate the 27 entries | Low — same subprocess, additive fields                                  |
| 2    | Refresh baseline so all 31 packages are covered                                                 | Low, requires a full build                                              |
| 3    | Flip missing-from-baseline to blocking; keep unbuilt advisory                                   | Medium — must not break the release flow                                |
| 4    | Emit `$GITHUB_STEP_SUMMARY` when set; wire into the Build job                                   | Low                                                                     |
| 5    | New `scripts/devkit-infra-metrics.ts` for Tier 2 + baseline                                     | Medium — `barrel_load_kb` needs a child process with a module-load hook |
| 6    | Lock tests for every metric                                                                     | Low                                                                     |
| 7    | Weekly cron for `install_footprint` on the 4 representatives                                    | Low                                                                     |

Steps 1–4 are one coherent change to an existing script. Steps 5–7 are the new
infrastructure-layer surface and can land second without blocking 1–4.

## Rejected alternatives

- **`size-limit` / `bundlewatch`.** Both are bundler-oriented and assume a
  browser entry point. They would add a dependency and a config format to own,
  for numbers `npm pack` already returns.
- **Hard size caps per package.** Explicitly rejected by the existing script's
  reasoning, and the reasoning is right.
- **Failing the PR on growth.** Growth is legitimate; rules get added. The signal
  is the point, not the gate.
