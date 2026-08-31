---
'@interlace/eslint-plugin-nestjs-security': minor
---

`no-permissive-cors` takes `environmentHintNames`

A wildcard CORS origin behind a development-only guard is noise, and the rule
decided whether a condition was about the environment by matching
`NODE_ENV|APP_ENV|isDev|devMode|…`. `NODE_ENV` is a Node convention, but the
rest were ours: a project guarding on `STAGE` had its development-only opening
reported as if it shipped to production. `environmentHintNames` replaces the
list.

The words are matched whole against the identifiers in the condition rather
than compiled into a pattern, so a configured `isDev` still cannot match inside
`isDevelopmentModeEnabled`.
