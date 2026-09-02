---
'eslint-plugin-conventions': patch
---

fix: member gates resolve a quoted key without a second arm

`prefer-code-point` and `prefer-dom-node-text-content` each carried a
separate branch for `obj['charCodeAt']` / `element['innerText']` alongside the
dotted one. `propertyName` answers both, so the duplicate arms are gone rather
than left as dead code — as is `shouldIgnoreCall`'s runtime-key arm, which the
caller's own `isCharCodeAtCall` check now filters out first.
