# Plugin Rule Classification Guide

> **Purpose**: Canonical reference for understanding where ESLint rules belong in the Interlace plugin ecosystem.

---

## 🎯 Core Principle: Full Isolation Policy

Each plugin owns a **specific domain, environment, or framework**. Rules should never overlap _within_ a single plugin category. However, rules with the **same conceptual name** MAY appear in multiple framework-specific plugins when their implementations are fundamentally different.

---

## 📊 Classification Hierarchy

Rules are placed using this priority order:

```
1. FRAMEWORK-SPECIFIC → Library Plugin (React, Express, NestJS, Lambda)
2. DOMAIN-SPECIFIC    → Technical Plugin (JWT, MongoDB, PostgreSQL, AI)
3. ENVIRONMENT        → Runtime Plugin (Node, Browser)
4. PURE LOGIC         → secure-coding (if security) or Quality Suite (if not)
```

### The Litmus Test

Before placing a rule, ask:

> _"Would this rule fire correctly in a CLI tool, a React app, AND a NestJS server without false positives?"_

- **YES** → `secure-coding` (universal)
- **NO** → Place in the appropriate specialized plugin

---

## 🔄 Expected Duplication: Framework-Specific Rules

### Why Duplication is Correct

Some security concepts apply across multiple frameworks, but their **detection patterns are framework-specific**. In these cases, having separate rule implementations is the **correct design**.

| Concept                      | Plugin             | Implementation Difference                            |
| :--------------------------- | :----------------- | :--------------------------------------------------- |
| `no-exposed-debug-endpoints` | `express-security` | Detects Express routes like `app.get('/debug', ...)` |
| `no-exposed-debug-endpoints` | `lambda-security`  | Detects Lambda handler responses with debug data     |
| `no-exposed-debug-endpoints` | `nestjs-security`  | Detects `@Get('/debug')` decorators                  |

### When Duplication is Correct

✅ **Different AST patterns** — The rules detect different code structures  
✅ **Framework-specific APIs** — Each rule targets that framework's conventions  
✅ **No overlapping detection** — A single codebase won't trigger both rules

### When Duplication is a Violation

❌ **Same AST patterns** — If two rules detect identical code constructs  
❌ **Environment-agnostic logic** — If the rule doesn't need framework context  
❌ **User confusion** — If enabling multiple plugins causes duplicate warnings on the same line

---

## 🗂️ Plugin Categories

### Security Suite

| Plugin               | Scope                        | Key APIs/Patterns                                            |
| :------------------- | :--------------------------- | :----------------------------------------------------------- |
| `secure-coding`      | **Universal logic flaws**    | Regex, object injection, credentials, sanitization           |
| `node-security`      | **Node.js runtime APIs**     | `fs`, `child_process`, `path`, `node:crypto`, `process`      |
| `browser-security`   | **Browser APIs**             | `window`, `document`, `localStorage`, `postMessage`, `fetch` |
| `lambda-security`    | **AWS Lambda/Serverless**    | Handler signatures, API Gateway events, IAM, CloudWatch      |
| `express-security`   | **Express.js framework**     | Middleware, Helmet, body-parser, sessions, CORS              |
| `nestjs-security`    | **NestJS framework**         | Guards, Pipes, Decorators, DTOs, Throttler                   |
| `jwt`                | **JWT token handling**       | `jwt.sign()`, `jwt.verify()`, `jwt.decode()`, claims         |
| `mongodb-security`   | **MongoDB/Mongoose**         | `$where`, `allowDiskUse`, schema validation                  |
| `pg`                 | **PostgreSQL/node-postgres** | Parameterized queries, SSL config, connection strings        |
| `vercel-ai-security` | **AI/LLM libraries**         | Prompt injection, tool authorization, streaming              |

### Quality & Governance Suite

