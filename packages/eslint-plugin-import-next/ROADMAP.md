# eslint-plugin-import-next: Strategic Vision & Roadmap (2025-2027)

> **Mission Evolution**: From "drop-in replacement for eslint-plugin-import" to "the definitive module governance platform for the modern JavaScript/TypeScript ecosystem"

---

## Executive Summary

This roadmap transforms `eslint-plugin-import-next` from a high-performance compatibility layer into a comprehensive module governance platform addressing **12 critical pain points** that the original `eslint-plugin-import` and existing tooling cannot solve.

```mermaid
graph LR
    subgraph Phase 0 ["Phase 0: Current (✅ Done)"]
        A[100% Rule Parity]
        B[8x Faster no-cycle]
        C[3 Exclusive Rules]
    end

    subgraph Phase 1 ["Phase 1: Module Resolution"]
        D[package.json exports]
        E[TypeScript paths sync]
        F[Bundler-aware resolution]
    end

    subgraph Phase 2 ["Phase 2: Bundle Optimization"]
        G[Barrel file detection]
        H[Tree-shaking guidance]
        I[Chunk optimization]
    end

    subgraph Phase 3 ["Phase 3: Framework Integration"]
        J[Next.js App Router]
        K[SSR/Client boundaries]
        L[Server Actions]
    end

    subgraph Phase 4 ["Phase 4: Enterprise Governance"]
        M[Team boundaries]
        N[Approved registries]
        O[Migration enforcement]
    end

    Phase 0 --> Phase 1 --> Phase 2 --> Phase 3 --> Phase 4
```

---

## Part 1: Current State Assessment

### What We Have (Backwards Compatibility)

| Category                     | Rules  |        Status        |
| ---------------------------- | :----: | :------------------: |
| Static Analysis              |   13   |    ✅ 100% parity    |
| Helpful Warnings             |   8    |    ✅ 100% parity    |
| Module Systems               |   5    |    ✅ 100% parity    |
| Style Guide                  |   17   |    ✅ 100% parity    |
| **Exclusive to import-next** |   3    |     ✅ Shipping      |
| **Total**                    | **46** | **Production Ready** |

### Exclusive Rules (Already Shipping)

| Rule                           | Description                                 |
| ------------------------------ | ------------------------------------------- |
| `no-cross-domain-imports`      | Clean architecture boundary enforcement     |
| `enforce-dependency-direction` | Layered architecture (UI → Services → Data) |
| `prefer-node-protocol`         | Prefer `node:fs` over `fs`                  |

---

## Part 2: Research Findings — The 12 Critical Pain Points

### 🔴 Category A: Module Resolution Gaps

#### A1. package.json `exports` Field Not Supported

**Severity**: Critical  
**Impact**: False positives on valid subpath imports

eslint-plugin-import does NOT natively support the modern `package.json` `exports` field (Node.js 12.7+). This causes `import/no-unresolved` to incorrectly flag valid imports.

```json
// date-lib/package.json
{
  "exports": {
    ".": "./dist/index.js",
    "./parser": "./dist/parser.js",
    "./types": { "types": "./dist/types.d.ts" }
  }
}
```

```typescript
// ❌ eslint-plugin-import reports: "Unable to resolve path to module"
import { parse } from 'date-lib/parser';

// Current workaround: Add eslint-import-resolver-exports (external dependency)
```

**Proposed Rule**: `no-unresolved` — Native exports field support built-in

---

#### A2. Subpath Imports (`#imports`) Not Recognized

**Severity**: High  
**Impact**: Internal package aliasing broken in linting

The `imports` field in `package.json` (subpath imports using `#` prefix) is not recognized.

```json
// package.json
{
  "imports": {
    "#utils/*": "./src/utils/*.js",
    "#config": "./src/config/index.js"
  }
}
```

```typescript
// ❌ Fails to resolve
import { helper } from '#utils/math';
```

**Proposed Rule**: `no-unresolved` enhancement + new `enforce-subpath-imports` rule

---

#### A3. Conditional Exports Not Understood

