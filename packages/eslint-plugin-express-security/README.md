# eslint-plugin-express-security

> 🔐 Security-focused ESLint plugin for Express.js applications. Detects CORS vulnerabilities, CSRF issues, insecure cookies, missing security headers, and rate limiting gaps with AI-optimized fix guidance.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-express-security.svg)](https://www.npmjs.com/package/eslint-plugin-express-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-express-security.svg)](https://www.npmjs.com/package/eslint-plugin-express-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=express_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=express_security)

> **Express-first security:** This plugin provides comprehensive security rules for **Express.js** applications.
> With **8 security rules** mapped to OWASP Top 10, CWE and CVSS, it transforms your linter into an Express security auditor that AI assistants can understand and fix.

---

## 💡 What you get

- **Express-focused coverage:** 8 rules targeting Express-specific vulnerabilities (CORS, CSRF, cookies, headers, rate limiting).
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Standards aligned:** OWASP Top 10 Web 2021, CWE tagging, CVSS scoring in every finding for compliance mapping.
- **Tiered presets:** `recommended`, `strict`, `api`, `graphql` for fast policy rollout.
- **Middleware-aware:** Detects helmet, cors, csurf, express-rate-limit, body-parser patterns.
- **Low false positive rate:** Context-aware detection with production heuristics.

Every security rule produces a **structured 2-line error message**:

```bash
src/app.ts
  18:5   error  🔒 CWE-942 OWASP:A05 CVSS:9.1 | Permissive CORS with wildcard origin | CRITICAL [SOC2,PCI-DSS]
                    Fix: Specify allowed origins: cors({ origin: ['https://your-app.com'] }) | https://owasp.org/...
```

**Each message includes:**

- 🔒 **CWE reference** - vulnerability classification
- 📋 **OWASP category** - Top 10 mapping
- 📊 **CVSS score** - severity rating (0.0-10.0)
- 🏢 **Compliance tags** - affected frameworks (SOC2, PCI-DSS, HIPAA)
- ✅ **Fix instruction** - exact code to write
- 📚 **Documentation link** - learn more

---

## 📊 OWASP Top 10 Coverage Matrix

| OWASP Category                | Coverage | Rules                                                                                                                                 |
| ----------------------------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| **A01:2021** Access Control   |    ✅    | `no-graphql-introspection-production`                                                                                                 |
| **A03:2021** Injection        |    ✅    | `no-express-unsafe-regex-route` (ReDoS)                                                                                               |
| **A05:2021** Misconfiguration |    ✅    | `require-helmet`, `no-permissive-cors`, `no-cors-credentials-wildcard`, `require-rate-limiting`, `require-express-body-parser-limits` |
| **A07:2021** Auth/Session     |    ✅    | `require-csrf-protection`, `no-insecure-cookie-options`                                                                               |

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

---

## 🔐 8 Security Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

### Headers & CORS (4 rules)

| Rule                                                                      | CWE     | OWASP | CVSS | Description                            | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------- | ------- | ----- | ---- | -------------------------------------- | --- | --- | --- | --- |
| [require-helmet](#require-helmet)                                         | CWE-693 | A05   | 7.1  | Require helmet() middleware            | 💼  |     |     |     |
| [no-permissive-cors](#no-permissive-cors)                                 | CWE-942 | A05   | 9.1  | Detect wildcard CORS origins           | 💼  |     |     |     |
| [no-cors-credentials-wildcard](#no-cors-credentials-wildcard)             | CWE-942 | A05   | 9.1  | Block credentials: true + origin: "\*" | 💼  |     |     |     |
| [require-express-body-parser-limits](#require-express-body-parser-limits) | CWE-770 | A05   | 7.5  | Require body parser size limits        |     | ⚠️  |     |     |

### CSRF & Cookies (2 rules)

| Rule                                                      | CWE     | OWASP | CVSS | Description                    | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------- | ------- | ----- | ---- | ------------------------------ | --- | --- | --- | --- |
| [require-csrf-protection](#require-csrf-protection)       | CWE-352 | A07   | 8.8  | Require CSRF middleware        |     | ⚠️  |     |     |
| [no-insecure-cookie-options](#no-insecure-cookie-options) | CWE-614 | A07   | 5.3  | Detect missing Secure/HttpOnly | 💼  |     |     |     |

### Rate Limiting & DoS (2 rules)

| Rule                                                            | CWE      | OWASP | CVSS | Description                      | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------- | -------- | ----- | ---- | -------------------------------- | --- | --- | --- | --- |
| [require-rate-limiting](#require-rate-limiting)                 | CWE-770  | A05   | 7.5  | Require rate limiting middleware |     | ⚠️  |     |     |
| [no-express-unsafe-regex-route](#no-express-unsafe-regex-route) | CWE-1333 | A03   | 7.5  | Detect ReDoS in route patterns   | 💼  |     |     |     |

### GraphQL (1 rule)

| Rule                                                                        | CWE     | OWASP | CVSS | Description                           | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------------------- | ------- | ----- | ---- | ------------------------------------- | --- | --- | --- | --- |
| [no-graphql-introspection-production](#no-graphql-introspection-production) | CWE-200 | A01   | 5.3  | Disable GraphQL introspection in prod |     | ⚠️  |     |     |

---

## 🔍 Rule Details

### `require-helmet`

Requires helmet() middleware for security headers.

**❌ Incorrect**

```javascript
const app = express();
app.get('/', handler); // No helmet middleware
```

**✅ Correct**

```javascript
import helmet from 'helmet';

const app = express();
app.use(helmet()); // Adds 11+ security headers
app.get('/', handler);
```

---

### `no-permissive-cors`

Detects wildcard CORS configuration that allows any origin.

**❌ Incorrect**

```javascript
app.use(cors({ origin: '*' }));
app.use(cors()); // Defaults to '*'
```

**✅ Correct**

```javascript
app.use(
  cors({
    origin: ['https://your-app.com', 'https://admin.your-app.com'],
  }),
);

// Or use dynamic validation
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  }),
);
```

---

### `no-cors-credentials-wildcard`

Blocks the dangerous combination of `credentials: true` with wildcard origins.

**❌ Incorrect**

```javascript
// CRITICAL: This exposes credentials to any origin!
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
```

**✅ Correct**

```javascript
app.use(
  cors({
    origin: 'https://your-app.com',
    credentials: true,
  }),
);
```

---

### `require-csrf-protection`

Requires CSRF protection middleware for state-changing routes.

**❌ Incorrect**

```javascript
app.post('/api/transfer', handler); // No CSRF protection
```

**✅ Correct**

```javascript
import csurf from 'csurf';

app.use(csurf({ cookie: true }));
app.post('/api/transfer', handler);
```

---

### `no-insecure-cookie-options`

Detects cookies missing Secure, HttpOnly, or SameSite attributes.

**❌ Incorrect**

```javascript
res.cookie('session', token); // Missing security attributes
```

**✅ Correct**

```javascript
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});
```

---

### `require-rate-limiting`

Requires rate limiting middleware to prevent DoS attacks.

**❌ Incorrect**

```javascript
app.post('/api/login', handler); // No rate limiting
```

**✅ Correct**

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
app.post('/api/login', handler);
```

---

### `require-express-body-parser-limits`

Requires size limits on body parser to prevent DoS via large payloads.

**❌ Incorrect**

```javascript
app.use(express.json()); // No size limit
```

**✅ Correct**

```javascript
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));
```

---

### `no-express-unsafe-regex-route`

Detects ReDoS-vulnerable regex patterns in Express routes.

**❌ Incorrect**

```javascript
// Catastrophic backtracking possible
app.get('/api/:id(\\d+)+', handler);
app.get(/^\/user\/(.*)$/, handler);
```

**✅ Correct**

```javascript
app.get('/api/:id(\\d{1,10})', handler); // Bounded
app.get('/user/:userId', handler); // Named parameter
```

---

### `no-graphql-introspection-production`

Disables GraphQL introspection queries in production.

**❌ Incorrect**

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // Exposes schema in production
});
```

**✅ Correct**

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});
```

---

## 🚀 Quick Start

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [
  expressSecurity.configs.recommended,
  // ... other configs
];
```

### Strict Mode

```javascript
import expressSecurity from 'eslint-plugin-express-security';

export default [expressSecurity.configs.strict];
```

---

## 📋 Available Presets

| Preset            | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| **`recommended`** | Balanced security for Express projects (critical as error, others warn) |
| **`strict`**      | Maximum security enforcement (all rules as errors)                      |
| **`api`**         | HTTP/API security rules only (CORS, CSRF, cookies, rate limiting)       |
| **`graphql`**     | GraphQL-specific security rules only                                    |

---

## 🏢 Enterprise Integration Example

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [
  // Baseline for all Express apps
  expressSecurity.configs.recommended,

  // Strict mode for payment/auth services
  {
    files: ['services/payments/**', 'services/auth/**'],
    ...expressSecurity.configs.strict,
  },

  // GraphQL security for GraphQL servers
  {
    files: ['services/graphql/**'],
    ...expressSecurity.configs.graphql,
  },
];
```

---

## 🤖 LLM & AI Integration

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## 🔗 Related ESLint Plugins

Part of the **Forge-JS ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Description                                                                | Rules |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           | Framework-agnostic security (OWASP Web + Mobile Top 10)                    |  78   |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       | AWS Lambda/Middy security (API Gateway, headers, validation)               |   5   |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       | NestJS security (guards, validation pipes, throttler)                      |  🔜   |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               | JWT security (algorithm confusion, weak secrets, claims validation)        |  13   |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         | Cryptographic best practices (weak algorithms, key handling, CVE-specific) |  24   |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 | PostgreSQL/node-postgres security and best practices                       |  13   |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security (OWASP LLM + Agentic Top 10)                        |  19   |

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
