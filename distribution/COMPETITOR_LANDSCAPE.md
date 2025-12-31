# 🔍 JavaScript/TypeScript Linter Competitor Landscape

> **Purpose**: Strategic analysis of the open-source linter ecosystem for positioning the Interlace ESLint plugin ecosystem. Updated December 2025.

---

## 📊 Executive Summary

| Tool              | Language   | Speed vs ESLint | Rules     | Ecosystem  | Best For               |
| ----------------- | ---------- | --------------- | --------- | ---------- | ---------------------- |
| **ESLint**        | JavaScript | 1x (baseline)   | 300+ core | 🏆 Largest | Customization, plugins |
| **Biome**         | Rust       | 10-25x faster   | 400+      | Growing    | All-in-one toolchain   |
| **Oxlint**        | Rust       | 50-100x faster  | 400+      | Limited    | Pure speed, CI         |
| **Deno Lint**     | Rust       | 20-50x faster   | 100+      | Deno only  | Deno projects          |
| **RSLint**        | Rust       | ~10x faster     | ~50       | Minimal    | Research/experimental  |
| **quick-lint-js** | C++        | ~100x faster    | ~50       | Minimal    | Editor integration     |

---

## 1. ESLint (The Incumbent)

### Overview

- **Created**: 2013 by Nicholas C. Zakas
- **Language**: JavaScript/Node.js
- **GitHub Stars**: ~25k
- **Weekly Downloads**: ~45M+ (npm)
- **License**: MIT

### Strengths

| Strength               | Details                              |
| ---------------------- | ------------------------------------ |
| **Plugin Ecosystem**   | 10,000+ plugins available            |
| **Customization**      | Infinitely configurable rules        |
| **TypeScript Support** | First-class via `@typescript-eslint` |
| **Community**          | Largest, most mature community       |
| **Flat Config (v9+)**  | Modern configuration system          |
| **Language Expansion** | Now supports CSS, JSON, Markdown     |
| **Type-Checked Rules** | Deepest type-aware linting           |

### Weaknesses

| Weakness              | Impact                         |
| --------------------- | ------------------------------ |
| **Performance**       | Slowest of all linters         |
| **Memory Usage**      | Can OOM on large monorepos     |
| **Config Complexity** | Plugin conflicts, version hell |
| **Cold Start**        | Slow initialization            |

### Key Pain Points (Opportunity Areas)

```
📌 Top GitHub Issues:
- "import/no-cycle takes 70% of lint time" (#2182)
- "OOM checking circular dependencies"
- "Minutes to lint a monorepo"
- "Flat config migration is painful"
```

### Our Positioning vs ESLint

```
eslint-plugin-import-next targets ESLint users who:
✅ Want ESLint's flexibility + modern performance
✅ Need drop-in replacement compatibility
✅ Require type-aware rules (TypeScript)
✅ Value AI-ready error messages
```

---

## 2. Biome (The All-in-One)

### Overview

- **Created**: 2023 (fork of Rome Tools)
- **Language**: Rust
- **GitHub Stars**: ~15k
- **Weekly Downloads**: ~1.5M+ (npm)
- **License**: MIT
- **Backed by**: Community-driven

### Architecture

```
┌─────────────────────────────────────────┐
│              Biome                       │
├──────────┬──────────┬──────────┬────────┤
│ Linter   │ Formatter│ Bundler* │ Minify*│
└──────────┴──────────┴──────────┴────────┘
* = Planned/In Development
```

### Strengths

| Strength                   | Details                                  |
| -------------------------- | ---------------------------------------- |
| **Speed**                  | 10-25x faster than ESLint + Prettier     |
| **Unified Tooling**        | Replaces ESLint + Prettier in one binary |
| **Zero Config**            | Works out of the box                     |
| **Prettier Compatibility** | ~97% output match                        |
| **Multi-language**         | JS, TS, JSX, JSON, CSS, GraphQL          |
| **Enterprise Adoption**    | Vercel, Sentry, Discord                  |

### Weaknesses

| Weakness                 | Impact                             |
| ------------------------ | ---------------------------------- |
| **Smaller Rule Set**     | ~400 rules vs ESLint's ecosystem   |
| **No Plugin System**     | Cannot extend with custom rules    |
| **Type-Checked Linting** | Less robust than typescript-eslint |
| **Ecosystem Lock-in**    | All-or-nothing adoption            |

### Market Position

- **Target**: Teams tired of ESLint + Prettier config complexity
- **Pitch**: "One fast tool to replace them all"
- **Threat Level**: 🟡 Medium (different philosophy)

### Our Differentiation

```
Biome users CANNOT:
❌ Add specialized security rules (CWE, OWASP)
❌ Use framework-specific plugins (NestJS, Express)
❌ Get AI-native remediation messages
❌ Gradually adopt - it's all or nothing

Our plugins work WITH ESLint for:
✅ Incremental adoption
✅ Specialized domains (pg, JWT, Lambda)
✅ Agentic workflow integration
```