**Severity**: High  
**Impact**: Environment-specific builds flagged incorrectly

```json
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs",
      "types": "./dist/types/index.d.ts",
      "browser": "./dist/browser/index.js",
      "node": "./dist/node/index.js"
    }
  }
}
```

**Proposed Enhancement**: Conditional-aware resolution with environment hints

---

### 🟠 Category B: TypeScript Integration Gaps

#### B1. TypeScript `paths` / Bundler Alias Desync

**Severity**: High  
**Impact**: "Works in IDE, fails in ESLint" confusion

The "Two-Config Problem": TypeScript, Vite, and ESLint each need separate alias configuration that must stay in sync.

```typescript
// tsconfig.json
{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }

// vite.config.ts
resolve: { alias: { '@': path.resolve(__dirname, 'src') } }

// eslint.config.js — ALSO needs configuration!
settings: { 'import/resolver': { typescript: { project: './tsconfig.json' } } }
```

**Proposed Rule**: `enforce-alias-consistency` — Detect tsconfig/bundler/eslint mismatches

---

#### B2. `moduleResolution: bundler` Not Fully Understood

**Severity**: Medium  
**Impact**: Modern TypeScript projects get false positives

TypeScript 5.0+ introduced `moduleResolution: "bundler"` which allows omitting extensions. Current resolver logic doesn't fully support this.

**Proposed Enhancement**: First-class `bundler` moduleResolution support

---

### 🟡 Category C: Bundler & Performance Gaps

#### C1. Barrel File Detection (CRITICAL)

**Severity**: Critical  
**Impact**: 75% build time reduction possible (Atlassian case study)

Barrel files (`index.ts` that re-exports everything) destroy:

- **Tree-shaking**: Bundlers can't determine unused exports
- **Build times**: Up to 75% slower (Atlassian Jira case study)
- **Test times**: Jest loads all modules even when testing one
- **ESLint performance**: `no-cycle` must traverse entire barrel

```typescript
// ❌ Anti-pattern: barrel file
// src/components/index.ts
export * from './Button';
export * from './Modal';
export * from './Table';
// ... 50 more exports

// ❌ Consumer imports single component but loads ALL
import { Button } from '@/components';
```

**Proposed Rules**:

- `no-barrel-file` — Flag creation of barrel files
- `no-barrel-deep-import` — Flag imports from barrels (prefer direct)
- `prefer-direct-import` — Suggest `import { Button } from '@/components/Button'`

---

#### C2. Tree-Shaking Guidance

**Severity**: High  
**Impact**: Larger bundles, slower apps

```typescript
// ❌ Imports entire library (not tree-shakeable)
import _ from 'lodash';
import * as MUI from '@mui/material';

// ✅ Tree-shakeable
import debounce from 'lodash/debounce';
import { Button } from '@mui/material/Button';
```

**Proposed Rules**:

- `prefer-tree-shakeable-imports` — Detect namespace/default imports from known large packages
- `no-full-package-import` — Configurable blocklist of packages that should use subpath imports

---

#### C3. Dynamic Import Chunk Optimization

**Severity**: Medium  
**Impact**: Suboptimal code splitting

```typescript
// ❌ Missing chunk annotation = random hash chunk name
const Dashboard = lazy(() => import('./Dashboard'));

// ✅ Named chunk for better debugging & caching
const Dashboard = lazy(
  () => import(/* webpackChunkName: "dashboard" */ './Dashboard'),
);
```

**Proposed Enhancement**: Extend `dynamic-import-chunkname` with:

- Vite `import.meta.glob` patterns
- Rollup-specific annotations
- Next.js dynamic() function

---

### 🔵 Category D: Framework-Specific Gaps

#### D1. Next.js App Router: Server/Client Boundary Enforcement

**Severity**: Critical for Next.js users  
**Impact**: Runtime errors in production

Next.js App Router requires explicit `'use client'` or `'use server'` directives. Violations cause cryptic runtime errors.

