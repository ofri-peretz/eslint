# Architecture

> Bird's-eye view of the **Interlace ESLint** repo. Read this before contributing — it's the map that tells you where to find things.
>
> For the broader ecosystem (how this repo fits with `agents/` and `serverless/`), see [`agents/ARCHITECTURE.md`](../agents/ARCHITECTURE.md). For agent-facing instructions, see [AGENTS.md](AGENTS.md).
>
> Format follows the [`ARCHITECTURE.md` convention](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html).

## What this repo is

The **Interlace ESLint** plugin suite. ~24 independently-versioned ESLint plugins covering security, quality, and architecture governance for JavaScript and TypeScript projects, plus shared developer tooling.

Sister repos: [`agents/`](../agents/) (cross-product baselines + skills), [`serverless/`](../serverless/) (Serverless Framework plugins).

## Bird's-eye

```
eslint/
├── packages/                    ← all the plugins live here (~24 of them)
│   ├── eslint-plugin-*/         ← security + quality + architecture plugins
│   ├── eslint-devkit/           ← shared rule-creation utilities (createRule, helpers)
│   ├── eslint-formatter/        ← custom CLI formatter
│   ├── cli/                     ← @interlace/eslint CLI (preset bundler)
│   └── benchmarks/              ← perf benchmark suite
│
├── apps/
│   └── docs/                    ← Fumadocs site at docs.interlace.dev/eslint (Next.js)
│
├── distribution/                ← npm registry strategy, competitive analysis
├── docs/                        ← repo-internal docs (CICD, quality standards, ADRs)
├── tools/                       ← repo-local tooling (release scripts, etc.)
└── scripts/                     ← build + CI scripts
```

## Plugin organization (the rule that decides where new code goes)

When adding a rule, decide which plugin owns it using the **scope rule**:

| If the rule detects... | Plugin |
|---|---|
| Generic JS/TS code patterns (no SDK awareness) | `eslint-plugin-secure-coding` |
| A pattern in a specific SDK / framework | A dedicated SDK plugin (`-pg`, `-mongodb-security`, `-vercel-ai-security`, `-jwt`, `-jwt`, `-react-a11y`, etc.) |
| Code-quality / maintainability concern (not security) | One of the quality plugins (`-conventions`, `-maintainability`, `-modernization`, `-modularity`, `-operability`, `-reliability`) |

**Why:** SDK-specific rules understand the API surface, reduce false positives, and enable framework-aware remediation. Generic rules produce noisy detections that erode trust. See the philosophy section in [AGENTS.md](AGENTS.md#interlace-eslint--rule-design-philosophy).

## Build & release

- **Build orchestration:** Nx (workspace at `nx.json`)
- **Bundler per package:** Vite for libraries, esbuild via Nx targets
- **Test runner:** Vitest (workspace config at `vitest.workspace.ts`)
- **Coverage:** v8 / c8, uploaded to Codecov
- **Release flow:** `pnpm nx release` per package; each plugin versions independently

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
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [docs/QUALITY_STANDARDS.md](docs/QUALITY_STANDARDS.md) | Production-ready rule checklist |
| [docs/CICD.md](docs/CICD.md) | CI/CD workflow |
| [ROADMAP.md](ROADMAP.md) | Phased delivery plan |
