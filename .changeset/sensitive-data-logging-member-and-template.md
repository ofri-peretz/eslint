---
'eslint-plugin-secure-coding': patch
---

`no-sensitive-data-exposure` now reads property accesses and template literals
in logging calls.

The logging path handled `Literal`, `+` concatenation and bare `Identifier`
arguments only, so the two most common ways a secret actually reaches a log
line were silent:

```js
console.log(user.password);      // was not reported
console.log(`token=${t}`);       // was not reported
```

Both report now. A template is read only when something is interpolated — a
template with no expressions is a constant string, and reporting it would be
the same prose false positive the literal guard already prevents.
