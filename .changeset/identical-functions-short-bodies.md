---
'eslint-plugin-maintainability': patch
---

`identical-functions` requires an **exact** match on short bodies.

An adversarial wave reported 6 of 9 deliberately-distinct pairs as duplicates,
every one differing by a single semantically load-bearing token:

```js
const t = 5000   vs   const t = 250
x + y            vs   x - y
x === 1          vs   x !== 1
```

On a three-line body a one-character difference is still 95%+ similar, so a
ratio carries almost no information there. "Extract to a reusable function" is
bad advice for two bodies that differ by an operator — you cannot extract them
without parameterising the very thing that makes them different.

Below 120 normalised characters the answer must now be exact. The ratio still
applies above it, where it means something: a long near-duplicate still
reports, and an exact renamed copy reports at any length.

No change on the pinned corpus.
