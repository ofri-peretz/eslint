# ILB-Flagship — per-rule head-to-head bench for the 10 flagship rules

Scope: each of the 10 flagship rules ([`.agent/flagship-rules.md`](../../../.agent/flagship-rules.md)) is run against a 45K+ baseline OSS repo (or a documented T2 niche flagship for the 3 sub-45K niches) under three stacks:

1. **Ours via ESLint** — the rule loaded from the published npm plugin.
2. **Competitor via ESLint** — the equivalent rule from the head-to-head plugin (where one exists).
3. **Competitor via oxlint native** — the rule's native Rust implementation in oxlint (where it exists).

Each stack runs **cold** (no cache) and **warm** (cached). The comparison answers two questions:
- Is our rule competitive on findings (precision/recall vs the named competitor)?
- Is our rule competitive on latency, in both the cold dev-server case and the warm pre-commit / save case?

## Layout

```
benchmarks/suites/ilb-flagship/
├── manifest.json              # rule × repo × competitor table
├── workspace/                 # hermetic install of all plugins (ours + competitors)
│   ├── package.json
│   └── configs/               # generated per-rule configs (eslint flat + oxlintrc)
├── run.mjs                    # the runner
├── scorecard.mjs              # JSON → markdown summary
├── .cache/                    # eslint --cache files, one per (rule, stack)
└── README.md                  # you are here
```

Results: `benchmarks/results/ilb-flagship/<date>.json`. Scorecard: `benchmark-results/ilb-flagship-scorecard.md`.

## Reproducibility

```bash
# install the hermetic plugin set (once)
cd benchmarks/suites/ilb-flagship/workspace && npm install

# run the full sweep (~5–10 min on a warm machine)
node benchmarks/suites/ilb-flagship/run.mjs

# render the markdown scorecard
node benchmarks/suites/ilb-flagship/scorecard.mjs
```

Targeted runs:

```bash
# single rule
node benchmarks/suites/ilb-flagship/run.mjs --rule="secure-coding/no-redos-vulnerable-regex"

# pin a different repo for a rule (override manifest)
node benchmarks/suites/ilb-flagship/run.mjs --rule="..." --repo=lodash

# point at a different OOS root
ILB_OOS_DIR=/tmp/oos node benchmarks/suites/ilb-flagship/run.mjs
```

## How a rule earns "minimal-setup" comparability

The OSS repos we lint **never have their `node_modules` modified** by this bench. The runner:
- Generates a flat ESLint config per (rule, stack) under `workspace/configs/`.
- Invokes the workspace's local `eslint` / `oxlint` binary with `--no-config-lookup --config <ours>`.
- Lints the OSS repo's source globs (`packages/`, `src/`, `lib/`, `apps/`, `app/`, `pages/`).
- Skips test/fixture trees, `node_modules`, and build outputs.

Configs live INSIDE the workspace because Node's module resolution walks up from the config file's directory. Configs at `workspace/configs/` resolve `import 'eslint-plugin-X'` to `workspace/node_modules/eslint-plugin-X` (the published build), not the outer monorepo's symlinked TS source.

## Cache semantics

- **ESLint cold** — `--no-cache`. Cache file is deleted before the run if it exists.
- **ESLint warm** — same config, `--cache --cache-location <stable-path>`. The runner runs cold first to populate, then warm.
- **oxlint cold** — first invocation. oxlint has no `--cache` flag; its caching is implicit (file-mtime + content hash, kept in `~/.cache/oxlint/`).
- **oxlint warm** — second consecutive invocation against the same files.

These are single-shot timings. For SLO-grade numbers we want median-of-N — TODO: `--repeat=N` flag.

## Adding a new flagship rule

1. Add an entry to `manifest.json` with `ours`, `competitor` (or `null`), `oxlintNative` (or `null`), `repo`, `starsK`, `tier`.
2. If the repo isn't in `~/repos/ofriperetz.dev/oos/`, clone it there and pin a commit.
3. If a new competitor plugin is needed, add it to `workspace/package.json` and reinstall.
4. Run `node run.mjs --rule=<id>` to validate.

## Known limitations (v1)

1. **Single-shot timings.** No median-of-N. Add `--repeat=N` and Wilson CIs before promoting these numbers to a CI gate.
2. **oxlint native finds 0 on some rules / repos.** Confirmed with manual repro: `react/exhaustive-deps` and `jsx-a11y/alt-text` find 0 on next.js / shadcn-ui under our hermetic config but find 250+ on payload with the same config. The default-category interaction needs more reverse-engineering before the oxlint column is comparable. The `import/no-cycle` and `pg`-style rules are fine.
3. **Findings-delta is timing-side only.** A 40-finding gap between ours and a competitor doesn't tell you who's right — it's a triage-flag, not a verdict. Pair with the relevant ILB-Juliet / Arena precision number when reading the table.
4. **`no-hardcoded-credentials` flags 845 vs competitor's 383 on vercel-ai.** Suspect entropy threshold or variable-name heuristic too permissive. Triage as part of FP-FN tracker before promoting the number.
5. **OSS repos pinned to whatever they're at locally.** No `git fetch` in the runner today. Add `--update-repos` flag before publishing reproducible results.

## Related

- [`.agent/flagship-rules.md`](../../../.agent/flagship-rules.md) — what a flagship rule is and why these 10
- [`.agent/type-awareness-philosophy.md`](../../../.agent/type-awareness-philosophy.md) — the type-unaware policy these benches enforce
- [`benchmarks/BASELINE_MATRIX.md`](../../BASELINE_MATRIX.md) — the 45K+ tiering policy used to pick repos
