# Baseline Matrix — Plugin → OSS Repo Mapping

> **Purpose.** This is the canonical answer to *"for plugin X, which real-world OSS repos do we benchmark against, and against which competitor plugins?"*
>
> **Source of truth.** The actual repo list lives in [`scripts/ilb-wild.mjs`](../scripts/ilb-wild.ts) (`BENCHMARK_REPOS`, lines 87–329). Each entry there has a `plugins: [...]` array binding it to one or more Interlace plugins. **This document is the inverse view** — pivoted by plugin — so you don't have to read the registry to answer "what do we run secure-coding against?"
>
> **Stability contract.** The repos below are pinned to specific commits/tags in the registry for reproducibility. **Do not change a repo's pinned commit without bumping the bench version** (see [`README.md` §8](./README.md#8-adding-things--fixtures-benches-rules)). When adding a new plugin or expanding coverage, follow the [Update procedure](#update-procedure) at the bottom.

---

## How to read this

- Each row = one Interlace plugin.
- **Real-signal repos** = repos where findings are expected to be real vulns (or zero-finding clean code). Used as ILB-Wild signal corpus.
- **FP-edge repos** = repos that legitimately use risky-looking patterns (`eval`, `Function`, `dangerouslySetInnerHTML`, dynamic property access). Findings here default to FP candidates pending triage. Used as ILB-Edge corpus.
- **Competitors** = the comparison set in ILB-Arena (security) / ILB-Arena-Quality (quality), running the same fixtures.
- ⭐ counts are GitHub stars at registry-pin time, used to weight "famous-ness" priority.

---

## Tiering policy — 45K+ consensus with niche exceptions

**Decision (2026-05-09).** Baselines must be **45K+ stars at pin time** (Tier 1, "Consensus"), with **explicit named exceptions** for niches where no 45K+ flagship exists (Tier 2, "Niche Flagship"). 80K+ was considered but rejected — too restrictive, would zero out 6 plugins.

### Tier 1 — Consensus (45K+ stars, no questions asked)

A repo at 45K+ stars is presumed-credible: well-known, widely audited, journalist-friendly. Default tier for any new entry.

### Tier 2 — Niche Flagship (under 45K, requires named exception)

A sub-45K repo is only allowed if it's the **#1 most popular repo in its niche** AND the niche has no 45K+ option. Currently approved exceptions:

| Niche | Approved sub-45K repos | Why |
|---|---|---|
| **Lambda / serverless tooling** | sst (22K) · aws-lambda-powertools (1.7K) · serverless-api-gateway-caching (200) | The 45K+ holder is `serverless` itself; these are official AWS / SST tooling that exercises lambda-security on real deployment-infra patterns. Niche has no other 45K+ repos |
| **AI SDK / agents** | vercel-ai (15K) · langchain-js (15K) | The vercel-ai-security niche is <2 years old. These are the niche's flagships — no 45K+ option exists yet. Re-evaluate annually |
| **NestJS ecosystem extras** | twentyhq (30K) · nestjs-typeorm (1.7K) | Nest itself (70K) is T1; these are *extras* for additional NestJS coverage (production app + official TypeORM module) |
| **MongoDB-TS** | payload (35K) | mongodb-security niche has no 45K+ flagship. Mongoose (27K) is bigger by use but has no TS-first repo |
| **PostgreSQL ORMs / extras** | twentyhq (30K) · medusa (28K) | Supabase (78K) is T1 for pg; these are supplemental coverage |
| **Express middleware** | cal.com (35K) · payload (35K) | Strapi (66K) is T1 for express-security; these are supplemental. **Candidate for replacement** by n8n (55K) which is T1-eligible |

### Adding a new entry — checklist

1. Is it ≥ 45K stars? → **T1, just add it.**
2. If under 45K: is it the niche flagship for a plugin with no T1 option? → **add as T2 exception with a named entry in the table above.**
3. Otherwise: **don't add it.** Find a 45K+ alternative or accept lower coverage on that niche.

Each row in the security table below is annotated with the tier its baselines sit in.

## Security plugins

