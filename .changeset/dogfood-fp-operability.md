---
'eslint-plugin-operability': patch
---

fix: `no-console-log` and `no-debug-code-in-production` skip the module that is the logger

A logger has to call `console.log` somewhere. A module named `logger`, `logging`, `log`, `fooLogger` or `foo-logger` is now skipped by both rules, behind a new `ignoreLoggerModules` option (default `true`). `catalog.ts`, `blog.ts`, `loggerFactory.ts` and every other file still report.
