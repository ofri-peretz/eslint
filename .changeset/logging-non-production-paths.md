---
'eslint-plugin-operability': minor
---

`no-console-log` and `no-debug-code-in-production` no longer report code that
never ships.

Both rules gain `ignoreNonProductionPaths` (default `true`), skipping
`scripts/`, `bin/`, `tools/`, `env/`, `benchmarks/`, examples and demos, plus
top-level build config (`*.config.js`, `Gruntfile`).

```js
// scripts/build.js
console.log("building…")   // no longer reported by either rule
```

A `console.log` in a build script is a deliberate build-time message, not debug
output left in an application — and the rule's own name is the argument for it:
a build script is not production.

**107 → 24** and **120 → 30** on the pinned corpus.

Matched by path **segment**, not prefix: a repository is linted from an
absolute path, so `/repo/scripts/build.js` does not start with `scripts/` and a
prefix test would silently never fire.
