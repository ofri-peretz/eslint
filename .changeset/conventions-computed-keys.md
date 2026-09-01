---
'eslint-plugin-conventions': minor
---

fix: `console['log']` is the same call as `console.log`

`no-console-spaces` — `console['log'](' x ')` reaches the same property the dotted spelling does, and the rule went
silent on it. That is the notation bundlers emit, so the rule was off on built
output.

A dynamic `o[m]` still names nothing and is still ignored.