| Plugin | Tier | Real-signal repos (top 3) | FP-edge repos | Competitors |
|---|---|---|---|---|
| **secure-coding** | T1 | next.js (131K⭐) · shadcn-ui (100K⭐) · supabase (78K⭐) | three.js · react · lodash · babel | eslint-plugin-security · sonarjs · security-node · @microsoft/eslint-plugin-sdl · no-secrets |
| **browser-security** | T1 | next.js (131K⭐) · shadcn-ui (100K⭐) · supabase (78K⭐) | three.js · react | eslint-plugin-no-unsanitized · eslint-plugin-security |
| **node-security** | T1 | next.js (131K⭐) · supabase (78K⭐) · strapi (66K⭐) | webpack · three.js · lodash · babel | eslint-plugin-n · eslint-plugin-security-node |
| **express-security** | T1 + T2 | **strapi (66K⭐)** · cal.com (35K⭐, T2) · payload (35K⭐, T2) | — | eslint-plugin-security (eval/regex subset only) |
| **lambda-security** | T1 + T2 | **serverless (46K⭐)** · sst (22K⭐, T2) · aws-lambda-powertools (1.7K⭐, T2) | — | *no direct competitor — green-field* |
| **nestjs-security** | T1 + T2 | **nestjs (70K⭐)** · twentyhq (30K⭐, T2) · nestjs-typeorm (1.7K⭐, T2) | — | *no direct competitor — green-field* |
| **vercel-ai-security** | T2 only | vercel-ai (15K⭐, niche flagship) · langchain-js (15K⭐, T2) | — | *no direct competitor — green-field* |
| **pg** | T1 + T2 | **supabase (78K⭐)** · twentyhq (30K⭐, T2) · medusa (28K⭐, T2) | — | sonarjs (SQL-injection rules only) |
| **mongodb-security** | T2 only | payload (35K⭐, niche flagship for TS-Mongo) | — | *no direct competitor — green-field* |
| **crypto** | T1 | appwrite (48K⭐) | — | eslint-plugin-security (weak-crypto subset only) |
| **jwt** | T1 | supabase (78K⭐) | — | *no direct competitor — green-field* |

**Bold** = Tier 1 (≥ 45K stars). Plain = Tier 2 niche-flagship exception. **Two plugins are T2-only** (`vercel-ai-security`, `mongodb-security`) — those are the niches we should re-evaluate as the OSS landscape grows.

## Quality plugins

These have **no real-OSS baseline today.** They run only on synthetic fixtures in **ILB-Arena-Quality** (40 vulnerable + 38 safe samples), head-to-head against `sonarjs`, `unicorn`, `n`, `jsdoc`, `import`, `promise`, `regexp`.

| Plugin | Wild repos | Arena-Quality competitors |
|---|---|---|
| **maintainability** | — | sonarjs · unicorn · jsdoc |
| **reliability** | — | sonarjs · unicorn · n |
| **modernization** | — | unicorn · n |
| **conventions** | — | unicorn · jsdoc |
| **modularity** | — | import · unicorn |
| **operability** | — | n · sonarjs |

> Coverage gap. Quality plugins should be added to the Wild registry — best candidates: cal.com, twentyhq, strapi (large real codebases with mixed quality).

## React plugins

| Plugin | Status |
|---|---|
| **react-a11y** | *Not in any bench today.* Should be added to Wild — natural targets: shadcn-ui, cal.com, next.js. Competitor: jsx-a11y |
| **react-features** | *Not in any bench today.* Same target set. No direct competitor |

## Imports

| Plugin | Bench | Baseline | Competitor |
|---|---|---|---|
| **import-next** | ILB-Perf-Import | snappy-client-dashboard (5,736 files, internal repo) | eslint-plugin-import (`no-cycle` head-to-head on the same corpus) |

## Infrastructure (no benchmarks)

`cli`, `eslint-devkit` — tooling, not lint rules. No bench coverage required.

---

## Repo glossary

Each repo is pinned to a specific commit/tag in [`scripts/ilb-wild.mjs`](../scripts/ilb-wild.ts). Quick reference for what each is:

### Real-signal corpus (signal expected)

