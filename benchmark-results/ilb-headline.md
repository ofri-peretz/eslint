# ILB-Headline — one repo, one job, three stacks

> Time to lint **shadcn-ui** (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`) from scratch with each stack's recommended preset. Median of 5 runs after a discarded warmup.

- **Generated**: 2026-08-31T17:03:29.966Z · **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.19.0

```text
          Interlace (ESLint)  ██████████████████████ 2.10s
  Community plugins (ESLint)  ████████████████████████████████████████ 3.90s
             oxlint (native)  ████████████ 1.15s
```

| Stack | Cold (median) | Spread (min–max) | Warm (median) | Findings | Files |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Interlace (ESLint) | 2.10s | 2.08s–2.13s | 1.01s | 702 | 3411 |
| Community plugins (ESLint) | 3.90s | 3.88s–3.92s | 1.12s | 16 | 3411 |
| oxlint (native) | 1.15s | 1.14s–1.19s | 1.14s | 43739 | 3417 |

## How to read this

- **Same file set**: every stack lints the same explicit glob (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`). ESLint-stack parity: **verified** (ours 3411 files, competitor 3411 files).
- **Different rule sets, same job.** Each stack runs its own recommended preset. A stack that runs fewer rules doing less work is not "faster" in a way you can use — read the findings column alongside the time.
- **oxlint is a native binary and will win on wall-clock.** That is the honest result, not a rounding error: it is a different engine class. The number that matters for an ESLint user is the ESLint-to-ESLint comparison.
- **Cold** = `--no-cache`. **Warm** = `--cache` against a primed cache file.
- **Median of 5**, first run discarded as warmup. Spread is shown so a noisy machine is visible rather than hidden.

Reproduce: `npm run ilb:headline -- --repo=shadcn-ui --repeat=5`
