---
'eslint-plugin-import-next': patch
---

fix(import-next): no-nodejs-modules shows the documented builtin alternative

`suggestAlternatives` (default `true`) built a per-builtin alternative such as
"Use Web Crypto API (crypto.subtle) or crypto libraries" and passed it as report
data, but no message template had a placeholder for it, so the option changed
nothing. Each message now carries the alternative in its Fix line when the
option is on and the builtin has one; `suggestAlternatives: false` drops it.
