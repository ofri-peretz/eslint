# ILB-Headline — one repo, one job, three stacks

> Time to lint **shadcn-ui** (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`) from scratch with each stack's recommended preset. Median of 5 runs after a discarded warmup.

- **Generated**: 2026-09-28T18:40:13.149Z · **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.21.0

```text
          Interlace (ESLint)  █████████████████████ 1.52s
  Community plugins (ESLint)  ████████████████████████████████████████ 2.96s
             oxlint (native)  ████████████ 898ms
```

| Stack                      | Cold (median) | Spread (min–max) | Warm (median) | Findings | Files |
| :------------------------- | ------------: | ---------------: | ------------: | -------: | ----: |
| Interlace (ESLint)         |         1.52s |      1.50s–1.53s |         775ms |      700 |  3411 |
| Community plugins (ESLint) |         2.96s |      2.94s–2.97s |         859ms |       18 |  3411 |
| oxlint (native)            |         898ms |      885ms–927ms |         902ms |    43739 |  3417 |

## How to read this

- **Same file set**: every stack lints the same explicit glob (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`). ESLint-stack parity: **verified** (ours 3411 files, competitor 3411 files).
- **Different rule sets, same job.** Each stack runs its own recommended preset. A stack that runs fewer rules doing less work is not "faster" in a way you can use — read the findings column alongside the time.
- **oxlint is a native binary and will win on wall-clock.** That is the honest result, not a rounding error: it is a different engine class. The number that matters for an ESLint user is the ESLint-to-ESLint comparison.
- **Cold** = `--no-cache`. **Warm** = `--cache` against a primed cache file.
- **Median of 5**, first run discarded as warmup. Spread is shown so a noisy machine is visible rather than hidden.

Reproduce: `npm run ilb:headline -- --repo=shadcn-ui --repeat=5`
