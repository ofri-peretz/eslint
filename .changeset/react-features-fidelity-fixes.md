---
'eslint-plugin-react-features': patch
---

fix: every rule decides by code structure and finds React's API by binding (a renamed, namespace or computed import is React's; a local or foreign function of the same name is not), found by the new Quint fidelity models. Preact (`preact`, `preact/hooks`, `preact/compat`) is React's drop-in and counts as React.

- `checked-requires-onchange-or-readonly`: follows React's controlled-input contract: `disabled`, `value={undefined}` and `value` on a checkbox / radio / hidden / submit input are no longer reported; `readOnly={false}` / `disabled={false}` no longer silence it.
- `default-props-match-prop-types`: validators are read by binding to `prop-types` (renamed default import, named import, `.isRequired`), keys in any spelling, and `Comp.propTypes` / `Comp.defaultProps` assignments on function components; a `null` default is no longer a mismatch.
- `display-name`: `memo` / `forwardRef` / `Component` / `createElement` are React's by binding: a renamed or namespace import is recognised, a local `memo` or a `Component` from another library is not; rendering through `React.createElement` counts.
- `hooks-exhaustive-deps`: hooks are React's by binding (renamed, namespace, computed member; a local `useEffect` is not); `useImperativeHandle` reads its callback and deps from the right arguments; a setter of a renamed `useState` import is stable; a capitalised reactive value is a dependency; `[props.x]` covers a read of `props.x`; types in `as` casts are not dependencies; an effect's unused reactive dependency is no longer reported (only a non-reactive one is).
- `jsx-handler-names`: only `on` + an uppercase letter is an event prop (`only`, `online` are not); `{undefined}` is not a handler.
- `jsx-key`: `Children.map` (which keys its results) is no longer judged; a fragment shorthand list item and `React.createElement` without a key are reported; an unstable key is the callback's index parameter by binding, not a variable named `index` / `i`.
- `jsx-max-depth`: fragments count as a level, and elements under `&&` / `?:` count where they are written.
- `jsx-no-bind`: `.bind()` as a conditional branch, after `&&`, or as an optional call is reported.
- `jsx-no-duplicate-props`: a namespaced prop written twice (`xlink:href`) is reported.
- `jsx-no-literals`: braced strings and templates (`{'Hello'}`) are literals; `noStrings: false` turns props off too.
- `jsx-no-script-url`: `xlink:href` and either branch of a conditional are checked; a template is reported once; `includeFromSettings` now reads `settings.linkComponents` (it did nothing).
- `jsx-no-target-blank`: braced `href` / `rel` values are read (a braced same-site link or a braced `rel={"noopener"}` is no longer reported); `_BLANK` and `HTTPS://` are matched case-insensitively.
- `no-access-state-in-setstate`: only the component's own `this.setState` is judged (not `store.setState`); a local read from `this.state` and then used in the update is reported.
- `no-adjacent-inline-elements`: a dynamic child between two inline elements separates them (no longer reported); fragment children are checked; an empty `{/* comment */}` does not separate.
- `no-arrow-function-lifecycle`: only a React class component (by binding) is judged; quoted and computed lifecycle keys are reported.
- `no-children-prop`: quoted / computed `children` keys in a spread and `children` in `React.createElement` props are reported.
- `no-danger`: `dangerouslySetInnerHTML` in a `React.createElement` / `createElement` prop object (identifier or quoted key) is reported.
- `no-danger-with-children`: `{undefined}` / `children={undefined}` / `dangerouslySetInnerHTML={undefined}` and an `undefined` third argument are no longer reported; a single space between the tags, a named / namespace `createElement` import and quoted keys are.
- `no-deprecated`: react-dom and react APIs are found by binding (renamed and namespace imports, `PropTypes` imported by name); a local object named `ReactDOM` is not React; deprecated lifecycles are found on renamed / namespace-import components, as arrow properties and as quoted keys, and not on a `Component` from another library.
- `no-did-mount-set-state`: `setState` in a callback (`fetch().then(() => this.setState(…))`) runs after mount and is no longer reported; `store.setState(…)` and classes that are not React components are not reported; arrow-property and quoted-key `componentDidMount` are.
- `no-did-update-set-state`: an unrelated `if` earlier in the method no longer silences an unguarded call; `cond && this.setState(…)` is a guard; `allowInCallback` now only allows calls inside callbacks (it silenced every call); a call in a callback the method starts unconditionally is reported; arrow-property / quoted-key methods are read.
- `no-direct-mutation-state`: writes in the constructor (initial state) are no longer reported; replacing `this.state` outside the constructor, `this['state'].x = …`, and components imported under another name or by namespace are reported; classes that are not React components are not.
- `no-invalid-html-attribute`: the HTML spelling on a custom element (`<my-widget class>`, `is="…"`) is no longer reported.
- `no-is-mounted`: only React's `this.isMounted()` in a React class component is reported; a flag or variable named `isMounted` (the documented replacement) and another object's `isMounted()` are not.
- `no-multi-comp`: lowercase render helpers and functions that merely contain JSX no longer count as components; `memo` / `forwardRef` components and class-expression components do.
- `no-namespace`: `import type * as T` is no longer reported.
- `no-object-type-as-default-prop`: array and function literal defaults are reported; a class's `static defaultProps` (evaluated once) and defaults in functions that are not components are not.
- `no-redundant-should-component-update`: an arrow property `() => true` and a quoted key are reported; a class that is not a React component, a getter and a static method are not.
- `no-render-return-value`: react-dom's `render` is found by binding (named, renamed, namespace imports); a result returned or passed as an argument is reported; a local object named `ReactDOM` is not.
- `no-set-state`: only a React class component's own `this.setState` is reported; `store.setState(…)`, module-level code and classes that are not React components are not.
- `no-string-refs`: `ref={cond ? "a" : "b"}` and `this.refs` in a React class component are reported.
- `no-this-in-sfc`: only `this` in a function component (a PascalCase function that returns JSX, or a `memo` / `forwardRef` function) is reported; object methods, plain functions, constructor functions and module-level arrows are not.
- Class components are recognised by binding in `no-unsafe`, `state-in-constructor`, `require-render-return`, `no-typos`, `sort-comp`, `static-property-placement`, `prefer-stateless-function`, `prop-types` and `require-default-props`: a renamed or namespace import of `Component` / `PureComponent` and a class expression are components; a `Component` imported from another library is not.
- `no-typos`: a correctly spelt `static propTypes`, `getDerivedStateFromProps`, `PropTypes.string` or any read of a static is no longer reported; a lifecycle or static in another letter case (`ComponentDidMount`, `static PropTypes`), a static lifecycle, and an instance `getDerivedStateFromProps` are. Only React class components are checked.
- `react-in-jsx-scope`: JSX inside a component (not only at module level) is checked; a type-only `import type React` does not count, any value binding named `React` (such as a `require`) does, and `/** @jsxRuntime automatic */` needs none.
- `no-unescaped-entities`: an escaped `&quot;` / `&gt;` / `&#34;` is no longer reported (the rule read the decoded text).
- `void-dom-elements-no-children`: `createElement('br', props, child)` with a child, a `children` prop or `dangerouslySetInnerHTML` is reported.
- `prefer-es6-class`: `create-react-class` under any local name and `React.createClass` on a namespace import or in a computed spelling are reported; a local function or object of the same name is not.
- `no-unsafe`: computed keys (`['UNSAFE_componentWillMount']()`) are read; `static` members are not lifecycles.
- `state-in-constructor`: a `declare state: S` / `static state` is not state initialisation; a computed `['state']` field is.
- `require-render-return`: a render that only throws, or returns from both `try` and `catch`, is no longer reported; `render = () => { … }` with no return is.
- `prefer-stateless-function`: a class with its own methods or fields, `setState`, refs, an arrow-field lifecycle or an error boundary is no longer reported; a class reading only `this.props` / `this.context` is.
- `prop-types`: TypeScript props (`Component<Props>`) and `Card.propTypes = …` declare props; `this.props` read in an arrow handler counts as use. `customValidators` is documented as having no effect.
- `require-default-props`: quoted and computed prop keys, `static ['propTypes']` and `Card.propTypes` / `Card.defaultProps` assignments are read.
- `required-attributes`: React's `Fragment` takes no attribute but `key`, so none is required of it.
- `require-optimization`: a component passed to React's `memo` later (`export default memo(Card)`) is no longer told to use `memo`; a function-expression component is analysed.
- `sort-comp`: computed member names are read; a group the `order` option leaves out falls back to `everything-else` instead of sorting first. The undocumented `groups` option is gone from the docs.
- `static-property-placement`: computed static names are read; `childClass` is documented as having no effect.
- `component-api/no-default-test-id`: a template key (``[`data-testid`]: id = 'x'``) is reported; `= undefined` is no default and is no longer reported.
- `component-api/require-data-slot`: `data-slot={undefined}` is a missing slot; `data-testid={undefined}` is not a named part.
- `component-api/no-is-prefix-prop`: quoted keys and `boolean | undefined` props are reported.
- `component-api/no-kind-prop-discriminator`: quoted keys, `| undefined` / `| null` unions and unions through a local type alias are reported.
- `component-api/no-inline-style`: template, negative-number and static computed-key values are reported; a key chosen at runtime (`[key]`) is not.
- `component-api/no-wrapper-sub-component`: a `memo` passthrough is reported; spreading something other than the props, or props with a named prop destructured out, is not.
- `component-api/no-raw-color-literal`: braced, template and conditional values, conditional / array / object-key builder arguments and renamed clsx / classnames / tailwind-merge imports are read; text that only contains `#` and digits (`title="Issue #123"`, `href="#add"`) is no longer reported.
- `component-api/no-arbitrary-token-class`: braced and conditional `className` values, conditional / array / object-key builder arguments, renamed builder imports, negative utilities (`-mx-[4px]`) and `.5rem` lengths are read.
- `no-unnecessary-rerenders`, `react-render-optimization`, `react-no-inline-functions`: an inline object, array or function prop is reported only where it can cost a re-render: on a component the file wraps in React's `memo` (any spelling, including `memo(forwardRef(...))`) or a `PureComponent` class, or one the file cannot see. A host element (`<button onClick={() => …}>`, `<div style={{…}}>`) and a component defined without `memo` are no longer reported. A choice between two inline functions (`flag ? () => a() : () => b()`) and TypeScript `as` / `satisfies` / `!` are now read.
- `react-no-inline-functions`: a callback passed to a call in JSX (`{items.map((i) => <li/>)}`) is no longer reported; a function child (`<Loader>{(d) => …}</Loader>`) is judged as the `children` prop; `allowInEventHandlers` exempts only `on` + a capital letter (`only=` is not a handler); `minArraySize` is documented as having no effect.
- `react-class-to-hooks`: React class components are found by binding (renamed, namespace and computed imports; class expressions; anonymous `export default class`), and a class extending a `Component` from another library or declared locally is not one. Error boundaries (`componentDidCatch`, `static getDerivedStateFromError`) are not reported: React has no hooks equivalent. `ignorePureRenderComponents` now skips `PureComponent` classes (it was ignored); a quoted `'getSnapshotBeforeUpdate'()` counts as a complex lifecycle.
- `no-find-dom-node`: react-dom's `findDOMNode` is found by binding: a renamed import and a namespace import are reported; a local function or one imported from another module named `findDOMNode` is not.

Docs: `display-name`, `hooks-exhaustive-deps` and `jsx-max-depth` had
placeholder or contradictory examples and now state the contract; `jsx-no-bind`
no longer lists inline arrows (which it never reported) as incorrect; options
are documented for `jsx-no-duplicate-props`, `jsx-no-script-url` and
`jsx-no-target-blank`, and `enableDangerousAutofixThisMayCauseInfiniteLoops` is
documented as having no effect.

Placeholder docs (`no-did-mount-set-state`, `no-multi-comp`) and the template
"Known False Negatives" sections now state each rule's contract;
`no-invalid-html-attribute` documents the attribute-name check it performs (it
never validated values), and `no-object-type-as-default-prop` no longer claims
`static defaultProps` is re-created per render.

Placeholder docs (`react-in-jsx-scope`, `required-attributes`, `sort-comp`,
`static-property-placement`, `no-typos`) and the template "Known False
Negatives" sections now state each rule's contract.

The placeholder docs of `no-unnecessary-rerenders` and
`react-render-optimization` now state each rule's contract.
