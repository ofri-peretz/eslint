---
'eslint-plugin-react-features': patch
---

`no-unknown-property` no longer fires on custom React components. The rule now
only checks host (lowercase DOM) elements, matching upstream
`react/no-unknown-property` — uppercase and member-expression JSX names
(`<Box surface="card">`, `<Motion.div />`) accept arbitrary props.
