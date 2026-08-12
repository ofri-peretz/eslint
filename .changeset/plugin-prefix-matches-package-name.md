---
'eslint-plugin-postgresql-security': minor
'eslint-plugin-jwt-security': minor
---

Presets now emit rule ids prefixed with the package's own name, so registering
the plugin under that name works.

Both packages were renamed (`eslint-plugin-jwt` → `eslint-plugin-jwt-security`,
`eslint-plugin-pg` → `eslint-plugin-postgresql-security`) but their presets kept
emitting the pre-rename `jwt/` and `pg/` prefixes. Registering under the package
name — the shape every README shows — failed outright:

```
A configuration object specifies rule "jwt/no-algorithm-none",
but could not find plugin "jwt".
```

`configs.recommended` / `flagship` / `strict` now emit `jwt-security/…` and
`postgresql-security/…`. The legacy keys (`jwt`, `pg`) stay registered in each
preset's `plugins` block for a deprecation window, so a config that already
writes the old rule ids alongside these presets keeps resolving. They are
removed in the next major.

If you spread `…configs.recommended.rules` and register the plugin yourself,
register it under the package name (`'jwt-security'` / `'postgresql-security'`).
Spreading the whole config object needs no change.
