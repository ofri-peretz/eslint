---
'eslint-plugin-conventions': patch
---

fix: `consistent-existence-index-check` — two detection-scope fixes.

`#field in obj` is no longer reported — a private-name brand check is not one of the four
spellings the rule arbitrates, walks no prototype chain, and has no
own-property form, so the suggested `Object.hasOwn(o, #field)` was a
SyntaxError. And `obj.hasOwnProperty(key, extra)` is now reported: detection was
gated on an undocumented argument count, which suppressed the report rather than
the fix, while the `.call` sibling read the same doc notation as two-or-more.
