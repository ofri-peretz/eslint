---
'eslint-plugin-react-features': patch
---

fix: `React['findDOMNode']` names the same deprecated API

`no-deprecated` built its lookup key from `property.name`, so the subscripted
spelling of a deprecated React member was invisible.
