# ESLint Version Support Policy

> **Last data refresh:** 2026-05-09
> **Data window:** last-week (npm registry, 2026-05-02 → 2026-05-09)
> **Owner:** Interlace ESLint Team
> **Status:** Active

## Policy

A major version of `eslint` is **supported** when either:
1. It has **≥20% of weekly downloads** (the industry-share gate), OR
2. It is **the next major after a currently-supported version** (the forward-looking exception) — we ship support before the gate is crossed so users can upgrade ahead of the curve, not behind it.

Supported majors must be:
1. Listed in every package's `peerDependencies`
2. Included in the benchmark matrix
3. Validated in CI before release

When a major drops below 20% on two consecutive refreshes **and** has a successor that is itself supported, it becomes a candidate for removal (with a deprecation notice in the next minor release).

The 20% threshold is an industry-share gate, not a date-based one — we follow where the ecosystem actually is, not where we wish it were. The forward-looking exception keeps us ahead of the upgrade wave for `n+1`.

## Current Support Matrix

Snapshot from `benchmark-results/eslint-version-stats.json` (refreshed 2026-05-09):

| Major | Weekly Downloads | Share | Supported? | Notes |
|---|---|---|---|---|
| **v9** | 76.9M | 60.41% | ✓ (gate) | Current ecosystem default |
| **v8** | 30.9M | 24.26% | ✓ (gate) | Legacy active — above 20% gate |
| **v10** | 11.8M | 9.24% | ✓ (forward-looking) | Released 2026-02-06; the future of v9 — supported pre-emptively to keep users ahead of the upgrade wave |
| v7 | 4.0M | 3.18% | ✗ | EOL |
| v6 and older | 3.7M | 2.90% | ✗ | EOL |

**Total weekly downloads observed:** 127.3M

### Implications today
- Required `peerDependencies` per package: `"eslint": "^8.0.0 || ^9.0.0 || ^10.0.0"`
- Required benchmark matrix: `[v8, v9, v10]`
- v10 is currently below the 20% gate but covered by the forward-looking exception. Re-evaluate at each refresh — once v10 crosses the gate and v8 falls below it on two consecutive refreshes, v8 becomes a deprecation candidate.

## Refreshing the Data

Run the refresh script and commit the JSON:

```bash
npm run stats:eslint-versions          # human-readable table
npm run stats:eslint-versions:json     # writes benchmark-results/eslint-version-stats.json
```

After refreshing, update **this document's** Current Support Matrix and the "Last data refresh" date at the top. Do this:
- Quarterly (mandatory)
- Before any release that touches `peerDependencies`
- Whenever a new ESLint major is announced

The script lives at [`scripts/fetch-eslint-version-stats.ts`](../scripts/fetch-eslint-version-stats.ts) and is generic — it accepts `--package=<name>` for querying any npm package's per-version download share.

### Data source caveats
- npm's per-version download endpoint only exposes a **last-week** window. Longer windows exist for total package downloads but cannot be split by version.
- For a longer trend, run the script on a weekly cadence and accumulate snapshots in `benchmark-results/`.
- Counts include CI/automation traffic — they overstate "human user" share but are the best available signal and are consistent across versions.

## What "Supported" Means

A supported major version must:
1. **Pass the formatter benchmark suite** ([`packages/eslint-formatter`](../packages/eslint-formatter)) — token-efficiency claims hold against that version's stylish/json formatters.
2. **Be in the CI matrix** — every PR runs tests against each supported major.
3. **Be listed in `peerDependencies`** of every published package.
4. **Be installable as a `devDependency`** in at least one workspace package so `npm install` exercises it.

Dropping support requires:
- Two consecutive refreshes showing <20% share, OR an upstream EOL announcement
- A minor release with deprecation notice
- The next major release removes the version from peer deps and CI matrix