```typescript
// ❌ Server Component importing client code
// app/page.tsx (Server Component by default)
import { useState } from 'react'; // ❌ Runtime error!

// ❌ Client Component importing server-only code
// app/ClientDashboard.tsx
('use client');
import { db } from '@/lib/database'; // ❌ Leaks server secrets!
```

**Proposed Rules**:

- `enforce-use-client` — Require `'use client'` when using hooks/browser APIs
- `enforce-use-server` — Require `'use server'` for Server Actions
- `no-server-import-in-client` — Prevent importing `server-only` modules in client components
- `no-client-import-in-server` — Prevent importing `client-only` modules in server components

---

#### D2. SSR Boundary Detection (Generic)

**Severity**: High  
**Impact**: SSR hydration mismatches

```typescript
// ❌ SSR-unsafe: window doesn't exist on server
export const config = {
  theme: window.localStorage.getItem('theme') || 'dark',
};
```

**Proposed Rules**:

- `no-ssr-unsafe-globals` — Detect `window`, `document`, `localStorage` in non-client code
- `require-ssr-guard` — Require `typeof window !== 'undefined'` checks

---

### 🟣 Category E: Monorepo & Enterprise Gaps

#### E1. `no-unused-modules` Broken in Monorepos

**Severity**: High (monorepo users)  
**Impact**: False positives on internal package exports

The `import/no-unused-modules` rule reports internal package exports as "unused" even when consumed by sibling packages.

```
packages/
├── shared/
│   └── utils.ts  ← Exports flagged as "unused"
└── app/
    └── main.ts   ← Imports from @monorepo/shared
```

**Proposed Enhancement**: Workspace-aware `no-unused-modules` that understands npm/npm/Yarn workspaces

---

#### E2. Cross-Package Boundary Enforcement

**Severity**: Medium  
**Impact**: Accidental tight coupling between packages

**Proposed Rules** (Phase 4):

- `enforce-team-boundaries` — Prevent unauthorized cross-team imports
- `require-import-approval` — Require explicit allowlist for external packages
- `enforce-approved-registry` — Limit imports to internal/verified registries

---

#### E3. Migration & Deprecation Tracking

**Severity**: Medium  
**Impact**: Technical debt accumulation

**Proposed Rules** (Phase 4):

- `no-legacy-imports` — Detect imports from deprecated internal paths
- `prefer-modern-api` — Suggest modern replacements (e.g., `date-fns` over `moment`)
- `require-migration-annotations` — Enforce TODO/FIXME markers for legacy imports

---

## Part 3: Proposed Roadmap (2025-2027)

### Phase 1: Module Resolution Revolution (Q1-Q2 2025)

**Theme**: "Stop the false positives"

| Rule                        | Type        | Priority | Description                                |
| --------------------------- | ----------- | :------: | ------------------------------------------ |
| `no-unresolved` v2          | Enhancement |  🔴 P0   | Native `exports` + `imports` field support |
| `enforce-alias-consistency` | New         |  🟠 P1   | Detect tsconfig/bundler config mismatches  |
| `enforce-subpath-imports`   | New         |  🟡 P2   | Encourage `#imports` usage                 |

**Resolver Rewrite**:

- Built-in support for package.json `exports` (no external resolver needed)
- Built-in support for package.json `imports` (subpath imports)
- Conditional exports aware (import/require/types/browser/node)
- TypeScript `moduleResolution: bundler` support

---

### Phase 2: Bundle Optimization Suite (Q2-Q3 2025)

**Theme**: "Make bundles smaller, builds faster"

| Rule                            | Type | Priority | Description                       |
| ------------------------------- | ---- | :------: | --------------------------------- |
| `no-barrel-file`                | New  |  🔴 P0   | Prevent barrel file creation      |
| `no-barrel-import`              | New  |  🔴 P0   | Flag imports from barrel files    |
| `prefer-direct-import`          | New  |  🟠 P1   | Suggest direct paths with autofix |
| `prefer-tree-shakeable-imports` | New  |  🟠 P1   | Detect non-shakeable patterns     |
| `no-full-package-import`        | New  |  🟡 P2   | Block `import * from 'lodash'`    |

