---
title: no-missing-security-headers
description: "Detects missing security headers in HTTP responses"
tags: ['security', 'express', 'deprecated']
category: security
severity: high
cwe: CWE-693
autofix: false
---

> **Deprecated.** Use [`require-helmet`](./require-helmet) instead.

<!-- @rule-summary -->

Detects missing security headers in HTTP responses
<!-- @/rule-summary -->

**Status:** 🚫 Deprecated — replaced by [`require-helmet`](./require-helmet)
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

## Why this rule was replaced

Header-by-header detection duplicated what helmet already guarantees as a
bundle. `require-helmet` checks for the middleware that sets the whole
header suite (CSP, X-Frame-Options, HSTS, X-Content-Type-Options), which is
the fix this rule's own message recommended.

The rule id still resolves so existing configs keep working, but it receives no
new detection work. Reports carry the same CWE metadata as before.

## Migration

```js
// eslint.config.js
{
  rules: {
    // before
    'express-security/no-missing-security-headers': 'error',
    // after
    'express-security/require-helmet': 'error',
  },
}
```

No source changes are needed — only the rule id in your config.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `requiredHeaders` | `string[]` | `["Content-Security-Policy","X-Frame-Options","X-Content-Type-Options"]` | Security headers every response must set |
| `ignoreInTests` | `boolean` | `true` | Skip this rule in `*.test.*` / `*.spec.*` files |

## Related Rules

- [`require-helmet`](./require-helmet) — the maintained replacement
