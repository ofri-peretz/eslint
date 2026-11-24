---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): no-hardcoded-credentials stops exempting a DI-token-shaped value held in a password slot

`isInjectionTokenName`'s `SCREAMING_SNAKE(qualifier)` shape exemption used to apply regardless of
the slot it was assigned to, so `const password = 'BULLMQ_CONFIG(default)';` was not reported: the
same call-shaped string that correctly clears a `TOKEN`-named slot also cleared a `password`-named
one. Nothing stores a real dependency-injection token in a slot named `password`, so the exemption
now checks the slot's own inferred category and no longer applies there — a DI-token-shaped value
in any other slot (`token`, `apikey`, `database`, `other`) keeps the exemption exactly as before
(#1686).
