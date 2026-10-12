---
'@interlace/eslint-devkit': minor
---

feat(eslint-devkit): shared factories behind the security plugins' 1.0 releases

The rule factories used by the SQL, LLM-SDK and Supabase plugins now follow values through bounded same-file hops and recognise each SDK by its import rather than by a local name. They include `sql-injection-rule`, `raw-identifier-rule`, `hardcoded-credentials-rule`, `sdk-api-key-rule`, `system-prompt-injection-rule`, `browser-escape-hatch-rule`, `mass-assignment-rule`, `unscoped-mutation-rule` and `require-tls-rule`, plus a new `sdk-flow` helper. Plugins that depend on these behaviours require this version.
