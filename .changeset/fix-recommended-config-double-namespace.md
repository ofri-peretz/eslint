---
"eslint-plugin-maintainability": patch
"eslint-plugin-operability": patch
---

fix: republish `recommended` with correctly-namespaced, unscoped rule ids

`eslint-plugin-maintainability@3.0.3` and `eslint-plugin-operability@3.0.5`
shipped a `recommended` preset whose rule ids carried a doubled, scoped plugin
segment (`@interlace/maintainability/maintainability/cognitive-complexity`)
that no registered plugin key matched. Enabling the preset alongside any other
config made ESLint throw at load:

```text
Could not find plugin "@interlace/maintainability/maintainability".
```

(and the equivalent `@interlace/operability/operability` for operability.)

The source was already corrected to the bare, unscoped form
(`maintainability/cognitive-complexity` under a `maintainability` plugin key)
but was never republished, so npm still served the broken build. This release
ships the corrected build. `plugin.meta.name` is also fixed to the unscoped
`eslint-plugin-maintainability` (was `@interlace/eslint-plugin-maintainability`,
which drifted from the package name and every other plugin).

Each plugin is configured on its own — there is no unified config. No rule
behaviour changes.

New regression locks in each plugin's `index.test.ts` reproduce ESLint's rule-id
resolution, pin the plugin name and key as unscoped, and load each `recommended`
preset in a real ESLint instance — failing closed if a scoped or doubly
namespaced config could ship again.
