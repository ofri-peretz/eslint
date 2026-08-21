---
'eslint-plugin-reliability': major
---

`no-missing-null-checks` now requires **positive evidence** that a value may be
null, instead of reporting every dereference it could not prove safe.

The old model was a deny-list: report unless the object is provably non-null.
On real source that is very nearly every property access — **38,674 findings
across 8 pinned repositories**, where five security plugins together produce
36. Growing the deny-list cannot converge, because the set of things that are
never null is unbounded without type information.

A finding now needs one of:

- `let x;` that is never written — a read of `undefined`
- `= null` or `= undefined`
- a platform-documented nullable return: `find`, `findLast`, `pop`, `shift`,
  `match`, `exec`, `getElementById`, `querySelector`, `closest`, `getAttribute`

```js
const hit = rows.find((r) => r.id === id)
hit.name                    // reported — find() returns undefined on a miss

function f(user) {
  return user.name          // no longer reported — a parameter says nothing
}                           //   without types
```

`.get` is deliberately excluded: `Map.prototype.get` is genuinely nullable, but
`axios.get`, `router.get` and `cache.get` are far more common and are not.

**Breaking.** A codebase relying on the old blanket reporting will see far
fewer findings. This is a `major` because the rule's contract changed, not
merely its tuning.

Also fixes a guard bug this exposed: `hasNullCheck` matched with
`leftText.endsWith(objectText)`, so in `wrapper.obj && obj.prop` the guard on
`wrapper.obj` suppressed the finding on `obj`. A guard now covers only the
expression it tests and chains that start with it.

Corpus: 38,674 → 127. CWE recall unchanged at 69/69, zero false positives.
