# ILB-Headline — one repo, one job, three stacks

> Time to lint **shadcn-ui** (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`) from scratch with each stack's recommended preset. Median of 5 runs after a discarded warmup.

- **Generated**: 2026-10-26T17:18:51.703Z · **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.21.0

```text
          Interlace (ESLint)  ████████████████████ 1.23s
  Community plugins (ESLint)  ████████████████████████████████████████ 2.41s
             oxlint (native)  ████████████ 718ms
```

| Stack                      | Cold (median) | Spread (min–max) | Warm (median) | Findings | Files |
| :------------------------- | ------------: | ---------------: | ------------: | -------: | ----: |
| Interlace (ESLint)         |         1.23s |      1.22s–1.27s |         662ms |      704 |  3676 |
| Community plugins (ESLint) |         2.41s |      2.37s–2.44s |         723ms |       19 |  3676 |
| oxlint (native)            |         718ms |      700ms–899ms |         716ms |    46705 |  3682 |

## How to read this

- **Same file set**: every stack lints the same explicit glob (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`). ESLint-stack parity: **verified** (ours 3676 files, competitor 3676 files).
- **Different rule sets, same job.** Each stack runs its own recommended preset. A stack that runs fewer rules doing less work is not "faster" in a way you can use — read the findings column alongside the time.
- **oxlint is a native binary and will win on wall-clock.** That is the honest result, not a rounding error: it is a different engine class. The number that matters for an ESLint user is the ESLint-to-ESLint comparison.
- **Cold** = `--no-cache`. **Warm** = `--cache` against a primed cache file.
- **Median of 5**, first run discarded as warmup. Spread is shown so a noisy machine is visible rather than hidden.

Reproduce: `npm run ilb:headline -- --repo=shadcn-ui --repeat=5`