**Bundler Integration**:

- Vite plugin for shared analysis cache
- Rollup plugin for chunk optimization hints
- Next.js integration for `optimizePackageImports` alignment

---

### Phase 3: Framework Integration (Q3-Q4 2025)

**Theme**: "First-class support for modern frameworks"

| Rule                         | Type | Priority | Description                                   |
| ---------------------------- | ---- | :------: | --------------------------------------------- |
| `enforce-use-client`         | New  |  🔴 P0   | Next.js: require directive when using hooks   |
| `enforce-use-server`         | New  |  🔴 P0   | Next.js: require directive for Server Actions |
| `no-server-import-in-client` | New  |  🔴 P0   | Prevent `server-only` in client code          |
| `no-client-import-in-server` | New  |  🟠 P1   | Prevent `client-only` in server code          |
| `no-ssr-unsafe-globals`      | New  |  🟠 P1   | Detect `window`/`document` in SSR code        |
| `require-ssr-guard`          | New  |  🟡 P2   | Require runtime environment checks            |

**Framework Presets**:

- `presets.nextjs-app-router` — All App Router rules
- `presets.remix` — Remix-specific boundaries
- `presets.nuxt` — Nuxt 3 server/client rules
- `presets.astro` — Astro island architecture rules

---

### Phase 4: Enterprise Governance (2026)

**Theme**: "Scale to 1000+ developers"

| Rule                        | Type        | Priority | Description                         |
| --------------------------- | ----------- | :------: | ----------------------------------- |
| `no-unused-modules` v2      | Enhancement |  🔴 P0   | Workspace-aware dead code detection |
| `enforce-team-boundaries`   | New         |  🟠 P1   | Prevent cross-team coupling         |
| `require-import-approval`   | New         |  🟡 P2   | Package allowlist enforcement       |
| `enforce-approved-registry` | New         |  🟡 P2   | Internal registry enforcement       |
| `no-legacy-imports`         | New         |  🟡 P2   | Deprecation path tracking           |
| `prefer-modern-api`         | New         |  🟢 P3   | Library migration suggestions       |

---

### Phase 5: AI-Native Evolution (2026-2027)

**Theme**: "The first ESLint plugin designed for AI agents"

| Feature                              | Description                                                                |
| ------------------------------------ | -------------------------------------------------------------------------- |
| **Semantic Import Analysis**         | Understand _why_ an import exists (data, logic, type, style)               |
| **Refactoring Suggestions**          | "This file has 47 dependencies. Consider extracting X to reduce coupling." |
| **Auto-generated Architecture Docs** | Generate dependency diagrams from import analysis                          |
| **MCP Tool Integration**             | Expose import graph as structured data for AI agents                       |

---

## Part 4: Competitive Positioning

| Feature                | eslint-plugin-import | eslint-plugin-import-x | **import-next** |
| ---------------------- | :------------------: | :--------------------: | :-------------: |
| ESLint 9 flat config   |      ⚠️ Partial      |           ✅           |       ✅        |
| `no-cycle` performance |       ❌ Slow        |       ⚠️ Better        |  ✅ 8x faster   |
| package.json `exports` |          ❌          |     ⚠️ v5 planned      |   ✅ Phase 1    |
| Subpath `imports`      |          ❌          |     ⚠️ v5 planned      |   ✅ Phase 1    |
| Barrel file detection  |          ❌          |           ❌           |   ✅ Phase 2    |
| Next.js App Router     |          ❌          |           ❌           |   ✅ Phase 3    |
| Monorepo workspaces    |      ⚠️ Issues       |       ⚠️ Better        |   ✅ Phase 4    |
| AI-native messages     |          ❌          |           ❌           |     ✅ Now      |

---

## Part 5: TSC vs ESLint — Value Differentiation

> **Principle**: We do NOT duplicate TypeScript compiler functionality. Every rule must provide value that `tsc` cannot.

