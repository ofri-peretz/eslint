---
'eslint-plugin-conventions': minor
---

`no-magic-numbers` gains three exemptions, and stops being the highest-volume
rule in the ecosystem.

**`detectObjects`** (default `false`) — object property values are no longer
reported, matching ESLint core's own `no-magic-numbers`, which has shipped that
default for years. A config object is a place to write literals.

```js
const cfg = { timeout: 5000, retries: 7 }   // no longer reported
```

**`ignoreLoopBounds`** (default `true`) — a numeric bound in a `for` header is
the loop's shape, not a magic number. The loop **body** still reports.

**`ignoreLengthComparisons`** (default `true`) — **equality only**.
`arguments.length === 3` is an arity check; `users.length > 100` is a business
threshold and still reports.

**22,942 → 15,924** on a 20-repository corpus; **1,635 → 1,421** on the pinned
eight.
