---
'eslint-plugin-secure-coding': minor
---

**✨ Feature** — `no-insecure-comparison` gains `reportLooseEquality`

The rule reports two different claims under one name. `token === expected` is an
authentication bypass; `if (e.code == 'MODULE_NOT_FOUND')` is type coercion,
which `eqeqeq` already covers and most projects already run.

Setting `reportLooseEquality: false` keeps the first and declines the second:

```json
"secure-coding/no-insecure-comparison": ["error", { "reportLooseEquality": false }]
```

Default is `true`, so nothing changes unless you opt in.

A secret is never silenced by the option. `apiKey == provided` still reports —
loose equality on a credential is worse than strict, not better, because it adds
coercion to a comparison that already leaks by short-circuiting.
