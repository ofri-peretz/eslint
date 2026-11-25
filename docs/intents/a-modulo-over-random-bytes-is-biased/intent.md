---
slug: a-modulo-over-random-bytes-is-biased
opened: 2026-11-25
packages:
  - eslint-plugin-node-security
  - oxlint-plugin-node-security
cases: []
---

# Intent — a random byte reduced with `%` is a biased secret

> Stage 1 artifact. Opened from ToolJet/ToolJet#19245 (2026-11-24), where the
> fix for a `Math.random` password also had to remove a modulo bias that no
> rule of ours reports.

**Status:** review · **Opened:** 2026-11-25 · **Owner:** @ofri-peretz

---

## What is wanted

A proposed rule, `no-modulo-biased-random`, reports a byte (or word) from
`crypto.randomBytes`, `crypto.getRandomValues` or `crypto.webcrypto.getRandomValues`
reduced with `% n`, where `n` does not divide the source range (256 for a byte,
2^32 for a `Uint32Array` element) and the value is used to pick a character or
digit of a generated secret. The low values of `n` then come up more often than
the high ones: for a 70-character alphabet, the first 46 characters are picked
with probability 4/256 and the other 24 with 3/256. That is CWE-330, weaker
randomness than the code claims. The fix is `crypto.randomInt(n)` or rejection
sampling.

## Why now

- ToolJet's `generateTJDBPasswordForRole` (`server/src/helpers/tooljet_db.helper.ts`)
  built the password's body as `allChars[b % allChars.length]` over
  `crypto.randomBytes`. Our PR ToolJet/ToolJet#19245, credited to
  `node-security/no-math-random-crypto`, replaced both that and the
  `Math.random` picks with `crypto.randomInt`. `no-math-random-crypto` found
  the `Math.random` half; nothing found the modulo half.
- Measured 2026-11-25 over this repo's `node_modules` (same acorn scan as
  `a-uri-decode-on-request-input-is-a-crash`): 26 `%` expressions within
  reach of a `randomBytes`/`getRandomValues` call. 20 are big-number arithmetic
  (`n % 1e7` in decimal.js, bignumber.js and Prisma's runtime) that never
  touches a random value, and the rest are `pkce-challenge`, which reduces
  with `%` only after a rejection test (`if (randomByte < evenDistCutoff)`).
  So the library corpus has 0 true cases and 26 shapes the rule must stay quiet
  on, which is the point of measuring it: the rule has to follow the value, not
  the neighbourhood.

## Affected users and systems

`eslint-plugin-node-security` and its oxlint alias, the rule's docs page and the
generated docs site pages. Browser code that calls `crypto.getRandomValues`
directly would be in `browser-security`; the design decides whether one rule
serves both through a shared helper.

## Constraints

- The value is followed from the random source to the `%`: a byte of the
  returned buffer or typed array, through `for…of`, `.map`, `Array.from` or an
  index. Proximity in the file is not evidence.
- A divisor that is a power of two, or a literal or `length` that provably
  divides the range, is not reported.
- Rejection sampling (a comparison of the same byte against a cutoff that
  guards the `%`) is not reported.
- The result has to reach an indexing of a string or array, or a string
  build. A `%` on a random byte used for jitter or sharding is not a secret.

## Success criteria

- RuleTester: the ToolJet shape before #19245 reports; after it does not; the
  `pkce-challenge` rejection-sampling shape does not; a `% 16` hex pick does not.
- Fidelity model `node-security/no_modulo_biased_random` passes with 0
  divergences.
- A corpus run over the benchmark app set, hit count and hand-read precision in
  the PR before it joins `recommended`.

## Open questions

- Is the bias large enough to report for `n` close to the range? A 250-character
  alphabet over a byte picks its first 6 characters twice as often as the rest. A threshold would be a judgment call;
  the default answer is to report any non-divisor and let the message state the
  skew.
- Does the same rule own `Math.floor(Math.random() * n)`? No:
  `no-math-random-crypto` already reports that source.
