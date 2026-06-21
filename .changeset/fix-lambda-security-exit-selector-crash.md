---
"eslint-plugin-lambda-security": patch
"@interlace/eslint-config": patch
---

Fix a hard crash (`Error: Unknown class name: exit`) that aborted the entire ESLint run on ESLint 9 whenever the `recommended` or `strict` config was enabled.

Three rules — `require-timeout-handling`, `no-missing-authorization-check`, and `no-unbounded-batch-processing` — registered their function-exit listener as a single comma-joined selector key:

```
'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
```

ESLint only strips a **trailing** `:exit` before handing a selector to esquery, so the earlier `:exit` tokens survived into the parser and threw `Unknown class name: exit` for every linted file. Each listener is now registered as one key per node type, which is the only esquery-safe form.

A config-level regression test (`src/index.test.ts`) now boots the real ESLint engine against both shipped configs, so any future comma-joined `:exit` — or any other unparseable selector in any rule — fails in CI instead of in a consumer's editor.

`@interlace/eslint-config` re-exports the `recommended` config and is republished against the fixed plugin.
