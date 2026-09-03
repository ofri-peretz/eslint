---
title: require-case-insensitive-path-guard
description: This rule detects path-based authorization guards that compare req.path case-sensitively, which case-insensitive Express routing bypasses
tags: ['security', 'express']
category: security
severity: high
cwe: CWE-178
autofix: false
---

> Require case-insensitive comparison when guarding protected paths via req.path / req.url / req.originalUrl

<!-- @rule-summary -->

This rule detects path-based authorization guards that compare req.path case-sensitively, which case-insensitive Express routing bypasses
<!-- @/rule-summary -->

**Severity:** 🔴 High  
**CWE:** [CWE-178](https://cwe.mitre.org/data/definitions/178.html)

## Rule Details

Express routers can match paths case-insensitively — `Router({ caseSensitive: false })` is the default, and regex routes frequently carry the `i` flag. A middleware guard that checks `req.path.startsWith('/admin')` only sees the exact lower-case spelling: a request to `/Admin/users` skips the guard entirely but still reaches the handler. The authorization check silently never runs.

This rule flags case-sensitive comparisons (`startsWith`, `endsWith`, `includes`, `indexOf`, `match`, and `===`/`==`/`!==`/`!=` equality) between a `req.path` / `req.url` / `req.originalUrl` access and a protected-looking value (default patterns: `admin`, `api`, `dashboard`, `internal`, `private`).

Route **registrations** are never flagged — `app.get('/admin', ...)` is routing, not guarding.

## Examples

### ❌ Incorrect

```javascript
// Prefix guard — GET /Admin/users bypasses it
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    if (!req.user || req.user.role !== 'admin') return res.sendStatus(403);
  }
  next();
});

// Equality guard — same bypass
if (req.url === '/admin') requireAuth(req);

// indexOf / includes guards
if (req.path.indexOf('/admin') === 0) requireAuth(req);
if (req.url.includes('/internal')) requireAuth(req);

// Regex guard without the i flag
if (req.path.match(/^\/admin/)) requireAuth(req);
```

### ✅ Correct

```javascript
// Normalize the path before comparing
const normalizedPath = req.path.toLowerCase();
if (normalizedPath.startsWith('/admin')) {
  if (!req.user || req.user.role !== 'admin') return res.sendStatus(403);
}

// Or normalize inline
if (req.path.toLowerCase().startsWith('/admin')) requireAuth(req);

// Regex guard with the i flag matches the router's semantics
if (req.path.match(/^\/admin/i)) requireAuth(req);

// Route registration is routing, not guarding — never flagged
app.get('/admin', requireAuth, adminHandler);

// Non-protected paths are not flagged by default
if (req.path.startsWith('/health')) return next();
```

## Suggestions

The rule offers editor suggestions (no auto-fix):

- **String / equality guards** — insert `.toLowerCase()` after the path access, and lower-case the compared literal when it contains upper-case characters.
- **Regex guards** — append the `i` flag to the regex literal.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `protectedPaths` | `string[]` | — | Substrings that mark a compared value as a protected path |
| `checkAllPaths` | `boolean` | — | Flag every case-sensitive path guard regardless of the compared value |

```json
{
  "rules": {
    "express-security/require-case-insensitive-path-guard": [
      "error",
      { "protectedPaths": ["admin", "billing"], "checkAllPaths": false }
    ]
  }
}
```

## When Not To Use It

If every router in your app is explicitly created with `Router({ caseSensitive: true })` and you audit that setting in review, case-sensitive guards match the router's semantics and this rule can be disabled.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Indirect Path Variable

**Why**: No data-flow analysis — only direct `req.path` / `req.url` / `req.originalUrl` member accesses are matched.

```typescript
// ❌ NOT DETECTED — path copied to a variable first
const p = req.path;
if (p.startsWith('/admin')) requireAuth(req);
```

**Mitigation**: Normalize at the copy: `const p = req.path.toLowerCase();`.

### Non-Literal Comparison Values

**Why**: The compared value must be a string or regex literal.

```typescript
// ❌ NOT DETECTED — prefix held in a variable
const ADMIN = '/admin';
if (req.path.startsWith(ADMIN)) requireAuth(req);
```

**Mitigation**: Enable `checkAllPaths` in a follow-up audit, or normalize the path unconditionally.

### Computed Property Access

**Why**: `req['path']` is not matched — only non-computed member accesses.

```typescript
// ❌ NOT DETECTED
if (req['path'].startsWith('/admin')) requireAuth(req);
```

**Mitigation**: Prefer `req.path` — the rule then applies.

## Further Reading

- [CWE-178: Improper Handling of Case Sensitivity](https://cwe.mitre.org/data/definitions/178.html)
- [OWASP A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [Express Router options (`caseSensitive`)](https://expressjs.com/en/api.html#express.router)
