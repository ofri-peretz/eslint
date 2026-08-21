---
'eslint-plugin-conventions': patch
---

`no-commented-code` no longer reports JSDoc blocks.

An `@example` body is the one place a comment is *supposed* to contain code:

```js
/**
 * @example
 *     const x = doThing()
 *     return x
 */
```

Found by the 20-repository case ledger, where `/**` was the single largest
shape — **3,557 → 1,879**, with the pinned corpus unchanged.

Deliberately narrow: only `/**` is exempt. A plain `/* … */`, which is how
people actually comment code out, is still checked.
