# Express & NestJS Security Plugins Implementation Plan

## Overview

Two dedicated security plugins for Express.js and NestJS frameworks, focusing on:

- Headers, Cookies, CORS, CSRF
- GraphQL security
- HTTP security best practices
- Caching policy enforcement
- Origin validation

**Design Principles:**

1. Stable rules that don't break on major upgrades
2. Shared rules with framework-specific matching
3. Framework-specific rules where needed
4. Following `eslint-plugin-secure-coding` structure exactly

---

## Security Research Summary

> Full research document: [web-security-research.md](file:///Users/ofri/.gemini/antigravity/brain/5594b208-d8f6-4613-ae12-afcd6d37009a/web-security-research.md)

### 2024 CVE References

| CVE            | Framework             | Severity | Attack Vector                       |
| :------------- | :-------------------- | :------- | :---------------------------------- |
| CVE-2024-45590 | Express (body-parser) | High     | DoS via crafted payload             |
| CVE-2024-43796 | Express               | Moderate | XSS via res.redirect()              |
| CVE-2024-25124 | Fiber                 | Critical | CORS wildcard + credentials         |
| CVE-2024-29409 | NestJS                | Moderate | File upload MIME bypass             |
| CVE-2024-50312 | GraphQL               | High     | Introspection access control bypass |
| CVE-2024-39895 | GraphQL               | Moderate | DoS via field duplication           |

---

## Shared Rules (15 rules)

Both plugins will implement these rules with framework-specific detection:

### P0 - Critical Security Rules

| Rule                           | CWE     | OWASP | CVSS | Description                                  |
| ------------------------------ | ------- | ----- | ---- | -------------------------------------------- |
| `no-insecure-cookie-options`   | CWE-614 | A05   | 7.5  | Missing secure/httpOnly/sameSite on cookies  |
| `require-helmet`               | CWE-693 | A05   | 6.5  | Missing security headers middleware          |
| `no-permissive-cors`           | CWE-942 | A05   | 7.5  | Wildcard or overly broad CORS origins        |
| `no-cors-credentials-wildcard` | CWE-942 | A05   | 9.1  | Credentials with wildcard origin (critical!) |
| `require-csrf-protection`      | CWE-352 | A01   | 8.8  | Missing CSRF tokens for state-changing ops   |
| `require-rate-limiting`        | CWE-770 | A05   | 7.5  | DDoS/brute-force protection missing          |

### P1 - High Impact Rules

| Rule                                  | CWE      | OWASP | CVSS | Description                                 |
| ------------------------------------- | -------- | ----- | ---- | ------------------------------------------- |
| `no-exposed-error-details`            | CWE-209  | A05   | 5.3  | Stack traces exposed in production          |
| `no-graphql-introspection-production` | CWE-200  | A01   | 5.3  | GraphQL schema exposed in production        |
| `require-graphql-depth-limit`         | CWE-400  | A05   | 7.5  | GraphQL DoS via deep query nesting          |
| `require-graphql-complexity-limit`    | CWE-400  | A05   | 7.5  | GraphQL DoS via query complexity            |
| `no-clickjacking`                     | CWE-1021 | A05   | 6.1  | Missing X-Frame-Options/CSP frame-ancestors |
| `require-content-type-validation`     | CWE-434  | A04   | 7.5  | Missing Content-Type validation             |

### P2 - Defense in Depth Rules

| Rule                        | CWE     | OWASP | CVSS | Description                                    |
| --------------------------- | ------- | ----- | ---- | ---------------------------------------------- |
| `require-cache-control`     | CWE-525 | A05   | 5.3  | Missing proper cache headers on sensitive data |
| `no-state-change-get`       | CWE-352 | A01   | 7.5  | State-changing operations on GET endpoints     |
| `require-origin-validation` | CWE-346 | A05   | 7.5  | Missing Origin/Referer header checks           |

---

## Express-Specific Rules (5 rules)

| Rule                                 | CWE      | OWASP | CVSS | Priority | Description                                    |
| ------------------------------------ | -------- | ----- | ---- | -------- | ---------------------------------------------- |
| `require-express-trust-proxy`        | CWE-290  | A05   | 6.5  | P1       | Proper proxy config for X-Forwarded-\* headers |
| `no-express-unsafe-regex-route`      | CWE-1333 | A05   | 7.5  | P0       | ReDoS in route patterns                        |
| `require-express-body-parser-limits` | CWE-400  | A05   | 7.5  | P0       | Body parser size limits to prevent DoS         |
| `no-express-x-powered-by`            | CWE-200  | A05   | 3.7  | P2       | Remove X-Powered-By header                     |
| `require-express-error-handler`      | CWE-209  | A05   | 5.3  | P1       | Production-safe error handling                 |

---

## NestJS-Specific Rules (6 rules)

| Rule                              | CWE     | OWASP | CVSS | Priority | Description                                   |
| --------------------------------- | ------- | ----- | ---- | -------- | --------------------------------------------- |
| `require-nestjs-guards`           | CWE-862 | A01   | 8.8  | P0       | Controllers/routes missing guards             |
| `no-nestjs-global-guards-bypass`  | CWE-863 | A01   | 8.8  | P1       | Guards bypassed via SkipAuth/Public           |
| `require-nestjs-validation-pipe`  | CWE-20  | A03   | 7.5  | P0       | Missing ValidationPipe for DTOs               |
| `require-nestjs-throttler`        | CWE-770 | A05   | 7.5  | P0       | Missing @nestjs/throttler integration         |
| `no-nestjs-file-type-bypass`      | CWE-434 | A04   | 8.8  | P1       | Content-Type only validation (CVE-2024-29409) |
| `require-nestjs-exception-filter` | CWE-209 | A05   | 5.3  | P1       | Production-safe exception handling            |

---

## Total Rule Count Summary

| Category         | Count  |
| ---------------- | ------ |
| Shared Rules     | 15     |
| Express-Specific | 5      |
| NestJS-Specific  | 6      |
| **Total**        | **26** |

---

## File Structure (per plugin)

```
packages/eslint-plugin-express-security/
├── src/
│   ├── index.ts                    # Plugin entry with configs
│   ├── rules/
│   │   ├── no-insecure-cookie-options/
│   │   │   ├── index.ts            # Rule implementation
│   │   │   └── no-insecure-cookie-options.test.ts
│   │   ├── require-helmet/
│   │   │   ├── index.ts
│   │   │   └── require-helmet.test.ts
│   │   └── ... (other rules)
│   └── types/
│       └── index.ts                # Type exports
├── docs/
│   └── rules/
│       └── no-insecure-cookie-options.md
├── README.md
├── CHANGELOG.md
├── AGENTS.md
└── package.json
```

---

## Configs

Each plugin will provide:

| Config        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `recommended` | Balanced - critical as errors, important as warnings |
| `strict`      | All rules as errors                                  |
| `graphql`     | GraphQL-specific rules only                          |
| `http`        | HTTP security rules (cookies, headers, CORS, CSRF)   |

---

## Implementation Order

### Phase 1: Core Infrastructure

1. Set up package.json with dependencies
2. Create index.ts with plugin structure
3. Create types/index.ts

### Phase 2: P0 Critical Security Rules

4. `no-insecure-cookie-options` - cookies
5. `require-helmet` - security headers
6. `no-permissive-cors` - CORS
7. `no-cors-credentials-wildcard` - CORS credentials (NEW)
8. `require-csrf-protection` - CSRF
9. `require-rate-limiting` - rate limiting

### Phase 3: GraphQL Rules

10. `no-graphql-introspection-production`
11. `require-graphql-depth-limit`
12. `require-graphql-complexity-limit`

### Phase 4: P1 HTTP Rules

13. `no-exposed-error-details`
14. `no-clickjacking`
15. `require-content-type-validation`

### Phase 5: P2 Defense in Depth

16. `require-cache-control`
17. `no-state-change-get` (NEW)
18. `require-origin-validation` (NEW)

### Phase 6: Express-Specific

19. `require-express-trust-proxy`
20. `no-express-unsafe-regex-route`
21. `require-express-body-parser-limits`
22. `no-express-x-powered-by` (NEW)
23. `require-express-error-handler` (NEW)

### Phase 7: Port to NestJS

24. Copy shared rules with NestJS-specific matching
25. Add NestJS-specific rules:
    - `require-nestjs-guards`
    - `no-nestjs-global-guards-bypass`
    - `require-nestjs-validation-pipe`
    - `require-nestjs-throttler` (NEW)
    - `no-nestjs-file-type-bypass` (NEW)
    - `require-nestjs-exception-filter` (NEW)

### Phase 8: Documentation

26. README.md with full rule tables
27. Individual rule docs
28. CHANGELOG.md
29. AGENTS.md

---

## Rule Implementation Pattern

Following `eslint-plugin-secure-coding`:

```typescript
/**
 * ESLint Rule: rule-name
 * Description
 * CWE-XXX: Title
 *
 * @see https://cwe.mitre.org/data/definitions/XXX.html
 * @see https://owasp.org/...
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule } from '@interlace/eslint-devkit';

type MessageIds = 'primaryMessage' | 'suggestionMessage';

export interface Options {
  allowInTests?: boolean;
  // ... other options
}

type RuleOptions = [Options?];

export const ruleName = createRule<RuleOptions, MessageIds>({
  name: 'rule-name',
  meta: {
    type: 'problem',
    docs: {
      description: '...',
    },
    hasSuggestions: true,
    messages: {
      primaryMessage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Issue Name',
        cwe: 'CWE-XXX',
        description: '...',
        severity: 'HIGH',
        fix: '...',
        documentationLink: '...',
      }),
      suggestionMessage: formatLLMMessage({...}),
    },
    schema: [...],
  },
  defaultOptions: [{...}],
  create(context, [options = {}]) {
    // Implementation
  },
});
```

---

## Detection Patterns

### Express.js

```typescript
// Cookie detection
res.cookie(name, value, options);
response.cookie(name, value, options);

// Helmet detection
app.use(helmet());

// CORS detection - CRITICAL patterns
app.use(cors({ origin: '*' })); // Wildcard
app.use(cors({ origin: true })); // Reflect any origin
app.use(
  cors({
    origin: '*',
    credentials: true, // MOST DANGEROUS!
  }),
);

// CSRF detection
app.use(csrf());
csurf();

// Rate limiting
app.use(rateLimit());
express - rate - limit;

// Body parser
app.use(express.json({ limit: '100mb' })); // Too high
bodyParser.json();
```

### NestJS

```typescript
// Cookie detection
response.cookie(name, value, options)
@Cookie() decorator usage

// Helmet detection
app.use(helmet())
HelmetMiddleware

// CORS detection
app.enableCors({ origin: '*' })
@CorsModule()

// CSRF detection
csurf middleware

// Guards - CRITICAL for auth
@UseGuards(AuthGuard)
@ApplyGuards()
// Missing guards on @Controller or @Get, @Post, etc.

// Validation - CRITICAL for input
@UsePipes(ValidationPipe)
// Missing ValidationPipe on DTOs

// Throttling
@UseGuards(ThrottlerGuard)
ThrottlerModule.forRoot()
```

---

## OWASP Top 10 2021 Coverage

| OWASP Category                     | Rules                                                                                                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01: Broken Access Control**     | `require-csrf-protection`, `require-nestjs-guards`, `no-nestjs-global-guards-bypass`, `no-graphql-introspection-production`, `no-state-change-get`                                                                               |
| **A03: Injection**                 | `require-nestjs-validation-pipe`, `require-content-type-validation`                                                                                                                                                              |
| **A04: Insecure Design**           | `require-content-type-validation`, `no-nestjs-file-type-bypass`                                                                                                                                                                  |
| **A05: Security Misconfiguration** | `require-helmet`, `no-permissive-cors`, `no-cors-credentials-wildcard`, `no-insecure-cookie-options`, `require-rate-limiting`, `require-cache-control`, `no-clickjacking`, `no-exposed-error-details`, `no-express-x-powered-by` |

---

## Timeline Estimate

- **Phase 1-2**: 2 sessions (core + 6 P0 rules)
- **Phase 3-4**: 2 sessions (GraphQL + P1 HTTP)
- **Phase 5**: 1 session (P2 defense in depth)
- **Phase 6**: 2 sessions (Express-specific + port)
- **Phase 7**: 2 sessions (NestJS-specific)
- **Phase 8**: 1 session (documentation)

**Total: ~10 sessions**
