---
'eslint-plugin-react-features': patch
---

fix: `class A extends React['Component']` is the same base class

`no-direct-mutation-state` and `react-class-to-hooks` both gated the
superclass on `superClass.property.type === 'Identifier'`, so a subscripted
`React['Component']` was not recognised as a React component at all — and
every rule that follows from "this is a component" went quiet with it. That
was 25 of the cases the extended probe found.

A base class named at runtime still names nothing, and is pinned as such.
