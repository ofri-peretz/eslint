---
'eslint-plugin-react-features': patch
---

fix: `React['createElement']` builds the same element

`no-danger-with-children` matched the callee on `property.name`, so the
subscripted spelling hid the dangerouslySetInnerHTML-plus-children conflict.
