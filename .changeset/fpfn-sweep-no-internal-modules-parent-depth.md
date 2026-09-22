---
'eslint-plugin-import-next': patch
---

fix: no-internal-modules suggests a path that is actually on the import's path

`getImportAtDepth` stripped only the first `../` from a specifier before slicing path segments, then re-prefixed a single `'../'`. Every additional `..` stayed in the segment list, where the slice consumed it as though it were a real directory name. At `maxDepth: 1`, `'../../a/b/c.js'` suggested `'../..'` and `'../../../a/b/c.js'` suggested `'../..'` as well — two different imports collapsing onto one answer, and that answer is not on either import's path. The rule states its own invariant on the autofix branch: a message that describes a different edit than the one applied is worse than no message. The full traversal prefix is now captured and re-applied. `maxDepth: 0` returns before this code and is unchanged, so the existing root-collapse behaviour is untouched.
