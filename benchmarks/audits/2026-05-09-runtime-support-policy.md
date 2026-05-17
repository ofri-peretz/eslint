# Runtime Support Policy — Node.js + TypeScript

> **Purpose.** Define which Node.js and TypeScript versions Interlace officially supports, ground the policy in industry distribution data, and tie it to the ILB-Node-Matrix and ILB-TSC-Matrix benches.
>
> **Last reviewed:** 2026-05-09. Re-review trigger: any Node major reaching End-of-Life or any TS major's GA.

---

## 1. The policy

| Tier | Node majors | TypeScript majors | Bench coverage | What we promise |
| :--- | :--- | :--- | :--- | :--- |
| **Active LTS** | 22, 24 | 5.x, 6.x | Per-PR ILB matrices | Full support — zero drift, regression-gated |
| **Maintenance LTS** | 20 (until 2026-04-30) | 5.x | Nightly matrix | Best-effort — bugs accepted, no proactive fixes after EOL |
| **Beyond-EOL legacy** | 18 (EOL 2025-04-30) | 5.0–5.4 | Tracked in matrix, **out of contract** | Numbers reported, but failures don't fail CI. Migrate. |
| **Pre-LTS / odd majors** | 23, 25 | 5.x betas, 6.x betas | Not benched | Not supported. |

Rationale: matches Node.js's [official release schedule](https://nodejs.org/en/about/previous-releases) — Active LTS gets full support, Maintenance LTS gets bug-fix support until EOL, and EOL'd versions stop being a contract obligation.

This policy is enforced mechanically by [`benchmarks/suites/ilb-node-matrix/run.mjs`](../suites/ilb-node-matrix/run.ts) — the `SUPPORT_POLICY` constant is the source of truth; touching it requires an explicit policy review (this doc).

## 2. Why these versions — Node.js LTS schedule

Node.js follows a strict release / LTS / EOL cycle. Even-numbered majors become Active LTS, odd-numbered majors never do. Current schedule:

| Major | Released | Active LTS | Maintenance LTS | EOL |
| :---: | :---: | :---: | :---: | :---: |
| **18** | 2022-04 | 2022-10 → 2023-10 | 2023-10 → 2025-04 | **2025-04-30 (long EOL)** |
| **20** | 2023-04 | 2023-10 → 2024-10 | 2024-10 → 2026-04 | **2026-04-30 (just-EOL)** |
| **22** | 2024-04 | 2024-10 → 2025-10 | 2025-10 → 2027-04 | 2027-04-30 |
| **24** | 2025-04 | 2025-10 → 2026-10 | 2026-10 → 2028-04 | 2028-04-30 |
| 23 | 2024-10 | n/a | n/a | 2025-06 (odd, never LTS) |
| 25 | 2025-10 | n/a | n/a | 2026-06 (odd, never LTS) |

(Source: [github.com/nodejs/release](https://github.com/nodejs/release) · [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases))

## 3. Industry distribution — *what version is the world actually on?*

> **Important.** I do not have real-time runtime distribution data. The numbers below are rough impressions from training-era reports (2024–early 2026) — useful for planning, **not** authoritative for marketing claims.

Approximate share of *production* JavaScript workloads as of early 2026:

| Major | Production share | Notes |
| :---: | :---: | :--- |
| 20 | ~30–40% | Was Active LTS for most of 2024 — biggest installed base |
| 18 | ~25–35% | Long-tail enterprise / slow migrators (banking, on-prem) |
| 22 | ~20–30% | Adoption ramping since 2024-10 LTS |
| 24 | ~5–15% | Fresh LTS (2025-10); early-adopter share |
| 16 + older | ~5–10% | EOL'd Sept 2023; legacy long-tail |

These ratios shift fast — the "Node 18 → 20" migration through 2024 collapsed Node 16's share by ~half in a single year.

### Authoritative sources (use these, not the table above)

For *real* numbers when planning support coverage or marketing claims:

1. **npm registry user-agent stats** — every `npm install` reports the Node version. Aggregations via [npm-stat.com](https://npm-stat.com/) and the [npm-stat-api](https://api.npmjs.org/) endpoint. Most direct production signal.
2. **GitHub Octoverse** — [annual report](https://octoverse.github.com/) covers runtime distribution among GitHub-hosted projects.
3. **Datadog "State of Node.js"** — [datadoghq.com/state-of-nodejs](https://www.datadoghq.com/state-of-nodejs/) — production runtime telemetry from Datadog-instrumented services. Most realistic for "what runs in prod."
4. **State of JS** — [stateofjs.com](https://stateofjs.com/) annual survey; broader but self-reported.
5. **Vercel / Cloudflare / Netlify runtime stats** — occasional public posts; reflect serverless-leaning workloads.
6. **Snyk "State of Open Source Security"** — [snyk.io/reports](https://snyk.io/reports/) — dependency-graph perspective.

### When to refresh this doc

- A Node major hits EOL (next: Node 20 on 2026-04-30 → already done; verify the EOL flag in this doc).
- A new Node major becomes Active LTS (next: Node 26, expected 2026-10).
- An npm-stat or Datadog refresh shifts a tier's share by > 10 points (consider promoting/demoting tiers).
- The benchmark fleet adopts a new TS major (next: TS 6 GA — already shipped, see ILB-TSC-Matrix evidence).

## 4. How the matrix benches use this policy

- **[ILB-Node-Matrix](../suites/ilb-node-matrix/run.ts)** runs the lint corpus under each major in `SUPPORT_POLICY` (active + maintenance + legacy). Per-version median latency + zero-drift correctness check.
- **[ILB-TSC-Matrix](../suites/ilb-tsc-matrix/run.ts)** does the same across `tsc-classic` (TS 5.x) and `tsc-go` (TS 6.x preview / GA).
- Combined matrix dimension: `{node@18, node@20, node@22, node@24} × {tsc-classic, tsc-go}` = 8 cells. CI runs the active-LTS subset (4 cells) per-PR; the full 8-cell matrix runs nightly.

## 5. Why we don't track Bun / Deno / Workerd here

Out of policy scope by design. Bun (75K⭐) and Deno are runtime alternatives with their own type-checking and bundling stories. Adding them would mean a separate bench (`ILB-Runtime-Matrix`?) and a different methodology — they don't share Node's V8 release cadence or LTS contract. Tracked under the leadership roadmap as a future Phase 5 item if user-base demand emerges.
