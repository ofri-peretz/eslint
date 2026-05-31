# Plugin Rule Scope — What Rules Belong Where

> **Read before adding a new rule to any plugin.**
>
> This document answers: "Which plugin does this rule belong in?"
> The classification is structural, not topical. A rule about SQL injection
> that checks Express route handlers belongs in `express-security`, not
> `secure-coding`, even though SQL injection is a "security concept."

---

## The two-axis test

```
        ┌────────────────────────────────────────────────────┐
        │                  STRUCTURAL?                        │
        │  Does the pattern fire on a specific AST shape      │
        │  regardless of what values flow through it?         │
        └────────────┬───────────────┬───────────────────────┘
                     │ YES           │ NO
                     ▼               ▼
           ┌─────────────────┐  ┌──────────────────────────┐
           │ FRAMEWORK       │  │ Cannot be a reliable lint │
           │ SPECIFIC?       │  │ rule. At best: warn-only  │
           │                 │  │ heuristic with disclaimer.│
           └──────┬──────────┘  └──────────────────────────┘
                  │ YES                    │ NO
                  ▼                        ▼
        ┌──────────────────┐     ┌──────────────────────────┐
        │ Framework plugin │     │ Generic plugin            │
        │ (express-sec,    │     │ (secure-coding,           │
        │  pg, jwt, etc.)  │     │  node-security, etc.)     │
        └──────────────────┘     └──────────────────────────┘
```

**Structural** = the rule fires on a specific token/node arrangement,
independent of runtime data flow. Renaming variables doesn't change
whether it fires.

**Framework-specific** = the rule only makes sense if a particular
library/runtime is present and the API has a known shape.

---

## Plugin scopes

### `eslint-plugin-secure-coding` — Generic application security, any codebase

**What belongs here:** Patterns that are wrong in *any* JS/TS codebase,
detectable from AST structure alone, without knowing what framework is
running.

| ✅ Good fit | Why it's structural |
|---|---|
| `no-hardcoded-credentials` | A high-entropy literal in a key named `password`/`secret` is structurally suspicious regardless of runtime |
| `no-redos-vulnerable-regex` | Regex catastrophic backtracking is detectable statically from the regex AST |
| `detect-non-literal-regexp` | `new RegExp(variable)` is always a ReDoS risk; the structure is unambiguous |
| `no-unsafe-deserialization` | `JSON.parse(req.body)` — the argument is a request property, structurally identifiable |
| `no-hardcoded-session-tokens` | Literal that looks like a JWT/cookie in source is structurally wrong |
| `no-insecure-comparison` | `==` on credential strings where `===` should be used |
| `no-format-string-injection` | Template interpolation directly into format strings |
| `no-xpath-injection` / `no-ldap-injection` | Specific client library call with non-literal argument |
| `no-graphql-injection` | gql`` tagged template with `${}` expressions |

**What does NOT belong here:**
- `no-missing-authentication` — requires knowing what a "route handler" is (Express/Koa/Fastify). Move to framework plugins.
- `require-backend-authorization` — same; requires framework context.
- `no-privilege-escalation` — too abstract to check structurally without OS/framework API knowledge.
- `no-sensitive-data-exposure` — relies entirely on variable naming heuristics.
- `no-pii-in-logs` — naming heuristic (`email`, `phone` in `console.log`). Only enforceable structurally if checking a specific logger API.

---

### `eslint-plugin-node-security` — Node.js built-in module safety

**What belongs here:** Patterns involving Node.js core APIs (`fs`, `child_process`, `crypto`, `vm`, `Buffer`, `http`, `https`) where a specific structural anti-pattern is unambiguously wrong.

| ✅ Good fit | Why it's structural |
|---|---|
| `detect-non-literal-fs-filename` | `fs.readFile(variable)` — dynamic path, structurally identifiable |
| `detect-child-process` | `exec(variable)` — shell injection, structural |
| `no-deprecated-buffer` | `new Buffer()` — specific deprecated constructor call |
| `no-weak-hash-algorithm` | `crypto.createHash('md5')` — literal algorithm name |
| `no-ssrf` | ⚠️ **Heuristic** — detects `fetch(urlNamedLikeUserInput)`. Cannot detect `fetch(apiBase)` even if user-controlled. **Warn-only.** |
| `no-toctou-vulnerability` | Structurally detectable: `fs.exists()` followed by `fs.readFile()` without intervening validation |

---

### `eslint-plugin-express-security` — Express.js-specific patterns

**What belongs here:** Rules that require Express's router/middleware API shape to be meaningful.

| ✅ Good fit | Why it's framework-scoped |
|---|---|
| Route handler checks (auth, redirect, headers) | Only meaningful when `app.get()` / `router.post()` is the API surface |
| `no-user-controlled-redirect` | `res.redirect(req.query.url)` — structurally detectable in Express |
| Missing auth middleware checks | Requires knowing Express's middleware chain shape |
| Unescaped template rendering | `res.send(template + userInput)` — Express response API |

**Migration targets from `secure-coding`:**
- `no-missing-authentication` → `express-security`
- `require-backend-authorization` → `express-security`

---

### `eslint-plugin-pg` — PostgreSQL client (`pg` package)

**What belongs here:** Patterns specific to the `pg` npm package API.

| ✅ | Why |
|---|---|
| `no-unsafe-query` | `client.query("SELECT..." + variable)` — pg's specific `.query()` call |
| `no-raw-queries` | Same structural check on `pool.query()` |

---

### `eslint-plugin-mongodb-security` — MongoDB client (`mongodb`/`mongoose`)

Same as pg — the rule fires on a specific client API call with a non-literal argument. Framework-scoped and structural.

---

### `eslint-plugin-jwt` — `jsonwebtoken` package

All rules check specific `jwt.sign()` / `jwt.verify()` call shapes.
These are purely structural — the argument position and value are
unambiguous.

---

### `eslint-plugin-lambda-security` — AWS Lambda

Rules that are only meaningful in Lambda handlers (event shape, env var
patterns, cold-start timing). Generic security checks that happen to
run in Lambda belong in `node-security` or `secure-coding`.

---

### `eslint-plugin-nestjs-security` — NestJS decorators

Rules that inspect NestJS decorator patterns (`@Get`, `@UseGuards`, etc.).
These are framework-scoped and structural.

---

### `eslint-plugin-vercel-ai-security` — Vercel AI SDK

Rules that check `streamText()`, `generateObject()`, and related Vercel AI
SDK call shapes.

---

### `eslint-plugin-maintainability` / `eslint-plugin-reliability` / `eslint-plugin-conventions`

These are **code quality** plugins, not security. They check structural
patterns (complexity, naming, error handling shapes) that apply to any
codebase. No framework assumptions.

---

## Decision flowchart for new rules

1. **Does it check a specific library/framework API call?**
   → Use the library-specific plugin. If no plugin exists, consider whether
   the library is large enough to warrant one.

2. **Does it check a Node.js built-in API?**
   → `eslint-plugin-node-security`

3. **Is the dangerous pattern the *structure* of the code** (a literal value,
   a specific operator, a deprecated API name), not *what data flows into it?*
   → `eslint-plugin-secure-coding` (or a quality plugin)

4. **Does it require knowing where a value *came from* at runtime?**
   → It cannot be a reliable lint rule. At best, add it as `warn` with
   an explicit heuristic disclaimer in the docs.

5. **Does it check a concept that only exists in a specific framework?**
   (e.g., "is this route protected?", "does this handler validate input?")
   → It belongs in the framework plugin, full stop.