| Repo | Pin | Stars | What it is | Why it's in the bench |
|---|---|---|---|---|
| **next.js** | `v15.1.0` | 131K | Vercel's React-based full-stack framework | Gold-standard Next.js code — lint-clean here = lint-clean anywhere |
| **shadcn-ui** | `main` | 100K | The most popular React component library | Browser-security validation on widely-used UI primitives |
| **supabase** | `master` | 78K | Open-source Firebase alternative (PostgreSQL-native BaaS) | Exercises pg, JWT, browser-security in one codebase |
| **nestjs** | `master` | 70K | The flagship Node.js backend framework (DI, decorators, modules) | Direct audience for nestjs-security on the framework itself |
| **strapi** | `main` | 66K | Headless CMS, plugin-heavy Node.js | Dynamic require, CORS, auth — exercises express + node security |
| **appwrite** | `main` | 48K | BaaS platform (auth/storage/functions) | Crypto, sessions, credential handling. (Note: only the public SDK; main repo is PHP) |
| **serverless** | `main` | 46K | The Serverless Framework — deploys AWS Lambda etc. | Lambda-security on real deployment infra |
| **payload** | `main` | 35K | TypeScript-first headless CMS, MongoDB-native | Mongodb-security + express middleware |
| **cal.com** | `main` | 35K | Open-source Calendly (full-stack SaaS) | Auth + payments + webhooks — exercises JWT/CORS/session rules |
| **twentyhq** | `main` | 30K | Open-source CRM (Twenty), built on NestJS + PostgreSQL | Production NestJS server — nestjs-security + pg in one |
| **medusa** | `develop` | 28K | E-commerce backend (PostgreSQL-native) | pg + payment-security patterns |
| **sst** | `dev` | 22K | Serverless Stack — modern AWS deploy framework | lambda-security on SST v3 |
| **vercel-ai** | `main` | 15K | Vercel's AI SDK (LLM integration) | THE target for vercel-ai-security — validates rules on the SDK itself |
| **langchain-js** | `main` | 15K | LangChain JS — AI agent framework | Prompt injection, output validation, tool safety |
| **aws-lambda-powertools** | `main` | 1.7K | AWS-official Lambda toolkit (logger, tracer, parameters) | Lambda-security on real Lambda patterns |
| **nestjs-typeorm** | `master` | 1.7K | NestJS + TypeORM official integration | nestjs-security + pg together |
| **serverless-api-gateway-caching** | `develop` | 200 | Serverless framework plugin | lambda-security on real deployment plugin code |

### FP-edge corpus (findings = FP candidates by default)

| Repo | Pin | Stars | What it is | Why it's FP-edge |
|---|---|---|---|---|
| **react** | `main` | 230K | Facebook's React (react-dom subset) | react-dom legitimately uses `dangerouslySetInnerHTML`, `postMessage`, dynamic property access |
| **three.js** | `r170` | 105K | The dominant WebGL library | Legitimate `eval`, `Function`, `postMessage` for shader compilation |
| **webpack** | `main` | 65K | The bundler | Legitimate `eval` for HMR/source maps, `Function` constructor for runtime modules |
| **lodash** | `main` (fp/) | 60K | Utility library | `lodash/fp` uses dynamic property access (`get`/`set`/`has`) by design — high-noise target for `detect-object-injection` |
| **babel** | `main` (babel-parser/) | 43K | The JS compiler (parser subset) | Parser/codegen legitimately uses `Function` constructor and dynamic property access on AST nodes |

---

## Coverage expansion candidates

Famous OSS repos **not yet in the registry** that would strengthen specific plugins. When the user asks "should we add more famous repos?", these are the next picks. Pin to a release tag when adding.

### Tier 1 graduation candidates (80K+ stars — strengthen consensus)

These would expand the consensus baseline for `secure-coding`, `browser-security`, and `node-security`:

| Repo | Stars | Best for | Notes |
|---|---|---|---|
| **vscode** (microsoft/vscode) | 170K | secure-coding · node-security · browser-security | Massive TypeScript real production app — would exercise everything. Some IPC paths may be FP-edge for node-security |
| **excalidraw** (excalidraw/excalidraw) | 90K | browser-security · secure-coding | Big React/TS app, drawing canvas — strong browser-security signal on real product |
| **typescript** (microsoft/typescript) | 100K | FP-edge only | Compiler — dynamic `Function`, AST manipulation. Best added as **FP-edge corpus**, not signal |

### Tier 2 niche expansion (fills single-repo plugins)

These are *not* 80K+ but are the consensus repo of their niche — important because the plugin niches don't have any 80K+ flagship at all:

