---
title: no-missing-csrf-protection
description: "Detects missing CSRF token validation in POST/PUT/DELETE requests"
tags: ['security', 'express', 'deprecated']
category: security
severity: high
cwe: CWE-352
autofix: false
---

> **Deprecated.** Use [`require-csrf-protection`](./require-csrf-protection) instead.

<!-- @rule-summary -->

Detects missing CSRF token validation in POST/PUT/DELETE requests
<!-- @/rule-summary -->

**Status:** 🚫 Deprecated — replaced by [`require-csrf-protection`](./require-csrf-protection)
**CWE:** [CWE-352](https://cwe.mitre.org/data/definitions/352.html)

## Why this rule was replaced

The replacement inverts the model from "flag suspicious absence" to
"require the protection to be present", which is both easier to reason
about and stricter: `require-csrf-protection` fails the app that never
mounts CSRF middleware at all, the case this rule could miss.

The rule id still resolves so existing configs keep working, but it receives no
new detection work. Reports carry the same CWE metadata as before.

## Migration

```js
// eslint.config.js
{
  rules: {
    // before
    'express-security/no-missing-csrf-protection': 'error',
    // after
    'express-security/require-csrf-protection': 'error',
  },
}
```

No source changes are needed — only the rule id in your config.

## Related Rules

- [`require-csrf-protection`](./require-csrf-protection) — the maintained replacement