---

## 3. Oxlint (The Speed Demon)

### Overview

- **Created**: 2023 by Oxc team (Void Zero)
- **Language**: Rust
- **GitHub Stars**: ~12k
- **Backing**: Evan You (Vue.js creator)
- **License**: MIT
- **Status**: v1.0 stable (June 2025)

### Speed Benchmarks

```
┌─────────────────────────────────────────────────────┐
│ Linting 10,000 files                                │
├─────────────────────────────────────────────────────┤
│ ESLint:        45.0s  ████████████████████████████  │
│ Biome:          4.5s  ███                           │
│ Oxlint:         0.4s  ▏                             │
└─────────────────────────────────────────────────────┘
```

### Strengths

| Strength               | Details                         |
| ---------------------- | ------------------------------- |
| **Extreme Speed**      | 50-100x faster than ESLint      |
| **Zero Config**        | Sensible defaults               |
| **No node_modules**    | Single binary distribution      |
| **ESLint Rule Compat** | Implements popular ESLint rules |
| **Framework Support**  | React, Vue, Svelte, Astro       |
| **Enterprise Users**   | Shopify, Airbnb, Mercedes-Benz  |

### Weaknesses

| Weakness                  | Impact                                   |
| ------------------------- | ---------------------------------------- |
| **Linting Only**          | Still need Prettier/Biome for formatting |
| **No Custom Rules**       | Cannot write your own rules              |
| **Limited Plugin System** | JS plugins hurt performance              |
| **Autofix Experimental**  | Not production-ready                     |

### Market Position

- **Target**: Large monorepos with slow CI
- **Pitch**: "Make linting invisible again"
- **Threat Level**: 🟠 Medium-High (direct speed competition)

### Our Differentiation

```
Oxlint is FAST but SHALLOW:
❌ No security-focused rules (CWE, OWASP, CVSS)
❌ No database-specific rules (pg, SQL injection)
❌ No AI/ML rules (Vercel AI SDK)
❌ No custom rule development

Our plugins provide DEPTH:
✅ 89 security rules with compliance mapping
✅ 13 PostgreSQL-specific rules
✅ AI-native remediation for agents
✅ Domain expertise > raw speed
```

### Coexistence Strategy

```bash
# Recommended setup: Oxlint for speed + Our plugins for depth
{
  "scripts": {
    "lint:fast": "oxlint .",
    "lint:security": "eslint --config security.config.js .",
    "lint": "npm run lint:fast && npm run lint:security"
  }
}
```

---

## 4. Deno Lint (The Runtime Native)

### Overview

- **Created**: 2020 (part of Deno)
- **Language**: Rust
- **GitHub Stars**: Part of Deno (~95k)
- **License**: MIT
- **Distribution**: Built into `deno` CLI

### Strengths

| Strength                 | Details                         |
| ------------------------ | ------------------------------- |
| **No Install**           | Built into Deno runtime         |
| **Fast**                 | 20-50x faster than ESLint       |
| **Module Graph**         | Verifies import graphs          |
| **ESLint Plugin Compat** | New ESLint plugin system (2024) |

### Weaknesses

| Weakness               | Impact                             |
| ---------------------- | ---------------------------------- |
| **Deno Only**          | Doesn't work with Node.js projects |
| **Smaller Rule Set**   | ~100 rules                         |
| **Limited Ecosystem**  | Few third-party rules              |
| **No Stylistic Rules** | Defers to `deno fmt`               |

### Market Position

- **Target**: Deno users only
- **Pitch**: "Zero setup linting for Deno"
- **Threat Level**: 🟢 Low (different runtime)

---

## 5. Other Notable Linters

### quick-lint-js

| Attribute        | Value                                |
| ---------------- | ------------------------------------ |
| **Language**     | C++                                  |
| **Speed**        | ~100x faster than ESLint             |
| **Focus**        | Editor integration, instant feedback |
| **Rules**        | ~50 (basic syntax errors)            |
| **Threat Level** | 🟢 Low (complementary tool)          |

### RSLint

| Attribute        | Value                         |
| ---------------- | ----------------------------- |
| **Language**     | Rust                          |
| **Speed**        | ~10x faster than ESLint       |
| **Status**       | Experimental/Research         |
| **Rules**        | ~50                           |
| **Threat Level** | 🟢 Low (not production-ready) |

### Standard.js

| Attribute         | Value                           |
| ----------------- | ------------------------------- |
| **Built On**      | ESLint                          |
| **Philosophy**    | Zero-config, opinionated        |
| **Customization** | None (intentionally)            |
| **Threat Level**  | 🟢 Low (uses ESLint underneath) |

---

## 6. ESLint Plugin Competitors (Direct)

### Security Plugins

