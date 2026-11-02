---
title: no-missing-security-headers
description: 'Detects HTTP responses that set headers but omit a required security header (deprecated).'
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-693
autofix: false
---

> **Keywords:** no missing security headers, security, ESLint rule, JavaScript, TypeScript, CWE-693

<!-- @rule-summary -->

Detects HTTP responses that set headers but omit a required security header.
<!-- @/rule-summary -->

> **⚠️ Deprecated.** This rule is deprecated and no longer in any preset. Use
> [`express-security/require-helmet`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-helmet.md),
> which sets the whole header family at once. For a document sent without a
> Content-Security-Policy, [`require-csp-headers`](./require-csp-headers.md)
> reports it whether or not this rule is enabled. The rule is still exported and
> still works when enabled explicitly, until the next major removes it.

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP:** [Secure Headers Project](https://owasp.org/www-project-secure-headers/)

Detects HTTP responses that set headers but omit a required security header. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

## Quick Summary

| Aspect            | Details                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-693](https://cwe.mitre.org/data/definitions/693.html) (Protection Mechanism Failure) |
| **Severity**      | Medium                                                                                    |
| **Auto-Fix**      | ❌ No                                                                                     |
| **Category**      | Security                                                                                  |
| **Status**        | Deprecated — replaced by `express-security/require-helmet`                                |

## Vulnerability and Risk

**Vulnerability:** A response that renders a document without `Content-Security-Policy`, `X-Frame-Options` and `X-Content-Type-Options` leaves out the browser-side mitigations for XSS, clickjacking and MIME sniffing.

**Risk:** An injection that a policy would have contained executes; the page can be framed and its clicks hijacked; a user-uploaded file is sniffed into script.

## Rule Details

The rule looks at a scope (a route handler or middleware function) that **explicitly sets response headers** — through `res.setHeader`, `res.set`, `res.header`, `res.writeHead`, or a declared `headers: { … }` block — and reports when one of `requiredHeaders` is missing from what it sets. Header names are compared case-insensitively, and every setter spelling counts. A header name is read through any chain of `const` aliases and array tables (`H[0]` and `H['0']` are the same element), and a declared block's keys are read however they are written — `'X-Frame-Options'`, `['X-Frame-Options']`, `'headers'`, `'status'` and a Next.js `'key'` / `'value'` entry all count. Each function is its own scope and is reported at most once.

A scope that sets **no** header at all is out of scope: there is no call to judge. A scope that sets only transport or caching headers (`Cache-Control`, `Set-Cookie`, `Location`, `ETag`, …) is not serving a document and is not reported. A `.set(key, value)` on something that is not a response (a `Map`, a feature-flag store) is not a header write.

## Examples

### ❌ Incorrect

```javascript
app.get('/', (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.send(page); // Content-Security-Policy and X-Content-Type-Options missing
});

app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(page); // all three required headers missing
});
```

### ✅ Correct

```javascript
app.get('/', (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(page);
});

// Caching-only headers: not a document response
app.get('/asset', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
});

// Preferred: let helmet set the family (see express-security/require-helmet)
app.use(helmet());
```

## Configuration

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'browser-security/no-missing-security-headers': [
        'error',
        { requiredHeaders: ['X-Frame-Options'] },
      ],
    },
  },
];
```

`requiredHeaders` **replaces** the default list.

## Options

| Option            | Type       | Default                                                                  | Description                                     |
| ----------------- | ---------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| `requiredHeaders` | `string[]` | `["Content-Security-Policy","X-Frame-Options","X-Content-Type-Options"]` | Security headers a response must set            |
| `ignoreInTests`   | `boolean`  | `true`                                                                   | Skip this rule in `*.test.*` / `*.spec.*` files |

## Related Rules

- [`require-csp-headers`](./require-csp-headers.md) - a document emitted without a Content-Security-Policy
- [`no-clickjacking`](./no-clickjacking.md) - frame protection (also deprecated)

## Known False Negatives

### Headers set by app-level middleware

**Why**: The rule judges one scope at a time; a header set in middleware registered elsewhere is invisible to the handler.

```javascript
// ❌ NOT DETECTED as protected — and not reported either, when the handler sets no header
app.use(setSecurityHeaders);
app.get('/', (req, res) => res.send(page));
```

**Mitigation**: Use helmet at the app level.

## Further Reading

- **[OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)** - Best practices
- **[CWE-693: Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)** - Official CWE entry
