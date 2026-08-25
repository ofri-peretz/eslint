# ILB-Headline — one repo, one job, three stacks

> Time to lint **shadcn-ui** (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`) from scratch with each stack's recommended preset. Median of 5 runs after a discarded warmup.

- **Generated**: 2026-08-25T13:10:19.605Z · **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.19.0

```text
          Interlace (ESLint)  █████████████████████ 1.98s
  Community plugins (ESLint)  ████████████████████████████████████████ 3.73s
             oxlint (native)  ████████████ 1.16s
```

| Stack | Cold (median) | Spread (min–max) | Warm (median) | Findings | Files |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Interlace (ESLint) | 1.98s | 1.96s–2.02s | 1.01s | 702 | 3409 |
| Community plugins (ESLint) | 3.73s | 3.70s–3.81s | 1.14s | 16 | 3409 |
| oxlint (native) | 1.16s | 1.15s–1.17s | 1.16s | 43737 | 3415 |

## How to read this

- **Same file set**: every stack lints the same explicit glob (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`). ESLint-stack parity: **verified** (ours 3409 files, competitor 3409 files).
- **Different rule sets, same job.** Each stack runs its own recommended preset. A stack that runs fewer rules doing less work is not "faster" in a way you can use — read the findings column alongside the time.
- **oxlint is a native binary and will win on wall-clock.** That is the honest result, not a rounding error: it is a different engine class. The number that matters for an ESLint user is the ESLint-to-ESLint comparison.
- **Cold** = `--no-cache`. **Warm** = `--cache` against a primed cache file.
- **Median of 5**, first run discarded as warmup. Spread is shown so a noisy machine is visible rather than hidden.

Reproduce: `npm run ilb:headline -- --repo=shadcn-ui --repeat=5`
