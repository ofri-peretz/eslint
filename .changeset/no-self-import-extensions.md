---
'eslint-plugin-import-next': patch
---

`no-self-import`: a suffix is not an extension.

The rule stripped the last dotted suffix from both the current filename and the
resolved specifier, then compared. Those were the only two findings it produced
on the pinned 8-repository corpus, and both were wrong:

```
main.jsx            importing './main.css'                  → both became `main`
styleUtils.test.js  importing './styleUtils.test.constants' → both became `styleUtils.test`
```

A stylesheet is not this module, and `.constants` is not an extension at all —
it is part of the module's name. `\.[^/.]+$` cannot tell the difference.

Now: a specifier whose last segment carries a dotted suffix that is not a JS/TS
module extension names a different file, full stop. Otherwise only real module
extensions (`.js .jsx .mjs .cjs .ts .tsx .mts .cts`) are stripped before
comparing. Genuine self-imports — `./real` and `./real.ts` from `real.ts` — are
unaffected, and both are pinned as `invalid` fixtures.

`allowInTests` also moves to the devkit's `isTestFilePath`. It matched
`filename.includes('__tests__')`, which is true of any path containing those
characters anywhere, `~/my__tests__project/src/a.ts` included.
