---
'eslint-plugin-node-security': patch
---

fix: an alias to Math.random is found through either spelling

`{ ['next']: Math.random }` declares the slot `{ next: … }` declares, and
`rng['next']()` reads it. Both halves — the object KEY and the member READ —
were pinned as valid side by side, so a token drawn from `Math.random` through
a renamed alias went unreported either way.
