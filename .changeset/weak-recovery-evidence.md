---
"eslint-plugin-secure-coding": patch
---

`no-weak-password-recovery` no longer calls a token predictable without
evidence.

The rule reported whenever a recovery-named variable's initializer did not
*textually contain* one of four hardcoded generator names, so any project-local
helper was weak by default:

```js
const forgotPassword = catchAsync(async (req, res) => { ... });  // a route handler
const resetPasswordToken = generateToken(user.id, expires, RESET); // may wrap crypto
```

The first is not a token at all; the second cannot be judged without seeing
inside it. Predictability must now be shown — `Math.random()`, `Date.now()`,
`new Date().getTime()`, time-based `uuid.v1()` — and initializers taking a
function argument (middleware wrappers) are skipped.

12 → 5 findings on the 13-repo wild corpus, with weak sources still reported.