### What TSC Already Handles (We Don't Compete)

| Concern                  | TSC Capability                         | Our Position                             |
| ------------------------ | -------------------------------------- | ---------------------------------------- |
| Import resolution errors | ✅ `Cannot find module 'X'`            | ❌ **Don't duplicate** — TSC does this   |
| Named export validation  | ✅ `Module has no exported member 'Y'` | ❌ **Don't duplicate** — TSC does this   |
| Type-only imports        | ✅ `--verbatimModuleSyntax` enforces   | ⚠️ **Complement only** for JS projects   |
| Extension requirements   | ✅ `moduleResolution: nodenext`        | ⚠️ **Complement only** for bundler users |

### Where ESLint Provides Unique Value

| Category                       | Why TSC Can't Do This                              | Our Rules                                                                            |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Architectural Enforcement**  | TSC has no concept of "layers" or "domains"        | `enforce-dependency-direction`, `no-cross-domain-imports`, `enforce-team-boundaries` |
| **Performance Optimization**   | TSC doesn't know about bundle size or tree-shaking | `no-barrel-file`, `prefer-tree-shakeable-imports`, `no-full-package-import`          |
| **Runtime Environment Safety** | TSC doesn't distinguish server/client contexts     | `enforce-use-client`, `no-server-import-in-client`, `no-ssr-unsafe-globals`          |
| **Convention Enforcement**     | TSC allows anything syntactically valid            | `enforce-import-order`, `no-duplicates`, `prefer-node-protocol`                      |
| **Codebase Hygiene**           | TSC can't detect "unused" exports across workspace | `no-unused-modules` (workspace-aware), `no-deprecated`                               |
| **Circular Dependencies**      | TSC allows circular imports (they're valid JS/TS)  | `no-cycle` — TSC will compile cycles but they cause runtime issues                   |

### Proposed Rules — TSC Overlap Analysis

| Proposed Rule                   | TSC Can Do? | Our Value-Add                                                    |
| ------------------------------- | :---------: | ---------------------------------------------------------------- |
| `no-barrel-file`                |     ❌      | **Performance** — TSC has no concept of "barrel" anti-pattern    |
| `no-barrel-import`              |     ❌      | **Performance** — Guides developers to direct imports            |
| `prefer-tree-shakeable-imports` |     ❌      | **Performance** — TSC doesn't understand bundler optimization    |
| `enforce-use-client`            |     ❌      | **Runtime Safety** — Next.js directive enforcement               |
| `enforce-use-server`            |     ❌      | **Runtime Safety** — TSC can't know server boundaries            |
| `no-ssr-unsafe-globals`         |     ❌      | **Runtime Safety** — `window` is valid TS, but crashes in SSR    |
| `enforce-alias-consistency`     |     ❌      | **DX** — Cross-tool config validation (tsconfig/vite/eslint)     |
| `enforce-subpath-imports`       | ⚠️ Partial  | **Convention** — TSC validates, we _encourage_ the pattern       |
| `no-unresolved` v2              | ⚠️ Partial  | **Flexibility** — Works without `tsc`, supports custom resolvers |

### Rules We Should Reconsider

Based on this analysis, these Phase 1 items need careful positioning:

1. **`no-unresolved`** — For TypeScript projects with strict settings, TSC already errors. Our value:
   - Works for pure JavaScript projects
   - Supports custom resolver configurations (monorepos, aliases)
   - Provides better error messages with fix suggestions

2. **`enforce-subpath-imports`** — TSC validates syntax, but we add:
   - Convention enforcement (encourage `#` imports over relative paths)
   - Autofix capabilities

**Recommendation**: Focus Phase 1 on **resolver improvements** (better monorepo support, bundler mode), not duplicating basic resolution validation.

---

## Contributing

We welcome contributions! If you'd like to help implement any of the rules or features in this roadmap:

1. Check the [Issues](https://github.com/ofri-peretz/eslint/issues) for existing discussions
2. Open a new issue to discuss your implementation approach
3. Submit a PR referencing the relevant phase and rule

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