| Plugin            | Scope                    | Focus                                    |
| :---------------- | :----------------------- | :--------------------------------------- |
| `maintainability` | **Clean code**           | Complexity, readability, cognitive load  |
| `reliability`     | **Stability**            | Error handling, type safety, null checks |
| `operability`     | **Production readiness** | Logging, resource limits, timeouts       |
| `conventions`     | **Team standards**       | Naming, file structure, code style       |
| `import-next`     | **Module logistics**     | Circular deps, ESM/CJS, import order     |
| `react-features`  | **React patterns**       | Hooks, re-renders, memoization           |
| `react-a11y`      | **React accessibility**  | ARIA, focus management, WCAG compliance  |
| `modularity`      | **Architecture (WIP)**   | DDD, layer isolation, API design         |
| `modernization`   | **ES evolution (WIP)**   | ES2022+, modern syntax                   |

---

## 🧭 Decision Flowchart

```
┌─────────────────────────────────────┐
│          NEW RULE CONCEPT           │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Does it require a specific         │
│  framework's AST patterns?          │
│  (React, Express, NestJS, etc.)     │
└───────────────┬─────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
      YES               NO
       │                 │
       ▼                 ▼
┌──────────────┐   ┌─────────────────────────────┐
│  Framework   │   │  Does it require specific   │
│  Plugin      │   │  domain knowledge?          │
│              │   │  (JWT, MongoDB, AI, etc.)   │
└──────────────┘   └───────────────┬─────────────┘
                                   │
                          ┌────────┴────────┐
                          │                 │
                         YES               NO
                          │                 │
                          ▼                 ▼
                   ┌──────────────┐   ┌─────────────────────────────┐
                   │  Domain      │   │  Does it require specific   │
                   │  Plugin      │   │  runtime APIs?              │
                   │              │   │  (fs, window, etc.)         │
                   └──────────────┘   └───────────────┬─────────────┘
                                                      │
                                             ┌────────┴────────┐
                                             │                 │
                                            YES               NO
                                             │                 │
                                             ▼                 ▼
                                      ┌──────────────┐   ┌─────────────────┐
                                      │  Environment │   │  Universal      │
                                      │  Plugin      │   │  (secure-coding │
                                      │  (node/      │   │   or Quality)   │
                                      │   browser)   │   │                 │
                                      └──────────────┘   └─────────────────┘
```

---

## 📝 Examples

### Example 1: CORS Misconfiguration

| Context                     | Rule Location      | Why                                        |
| :-------------------------- | :----------------- | :----------------------------------------- |
| Express `cors()` middleware | `express-security` | Uses `cors` npm package                    |
| Lambda API Gateway response | `lambda-security`  | Uses `Access-Control-*` headers in handler |
| Browser `fetch()` requests  | `browser-security` | Client-side CORS behavior                  |

👉 **Three separate rules**, one per context. Not violations.

### Example 2: Hardcoded Credentials

| Context                       | Rule Location   | Why                                |
| :---------------------------- | :-------------- | :--------------------------------- |
| `const password = "admin123"` | `secure-coding` | Universal pattern, no API required |

👉 **One rule**, because the pattern is environment-agnostic.

### Example 3: SQL Injection

| Context             | Rule Location   | Why                                      |
| :------------------ | :-------------- | :--------------------------------------- |
| PostgreSQL queries  | `pg`            | Detects `client.query()` patterns        |
| Generic SQL strings | ❌ Not Possible | Cannot detect without knowing the driver |

👉 **Database-specific only**. No generic `no-sql-injection` rule in `secure-coding`.

---

## ⚠️ Common Mistakes

### ❌ Putting Browser APIs in `secure-coding`

```typescript
// WRONG: localStorage is browser-only
// Rule: no-client-side-auth-logic → should be in browser-security
if (localStorage.getItem('isAdmin')) { ... }
```

### ❌ Putting Universal Logic in Runtime Plugins

```typescript
// WRONG: Object injection is universal
// Rule: detect-object-injection → should be in secure-coding
const value = obj[userInput];
```

### ❌ Putting Framework Rules in Generic Plugins

```typescript
// WRONG: Helmet is Express-specific
// Rule: require-helmet → should be in express-security
app.use(helmet());
```

---

## 🔗 Related Documents

- [Plugin Classification Graph](./plugin-classification-graph.md) — Full scope definitions with Mermaid diagrams
- [Plugin Scope Violation Audit](./reports/plugin-scope-violation-audit.md) — Completed and pending migrations

---

_Last Updated: January 25, 2026_
