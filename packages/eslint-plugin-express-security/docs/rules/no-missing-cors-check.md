---
title: no-missing-cors-check
description: "Detects missing CORS validation (wildcard CORS, missing origin check)"
tags: ['security', 'express', 'deprecated']
category: security
severity: high
cwe: CWE-346
autofix: false
---

> **Deprecated.** Use [`no-permissive-cors`](./no-permissive-cors) instead.

<!-- @rule-summary -->

Detects missing CORS validation (wildcard CORS, missing origin check)
<!-- @/rule-summary -->

**Status:** 🚫 Deprecated — replaced by [`no-permissive-cors`](./no-permissive-cors)
**CWE:** [CWE-346](https://cwe.mitre.org/data/definitions/346.html)

## Why this rule was replaced

Its detection surface converged with `no-permissive-cors`, which models the
same misconfigurations (wildcard origins, reflected origins, missing
validation) with fewer false positives and clearer per-finding messages.
Maintaining both meant every improvement had to land twice.

The rule id still resolves so existing configs keep working, but it receives no
new detection work. Reports carry the same CWE metadata as before.

## Migration

```js
// eslint.config.js
{
  rules: {
    // before
    'express-security/no-missing-cors-check': 'error',
    // after
    'express-security/no-permissive-cors': 'error',
  },
}
```

No source changes are needed — only the rule id in your config.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `allowInTests` | `boolean` | `false` | Allow missing CORS checks in test files |
| `trustedLibraries` | `string[]` | `[]` | Custom CORS libraries to trust (wildcard origins in these libraries will not be reported) |
| `ignorePatterns` | `string[]` | `[]` | Additional safe patterns to ignore |

## Related Rules

- [`no-permissive-cors`](./no-permissive-cors) — the maintained replacement
