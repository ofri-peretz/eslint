---
'eslint-plugin-react-features': patch
---

fix: `React['Component']` is the same base class as `React.Component`

A class extending `React['Component']` IS a React class component, so a
deprecated lifecycle method on it is the same finding — and
`React['useEffect']` is the same hook, with the same dependency array.
Three tests had pinned all three as valid; the hook's message also said
"unknown" where it can now name the hook.
