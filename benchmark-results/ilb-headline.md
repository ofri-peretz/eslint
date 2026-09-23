# ILB-Headline — one repo, one job, three stacks

> Time to lint **shadcn-ui** (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`) from scratch with each stack's recommended preset. Median of 5 runs after a discarded warmup.

- **Generated**: 2026-09-21T17:01:38.294Z · **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.20.0

```text
          Interlace (ESLint)  █████████████████████ 1.51s
  Community plugins (ESLint)  ████████████████████████████████████████ 2.81s
             oxlint (native)  █████████████ 940ms
```

| Stack | Cold (median) | Spread (min–max) | Warm (median) | Findings | Files |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Interlace (ESLint) | 1.51s | 1.49s–1.52s | 735ms | 700 | 3411 |
| Community plugins (ESLint) | 2.81s | 2.80s–2.83s | 842ms | 18 | 3411 |
| oxlint (native) | 940ms | 935ms–963ms | 933ms | 43739 | 3417 |

## How to read this

- **Same file set**: every stack lints the same explicit glob (`apps/**/*.{js,jsx,ts,tsx,mjs,cjs}`). ESLint-stack parity: **verified** (ours 3411 files, competitor 3411 files).
- **Different rule sets, same job.** Each stack runs its own recommended preset. A stack that runs fewer rules doing less work is not "faster" in a way you can use — read the findings column alongside the time.
- **oxlint is a native binary and will win on wall-clock.** That is the honest result, not a rounding error: it is a different engine class. The number that matters for an ESLint user is the ESLint-to-ESLint comparison.
- **Cold** = `--no-cache`. **Warm** = `--cache` against a primed cache file.
- **Median of 5**, first run discarded as warmup. Spread is shown so a noisy machine is visible rather than hidden.

Reproduce: `npm run ilb:headline -- --repo=shadcn-ui --repeat=5`
