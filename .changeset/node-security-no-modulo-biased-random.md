---
'eslint-plugin-node-security': minor
---

Add `no-modulo-biased-random` (strict): reports a byte from `crypto.randomBytes` or `getRandomValues` reduced with `%` to pick a character when the divisor does not divide the byte's range, which makes some characters of a generated secret more likely than others.