| Plugin                     | Rules | Maintenance  | Our Advantage                 |
| -------------------------- | ----- | ------------ | ----------------------------- |
| `eslint-plugin-security`   | 13    | ⚠️ Low       | 89 rules, OWASP mapping       |
| `eslint-plugin-no-secrets` | 3     | ⚠️ Low       | Integrated into secure-coding |
| `eslint-plugin-xss`        | 5     | ❌ Abandoned | CWE-79 full coverage          |

### Import/Module Plugins

| Plugin                              | Rules | Maintenance | Our Advantage                   |
| ----------------------------------- | ----- | ----------- | ------------------------------- |
| `eslint-plugin-import`              | 45    | ⚠️ Slow     | 100x faster, flat config native |
| `eslint-plugin-simple-import-sort`  | 2     | ✅ Active   | Broader rule coverage           |
| `eslint-import-resolver-typescript` | -     | ✅ Active   | Built-in to import-next         |

### React Plugins

| Plugin                      | Rules | Maintenance | Our Advantage              |
| --------------------------- | ----- | ----------- | -------------------------- |
| `eslint-plugin-react`       | 100+  | ✅ Active   | Complementary (a11y focus) |
| `eslint-plugin-jsx-a11y`    | 35    | ✅ Active   | AI-native messages         |
| `eslint-plugin-react-hooks` | 2     | ✅ Active   | Complementary              |

---

## 7. Competitive Strategy Matrix

### Feature Comparison

| Capability         | ESLint | Biome | Oxlint | Our Plugins     |
| ------------------ | ------ | ----- | ------ | --------------- |
| Speed              | ❌     | ✅    | ✅✅   | ⚠️ ESLint-bound |
| Custom Rules       | ✅     | ❌    | ❌     | ✅              |
| Plugin Ecosystem   | ✅✅   | ❌    | ❌     | ✅              |
| Type-Checked Rules | ✅     | ⚠️    | ❌     | ✅              |
| Security Focus     | ⚠️     | ⚠️    | ❌     | ✅✅            |
| OWASP/CWE Mapping  | ❌     | ❌    | ❌     | ✅✅            |
| AI-Native Messages | ❌     | ❌    | ❌     | ✅✅            |
| Zero Config        | ❌     | ✅    | ✅     | ⚠️ Presets      |

### Positioning Statement

```
While Rust-based linters compete on SPEED,
we compete on DEPTH and AI-READINESS.

Our plugins are the ONLY linters that:
1. Map every rule to CWE/OWASP/CVSS
2. Provide AI-agent-parseable remediation
3. Offer domain-specific expertise (pg, JWT, Lambda, AI)
4. Work within the existing ESLint ecosystem
```

---

## 8. Market Trends (2024-2026)

### Trend 1: Rust Tooling Revolution

```
2023: Biome launches
2024: Oxlint gains traction
2025: Oxlint 1.0, major enterprise adoption
2026: ESLint adds Rust-powered core? (speculation)
```

### Trend 2: AI-Native Development

```
2024: Cursor, Copilot mainstream
2025: MCP standardization
2026: Agents as primary code consumers

→ Our AI-native messaging becomes critical differentiator
```

### Trend 3: Security Shift-Left

```
2024: Supply chain attacks increase
2025: SOC2/PCI-DSS enforcement in startups
2026: Linting as compliance checkpoint

→ Our OWASP/CWE mapping becomes competitive advantage
```

### Trend 4: Consolidated Tooling

```
2024: "JavaScript fatigue" peaks
2025: Biome adoption accelerates
2026: All-in-one tools dominate new projects

→ We stay relevant via depth, not breadth
```

---

## 9. Strategic Recommendations

### Short-term (Q1 2025)

1. **Performance Benchmarks**: Publish `eslint-plugin-import-next` vs `eslint-plugin-import` benchmarks
2. **Coexistence Guide**: Document Oxlint + ESLint security plugins setup
3. **AI Messaging**: Finalize CWE/OWASP formatting for all rules

### Medium-term (Q2-Q3 2025)

1. **Biome Integration**: Explore Biome plugin system if/when available
2. **Security Badge Program**: "Secured by Interlace" badge for READMEs
3. **Enterprise Features**: SOC2/PCI-DSS compliance reports

### Long-term (2026+)

1. **Language Server**: Custom LSP for real-time security feedback
2. **Rust Core**: Consider Rust-based rule execution engine
3. **AI Agent SDK**: First-party MCP server for our plugins

---

## 📚 References

- [Biome Official](https://biomejs.dev)
- [Oxlint/Oxc](https://oxc.rs)
- [Deno Lint](https://deno.land/manual/tools/linter)
- [ESLint Official](https://eslint.org)
- [quick-lint-js](https://quick-lint-js.com)
- [BetterStack: State of JS Linters 2025](https://betterstack.com/community/guides/scaling-nodejs/best-javascript-linters/)

---

_Last updated: 2025-12-30_
