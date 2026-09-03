---
'eslint-plugin-react-features': patch
---

fix: `export default class extends Component` is still a component

`require-default-props` keyed components by `node.id.name`, so an anonymous
class had no key and was never tracked. A missing `defaultProps` on
`export default class extends Component` — among the most common shapes in
React — reported nothing at all, as did the same omission on a class
expression assigned to a `const`.

Two existing test cases appeared to cover exactly this and did not: both
supplied COMPLETE defaults, so they passed because nothing was missing, while
their names attributed the pass to an anonymous-class branch. A reader would
have concluded the omission was deliberate.
