---
'eslint-plugin-node-security': patch
---

fix: `module['require'](x)` loads the same module

`no-dynamic-dependency-loading` matched the loader on `property.name`, so the
subscripted spelling of `module.require` and `require.main.require` passed an
attacker-controlled specifier unreported.
