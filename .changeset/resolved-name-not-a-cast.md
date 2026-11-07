---
'@interlace/eslint-devkit': patch
'eslint-plugin-postgresql-security': patch
'eslint-plugin-vercel-ai-security': patch
---

Internal: test property names with the null-safe `namesOneOf` instead of casting `propertyName(...)` to `string`. No rule reports differently; a computed key that names nothing is now visibly "no name" rather than a cast that happens to miss.
