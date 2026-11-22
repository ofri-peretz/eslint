---
'eslint-plugin-react-features': minor
---

fix: `no-unknown-property`, `no-deprecated`, `jsx-no-target-blank` and `display-name` agree with eslint-plugin-react on more code (recommended set 75.9% to 83.9%)

Graded by eslint-plugin-react 7.37.5's own test cases, the recommended set goes from 1,656 to 1,830 of 2,181 cases: `no-unknown-property` 155 to 240 of 241, `no-deprecated` 68 to 110 of 110, `jsx-no-target-blank` 194 to 226 of 226, `display-name` 184 to 199 of 214.

- `no-unknown-property` now knows which tags may carry a prop (`crossOrigin` on `<img>` but not `<div>`, `onLoad`, the media events, `fill`, `align`), the React-version gates (`allowTransparency` before 16.1, pointer events from 16.4, `precedence` from 19) and the current attribute table (`fetchPriority`, `webkitdirectory`, `popover*`, `inert`, `shadowroot*`, `is=`), and reports an unknown `aria-*` name. `onFocusIn`, `onFormData` and `onXCapture` on handlers React has no capture twin for are now reported.
- `no-deprecated` reports the pre-15 APIs (`renderComponent`, `addons.*`, `React.DOM`, `this.transferPropsTo`), `react-dom/server`'s `renderToNodeStream`, an unused `import { createClass }`, and lifecycles in a `createReactClass` spec; `ReactDOM.findDOMNode` is no longer reported (`no-find-dom-node` covers it).
- `jsx-no-target-blank` reads a ternary `target` branch by branch, a `rel` ternary on the branch where the target is `_blank`, and `target={null}` or `undefined` as no target; with `warnOnSpreadAttributes` a spread may supply `target`, the URL or `rel`.
- `display-name` reports `module.exports = () => <div />`, `module.exports = createReactClass({...})` and an anonymous component returned from another function, and sees through `as` / `satisfies` around `forwardRef`.

Not changed: a `memo` or `forwardRef` component bound to a variable still counts as named (upstream reports it), `xlink:href` stays unreported, and `settings.react.componentWrapperFunctions` is not read.
