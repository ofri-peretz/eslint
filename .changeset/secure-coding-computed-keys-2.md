---
'eslint-plugin-secure-coding': patch
---

fix: template compilation and token generation read a subscripted method

`Handlebars['compile'](userTemplate)` compiles the same attacker-supplied
template `Handlebars.compile` does, and a reset token built from
`Math['random']()` is exactly as guessable as one built from `Math.random()`.

Two more tests had pinned the miss. One listed `Handlebars['compile']` beside
`Handlebars[methodName]` as though they were the same refusal — the first
names `compile`, the second has no statically known method name. The other was titled after the
coverage branch it existed to execute, "computed require method access (id 85
FALSE)", and asserted that `s['unserialize'](userInput)` was safe.
