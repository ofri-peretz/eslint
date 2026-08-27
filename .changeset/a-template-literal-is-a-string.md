---
'eslint-plugin-browser-security': minor
'eslint-plugin-conventions': minor
'eslint-plugin-express-security': minor
'eslint-plugin-import-next': minor
'eslint-plugin-jwt-security': minor
'eslint-plugin-lambda-security': minor
'eslint-plugin-maintainability': minor
'eslint-plugin-mcp-sdk-security': minor
'eslint-plugin-modernization': minor
'eslint-plugin-modularity': minor
'eslint-plugin-mongodb-security': minor
'eslint-plugin-node-security': minor
'eslint-plugin-postgresql-security': minor
'eslint-plugin-react-a11y': minor
'eslint-plugin-react-features': minor
'eslint-plugin-reliability': minor
'eslint-plugin-secure-coding': minor
'eslint-plugin-vercel-ai-security': minor
---

**🐛 Fix** — a template literal is a string, in 82 rules that disagreed

A rule that matched `require('child_process')` did not match
`` require(`child_process`) ``. A rule that matched `res.headers['x-api-key']`
did not match `` res.headers[`x-api-key`] ``. Nothing about the two spellings
differs at runtime, and no consumer chose one on purpose — which is exactly
why the miss was invisible: the rule looked correct in its own tests, because
its tests were written in the same spelling as its implementation.

Rules across these plugins now read a static string wherever the value is
statically known: a plain literal, a template literal with no substitutions,
and a concatenation of either. The same pass fixed computed member access, so
`o['foo']` is read wherever `o.foo` was.

**These rules now report on code they previously stayed quiet on.** That is
the point — the missed spelling was a false negative, not an exemption — but
a codebase written with backticks may see new findings on upgrade.
