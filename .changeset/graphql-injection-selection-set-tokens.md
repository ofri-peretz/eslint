---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): no-graphql-injection stops reading JS object fragments as GraphQL selection sets

A string with no GraphQL keyword counted as a selection set when it started with `{`, ended with `}` and nested two levels deep. ajv's bundled code generator builds each validation error in pieces (`" { keyword: '" + k + "' , params: {} "`), and the rule reported 30 of them in `mcp-remote@0.1.15`, a package that never uses GraphQL. A bare selection set must now close its opening brace at the end, and outside string values it may contain only GraphQL tokens, so `'`, `+` and `;` rule it out. Over the repo's 4,895 benchmark files the rule drops 25 findings, all JS object templates, and adds none. The fidelity model still scores 42/42 inputs with no false negatives.
