# Architecture

> Bird's-eye view of the **Interlace ESLint** repo. Read this before contributing — it's the map that tells you where to find things.
>
> For the broader ecosystem (how this repo fits with `agents/` and `serverless/`), see [`agents/ARCHITECTURE.md`](../agents/ARCHITECTURE.md). For agent-facing instructions, see [AGENTS.md](AGENTS.md).
>
> Format follows the [`ARCHITECTURE.md` convention](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html).

## What this repo is

The **Interlace ESLint** ecosystem. **37 independently-versioned packages** covering security rules, quality rules, MCP servers, formatters, and shared developer tooling for JavaScript and TypeScript projects.

Composition (as of 2026-05): **20 ESLint plugins** + **11 MCP servers** (one per security plugin) + **6 supporting packages** (devkit, 2 formatters, mcp-base, CLI, telemetry).

Sister repos: [`agents/`](../agents/) (cross-product baselines + skills), [`serverless/`](../serverless/) (Serverless Framework plugins).

## Bird's-eye

```
eslint/
├── packages/                    ← every published package (37 of them)
│   ├── eslint-plugin-*/         ← 20 ESLint plugins (security + quality + architecture)
│   ├── *-mcp/                   ← 11 MCP servers (one per security plugin)
│   ├── eslint-devkit/           ← shared rule-creation utilities (createRule, helpers)
│   ├── eslint-formatter/        ← custom CLI formatter (compact / json / ndjson modes)
│   ├── eslint-formatter-sarif/  ← SARIF output for security tooling integration
│   └── eslint-mcp-base/         ← shared MCP-server base package
│
├── apps/
│   └── docs/                    ← Fumadocs site at eslint.interlace.tools (Next.js)
│
├── benchmarks/                  ← Interlace Lint Bench (ILB) suites — see benchmarks/README.md
├── benchmark-results/           ← live benchmark output — see benchmark-results/README.md
├── distribution/                ← public-facing project strategy (sensitive items gitignored)
├── docs/                        ← repo-internal docs — see docs/README.md
├── tools/                       ← built/published tooling (cwe-engine, oxlint shims, internal rules) — see tools/README.md
└── scripts/                     ← repo-wide automation invoked from npm/CI — see scripts/README.md
```

> **Deeper plugin-placement reference:** [`.agent/plugin-classification-graph.md`](.agent/plugin-classification-graph.md) holds the authoritative plugin-scope ↔ rule mapping (with mermaid graph). Use it when the table in "Plugin organization" below isn't enough.

## Plugin organization (the rule that decides where new code goes)

When adding a rule, decide which plugin owns it using the **scope rule**:

| If the rule detects... | Plugin |
|---|---|
| Generic JS/TS code patterns (no SDK awareness) | `eslint-plugin-secure-coding` |
| A pattern in a specific SDK / framework | A dedicated SDK plugin (`-pg`, `-mongodb-security`, `-vercel-ai-security`, `-jwt`, `-jwt`, `-react-a11y`, etc.) |
| Code-quality / maintainability concern (not security) | One of the quality plugins (`-conventions`, `-maintainability`, `-modernization`, `-modularity`, `-operability`, `-reliability`) |

**Why:** SDK-specific rules understand the API surface, reduce false positives, and enable framework-aware remediation. Generic rules produce noisy detections that erode trust. See the philosophy section in [AGENTS.md](AGENTS.md).

## Build & release

- **Build orchestration:** Nx (workspace at `nx.json`)
- **Bundler per package:** Vite for libraries, esbuild via Nx targets
- **Test runner:** Vitest (workspace config at `vitest.workspace.ts`)
- **Coverage:** v8 / c8, uploaded to Codecov
- **Release flow:** [`gh workflow run release.yml`](.github/workflows/release.yml) (Trusted Publishing OIDC for `@interlace/*`, `NPM_TOKEN` for unscoped); each package versions independently from conventional-commits
- **ESLint compatibility:** every package declares `"eslint": "^8.0.0 || ^9.0.0 || ^10.0.0"` as a peer dep, and the FN/FP arena ([`benchmarks/suites/ilb-arena/`](benchmarks/suites/ilb-arena/)) runs against all three majors. Driven by [docs/ESLINT_VERSION_SUPPORT.md](docs/ESLINT_VERSION_SUPPORT.md) — refresh data with `npm run stats:eslint-versions`.

## Documentation site

`apps/docs/` is a Fumadocs (Next.js) site. Theme, components, and config are **not authored here** — they're pulled in via `.interlace/` from [`agents/apps/interlace-docs-baseline/`](../agents/apps/interlace-docs-baseline/).

**Do not edit** files inside `apps/docs/.interlace/` — they're auto-generated. Edit the baseline source in the `agents/` repo and re-run `npm run sync` from there.

The site exposes machine-readable indexes:

- `/llms.txt` — page list with descriptions (concise)
- `/llms-full.txt` — full prose for AI agent ingestion
- `/llms.mdx` — alternate index format

These follow the [llms.txt convention](https://llmstxt.org/) supported by Anthropic, Cursor, Mintlify, and Vercel.

## Key documents

| Document | Purpose |
|---|---|
| [README.md](README.md) | User-facing overview |
| [AGENTS.md](AGENTS.md) | AI agent instructions (Codex/Claude/Cursor format) |
| CONTRIBUTING.md (planned) | Contribution guide |
| [docs/QUALITY_STANDARDS.md](docs/QUALITY_STANDARDS.md) | Production-ready rule checklist |
| docs/CICD.md (planned) | CI/CD workflow |
| [docs/ESLINT_VERSION_SUPPORT.md](docs/ESLINT_VERSION_SUPPORT.md) | Which ESLint majors we support and why |
| [ROADMAP.md](ROADMAP.md) | Phased delivery plan |
