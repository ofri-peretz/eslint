---
'@interlace/eslint-devkit': patch
'eslint-plugin-postgresql-security': patch
'eslint-plugin-jwt-security': patch
'eslint-plugin-mcp-sdk-security': patch
---

Bound the parsed-module caches behind cross-file value following.

Each cache held one parsed AST (and, for postgresql-security and the devkit, its scope
manager) for every relatively-imported module a lint run ever opened, in module state
that outlives every file and every ESLint instance. On a large codebase that is a heap
that grows with the number of files linted: 106k files took the ILB corpus gates past
an 8 GB heap. The caches now keep the 512 most recently used modules. Measured on 10.5k
corpus files with every recommended preset enabled: heap 2,358 MB and climbing before,
150-370 MB after (no growth), with no change in lint time.