| Repo | Stars | Best for | Why |
|---|---|---|---|
| **bun** (oven-sh/bun) | 75K | node-security · secure-coding | Just under T1 — major Node-runtime alternative, strong node-security signal |
| **n8n** (n8n-io/n8n) | 55K | node-security · secure-coding · express-security | TS workflow automation — webhooks, dynamic code execution |
| **nuxt** (nuxt/nuxt) | 55K | secure-coding · node-security · browser-security | Vue equivalent of next.js — diversifies framework coverage beyond React |
| **prisma** (prisma/prisma) | 40K | pg · node-security | TS ORM — would double pg coverage |
| **mongoose** (Automattic/mongoose) | 27K | mongodb-security · node-security | Major Mongo ODM — `mongodb-security` is currently a single-repo plugin (payload only) |
| **passport** (jaredhanson/passport) | 23K | jwt · crypto · express-security | Auth library — would triple jwt coverage |
| **typeorm** (typeorm/typeorm) | 35K | pg · mongodb-security · node-security | ORM covering both PG and Mongo |

### Medium priority (single-plugin gap-fillers)

| Repo | Stars | Best for | Why |
|---|---|---|---|
| **prisma** (prisma/prisma) | 40K | pg · node-security | TS ORM with PostgreSQL/MySQL — would double pg coverage |
| **typeorm** (typeorm/typeorm) | 35K | pg · mongodb-security · node-security | ORM covering both PG and Mongo — fills mongodb-security gap (currently only payload) |
| **prisma + drizzle** | — | pg | Two more pg targets if pg coverage stays thin |
| **passport** (jaredhanson/passport) | 23K | jwt · crypto · express-security | Auth library — would triple jwt coverage (currently only supabase) |
| **node-jsonwebtoken** | 18K | jwt | Would give jwt a dedicated target |
| **mongoose** (Automattic/mongoose) | 27K | mongodb-security · node-security | Major Mongo ODM — mongodb-security currently only on payload |

### FP-edge candidates (would expand FP-resilience corpus)

| Repo | Stars | Why FP-edge |
|---|---|---|
| **vite** (vitejs/vite) | 70K | Bundler like webpack — legitimate `eval`, dynamic import |
| **typescript** (microsoft/typescript) | 100K | Compiler — dynamic `Function`, AST manipulation |
| **rollup** (rollup/rollup) | 25K | Bundler — same FP-edge profile as webpack |

---

## Update procedure

When adding/changing baseline repos:

1. **Edit [`scripts/ilb-wild.mjs`](../scripts/ilb-wild.ts).** Add a new entry to `BENCHMARK_REPOS` with `name`, `repo`, `commit` (pin to a release tag where possible), `stars`, `srcGlob`, `plugins: [...]`, `category`, `why`, and `fpEdge: true` if applicable.
2. **Update this matrix.** Add the repo to the relevant plugin row(s) and to the "Repo glossary" table. Move it out of "Coverage expansion candidates" if it was there.
3. **Bump the bench version** if the corpus shape changes meaningfully (add/remove plugin coverage, change pinned commit). See [`README.md` §8](./README.md#8-adding-things--fixtures-benches-rules) for versioning rules.
4. **Run `npm run ilb:wild -- --repo <name>`** to validate the new entry produces results.
5. **Re-run `npm run ilb:scorecard`** so [`benchmark-results/scorecard.md`](../benchmark-results/scorecard.md) reflects the new corpus shape.

When **removing** a repo: never silently drop it — annotate with a "retired" line and the reason (e.g., "registry pruned 2026-XX-XX: repo archived upstream"), and bump the version.

---

## Why this document exists

Without it, every future session has to re-derive the plugin → repo mapping by reading the registry inline. That's expensive and error-prone (I missed `next.js` for both `secure-coding` and `node-security` on first pass — the registry has it, but it's encoded by-repo, not by-plugin). This document is the inverse pivot, kept as the canonical reference so:

- **Future Claude sessions** can answer "what's the baseline for plugin X?" in one read.
- **Future runs** stay reproducible against the same set of famous OSS repos.
- **Coverage gaps** (single-repo plugins, missing react-a11y bench, no Wild for quality) are surfaced explicitly instead of buried.
