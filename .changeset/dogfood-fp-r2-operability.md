---
'eslint-plugin-operability': patch
---

fix: treat test files as non-production for console and debug-code rules

`no-console-log` and `no-debug-code-in-production` treat `*.test.*` / `*.spec.*` files as non-production (`ignoreNonProductionPaths`), so a `console.log` in a test is no longer reported twice.
