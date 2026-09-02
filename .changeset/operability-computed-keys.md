---
'eslint-plugin-operability': minor
---

fix: `console['log']` reaches the same sink as `console.log`

`no-console-log` — `console['log']('x')` reaches the same property the dotted spelling does, and the rule went
silent on it. That is the notation bundlers emit, so the rule was off on built
output.

A dynamic `o[m]` has no statically known property name, so it is still ignored.
