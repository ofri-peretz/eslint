# eslint-plugin-react-features

All notable changes to `eslint-plugin-react-features` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 2.0.1

### Patch Changes

- **🧹 Chore** — complete the npm metadata in every package manifest

  Every manifest declares `"sideEffects": false`; no module changes state outside itself when it is loaded, so a bundler may drop what it does not use. The `funding` field is removed: it pointed at the source repository, not at a funding page, so `npm fund` led nowhere useful. Each `oxlint-plugin-*` alias also declares an `exports` map (`.` and `./index.js`, each with `types` first, and `./package.json`); every path that resolved before still resolves. No code changes.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@2.0.1`

## 2.0.0

### Major Changes

- **💥 Breaking** — requires Node 22.13 or later; Node 18 and 20 are end-of-life

  `engines.node` is now `>=22.13.0` (was `>=18.0.0`). Node 22.13, 24 and 26 are the versions tested. Stay on the previous major if you cannot leave Node 18 or 20 yet.

  ## Migration

  Run your linter on Node 22.13 or later, or pin the previous major until you can:

  ```sh
  # Before: any Node 18+
  node --version   # v20.x
  # After: Node 22.13+ (24 and 26 are also tested)
  nvm install 22 && nvm use 22   # or 24, or 26
  ```

  Nothing in your ESLint or oxlint config changes.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@2.0.0`

## 1.8.1

### Patch Changes

- **🐛 Fix** — every rule decides by code structure and finds React's API by binding (a renamed, namespace or computed import is React's; a local or foreign function of the same name is not), found by the new Quint fidelity models. Preact (`preact`, `preact/hooks`, `preact/compat`) is React's drop-in and counts as React.

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

## 1.8.0

### Minor Changes

- **✨ Feature** — every rule runs natively on oxlint and Vite+, published as `oxlint-plugin-<name>` too

  - **`oxlint-plugin-<name>`**: each plugin now has an oxlint-native twin on npm,
    for installs from oxlint or Vite+ (`lint.jsPlugins: ['oxlint-plugin-<name>']`
    in `vite.config.ts`). It re-exports the same rules under the same
    `<name>/<rule>` IDs, at the same version, and does not install ESLint.
  - **`createOnce`**: 457 of 473 rule definitions are written in oxlint's
    `createOnce` shape, with per-file state reset in `before()`. ESLint runs the
    same rule object through a `create` the devkit derives from it, so ESLint
    behaviour is unchanged: every existing test passes, and oxlint parity on the
    benchmark corpus stays at 100% (3,932 shared findings, none on one engine
    only). The remaining 16 are listed, with reasons, in
    `.agent/create-rule-allowlist.json`.
  - **`meta.interop.runtimes`**: every rule now states where it is known to
    behave identically. `['eslint', 'oxlint']` means its own test suite passes
    on oxlint's RuleTester as well as ESLint's, and the tests enforce that on
    every run; type-aware rules stay `['eslint']`. The ESLint-only rules and the
    reason for each are listed in `docs/oxlint-runtimes.md`.

### Patch Changes

- **🐛 Fix** — ESLint is now an optional peer, so oxlint and Vite+ installs stop pulling it in

  npm 7+ installs a required peer automatically. Every plugin, and the shared
  devkit, declared `eslint` as a required peer, so installing a plugin for
  oxlint or Vite+ installed ESLint as well. Measured 2026-10-25:
  `npm i eslint-plugin-postgresql-security` added 79 packages, eslint@10.13.0
  among them; with the peer skipped it added 2. The peer is now marked
  optional. npm still checks the version range whenever ESLint is installed,
  so ESLint users see no change.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.21.0`

## 1.7.11

### Patch Changes

- **🐛 Fix** — `ignoreInTests` now skips `.test`/`.spec` files with `.mjs`, `.cjs`, `.mts` and `.cts` extensions.

  Eight rules matched test files with `/\.(test|spec)\.(ts|tsx|js|jsx)$/`, so a
  `foo.test.cjs` or `foo.spec.mts` was linted as production code despite
  `ignoreInTests` defaulting to `true`. They now use `/\.(test|spec)\.[cm]?[jt]sx?$/`,
  the pattern reliability adopted in #1080: `no-commented-code`, `no-silent-errors`,
  `no-missing-error-context`, `no-external-api-calls-in-utils`,
  `no-missing-aria-labels`, `no-keyboard-inaccessible-elements`,
  `no-unnecessary-rerenders` and `react-render-optimization`.

## 1.7.10

### Patch Changes

- **🐛 Fix** — five FP/FN rule defects found by the burgee sweep

  Each was adversarially verified against the rule's own documented contract
  before a line was changed.

  - `react-features/hooks-exhaustive-deps`: the hook callback's own parameters
    were reported as missing dependencies, and the suggestion's fixer rewrote
    working code into a `ReferenceError`.
  - `secure-coding/no-redos-vulnerable-regex`: `(?:a|a)+` escaped the
    identical-alternatives detector because its regex swallowed the `?:`, and
    every `/v` pattern using a `\p{...}` escape was silently dropped as
    "unparseable" because `unicodeSets` never reached the analyser.
  - `secure-coding/detect-object-injection`: a counter declared in a `for` head
    was cleared on its declaration alone, so reassigning it from user input
    inside the loop body went unreported. The same reassignment now also
    disqualifies an Array-callback index parameter (`(v, i) => { i = k; … }`).
  - `reliability/no-unhandled-promise` and the `maintainability` fork of the same
    rule: appending `.finally(cleanup)` silenced the chain, though `.finally`
    does not handle a rejection. A handler-less
    `.catch()` / `.catch(undefined)` / `.catch(null)` no longer counts as
    handling the chain either.

## 1.7.9

### Patch Changes

- **🐛 Fix** — `no-is-prefix-prop` suggested renaming `isTTY` to `tTY`

  `stripIsPrefix` lowercased exactly one character after the `is` prefix, so a prop whose name continues with an acronym got a suggestion nobody would accept: `isTTY` → `tTY`, `isURL` → `uRL`, `isID` → `iD`. This shipped as an APPLYABLE suggestion with a concrete fix range, so accepting it wrote the mangled name into the source. The leading run of capitals is now lowered as a whole, except a trailing capital that begins the next word, which has to survive — and a capital begins a word only when a lowercase letter follows it: `isTTY` → `tty`, `isURLPath` → `urlPath`, `isURL2FA` → `url2FA`.

- **🐛 Fix** — `jsx-key` suggested `key={item.id}` against callbacks that bind no `item`

  `getIteratorCallbackParamName` returned a name only when the callback's first parameter was an `Identifier`; every other shape — a destructured `({ id, name })`, an array pattern, no parameter at all — fell through to a hard-coded `return 'item'`, which the fixer interpolated verbatim. ESLint applies an accepted suggestion to the source as written, so the result either threw `ReferenceError: item is not defined` at render or, nested inside an outer `.map(item => …)`, resolved silently to the OUTER row and pinned one constant key on every element of the inner list — the reconciliation bug this rule exists to prevent, with React's own "missing key" warning removed along with it.

  A destructured parameter now yields the identifier the pattern already binds (`({ id }) → key={id}`, `({ id: rowId }) → key={rowId}`, read through `objectKeyName` so quoted and computed-but-static keys agree). When no key expression can be derived the report stands on its own and no suggestion is offered. The callback that renders the element decides even when it has no parameter, so `groups.map(item => item.rows.map(() => <li />))` no longer borrows the outer `item.id`. Three pre-existing fixtures asserted the old output and were justified in their own comments by the implementation's fallback ("since param is destructured, fallback is 'item'"); under `AGENTS.md` those pin implementation rather than behaviour, and they have been corrected.

- **🐛 Fix** — `no-this-in-sfc` reported a declared TS `this` parameter, and lost class context on a nested class

  Two defects in the same predicate. A function that declares an explicit `this` parameter has named its own receiver in its signature — `function (this: unknown, ...args)` forwarding through `fn.apply(this, args)` is the canonical shape — and `this` there is a declared contract, not a component mistake; it is now exempt. Separately, class tracking was a boolean flag rather than a depth, so a class nested inside a class cleared the flag on exit and valid `this` in the ENCLOSING class body then reported. It is now a depth counter.

- **🐛 Fix** — `no-object-type-as-default-prop` reported any object destructuring default, anywhere

  The `AssignmentPattern` visitor's only gate was `node.parent.type === 'Property' || 'RestElement'`, which is true of ANY object destructuring — including a plain `const { components = {} } = plugin;` at module scope. The rule's own comment said "destructured parameter in a function component", but nothing checked for a function, a parameter, or a component, so the rule reported code that is not a prop, is never rendered, and runs exactly once. Every harm the docs cite — a new reference on every render, a broken `React.memo`, an ineffective `useMemo` — requires the default to be re-evaluated per render, which only a parameter does. The report is now additionally gated on the pattern spine terminating in a function's `params`. The pre-existing exclusion of whole-object parameter defaults (`function C(props = {})`) is unchanged.

## 1.7.8

### Patch Changes

- **🐛 Fix** — four false positives found by sweeping the plugins over a real corpus

  Each was minimized to a standalone snippet, reproduced under `RuleTester`, and
  then argued against by an independent reviewer before any code changed. Three
  further candidates were rejected at that gate and are not in this release.

  **`no-missing-error-context` (reliability + maintainability)** — a message bound
  to a `const` one line above the `throw` reported "Thrown error missing message",
  which is false about the node:

  ```ts
  const message = 'The importMeta option is required.';
  throw new TypeError(message); // REPORTED
  ```

  `isProvablyString` already walks through `??`, `||`, `?:` and `+`; it now also
  resolves a single `const` definition. `const m = someVar`, a reassigned `let`,
  and `const m = ''` still report.

  **`require-render-return` (react-features)** — detection was the method name and
  nothing else, so any class with a `render` method — a terminal painter, a canvas,
  a template engine — drew a CRITICAL "must return a value" for a method whose
  contract is to return nothing. Now gated on the React superclass check the
  sibling rules already use.

  **`detect-object-injection` (secure-coding)** — `xs.forEach((v, i) => { dst[i] = v })`
  drew CVSS 9.8 on a key ECMA-262 guarantees is a Number, while the identical
  `for` counter was silent. The exemption is gated on the receiver being provably
  an Array: `Map`, `Set`, `Headers`, `FormData` and `URLSearchParams` pass a string
  KEY in that slot and still report.

  **`no-console-spaces` (conventions)** — the fixer deleted newlines from program
  output. `console.log('code=%j\n', code)` was rewritten to drop the `\n`, which
  reaches stdout; `util.format` appends the inter-argument space _after_ a trailing
  newline rather than absorbing it. The predicate and the fixer are both narrowed
  to the literal space that separator actually inserts.

## 1.7.7

### Patch Changes

- **🐛 Fix** — `jsx-no-script-url` now catches control-character-obfuscated `javascript:` URLs

  The scheme test was `/^\s*javascript:/i`, which only strips whitespace BEFORE the scheme. The URL spec has the parser remove leading C0 controls and space and then strip every ASCII tab, line feed and carriage return from anywhere in the input, so an `href` with a tab inside the scheme, or with a leading U+0001, both resolve to `javascript:alert(1)` — verified in Chrome and in Node's WHATWG `URL`, identical to the plain payload the rule already reported. A CVSS 9.5 / CWE-79 rule was silent on two live XSS payloads whose only difference from a reported one is invisible characters. The test is now React's own `sanitizeURL` pattern, which upstream `eslint-plugin-react` uses and which every message this rule emits already links readers to. No documented Correct example and no existing test changes behaviour.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.5`

## 1.7.6

### Patch Changes

- **🐛 Fix** — `require-render-return` now requires every path through an `if` to return, rather than any path. A `render()` whose only `return` sits in an `if` with no `else` falls through and renders nothing — the shape the rule's own docs print under "❌ Incorrect" — and was silently accepted. `if`/`else` where both branches return, and a trailing return after the `if`, remain valid.

  `switch` is now judged the same way. The check asked only whether _any_ clause contained a `return`, so `switch (k) { case 1: return <A/>; }` passed while an unmatched `k` fell straight out and rendered nothing, and a clause ending in `break` did the same. A `switch` now counts as returning only when a `default` exists and every clause ends in a return — its own, or one it falls through into. Empty fallthrough clauses and clauses returning via `if`/`else` remain valid; no clause is required to carry a bare `return` of its own.

- **🐛 Fix** — FP/FN sweep against the burgee corpus — three confirmed rule defects.

  - `no-silent-errors` (maintainability + reliability): `allowWithComment` only examined
    comments above the `catch` keyword, so the canonical placement — the explanation
    inside the block — could not satisfy it. The above-the-catch window is kept and a
    range-scoped scan of the block is added beside it.
  - `consistent-existence-index-check` (conventions): an undocumented parent-type
    allowlist withheld the one autofix the docs promise whenever the call was nested
    (under `!`, inside `&&`, as an argument, array element, or conditional branch).
    Recovers 14 withheld autofixes on the corpus.
  - `no-unnecessary-rerenders` (react-features): a multi-line prop was interpolated raw
    into the message, breaking the documented first line down to the bare token `⚡ {`.
    Whitespace is now collapsed before truncation.

## 1.7.5

### Patch Changes

- **🐛 Fix** — two rules that could not report anything

  **`react-features/static-property-placement` now works.** Its grouping check ended in an empty `if` — the `context.report` had been deleted alongside a genuinely unreachable branch beside it, leaving a condition whose answer nobody used. The rule ships under two export names, so a config that enables every rule of every plugin got it at `error` and never heard from it. Its 21 `valid` cases all passed, and none of them could have failed: a rule with no `context.report` satisfies every valid case ever written for it.

  The question it asked was wrong too. Two **adjacent** static properties from different groups is what correct grouping looks like; the defect is a group **resuming** after another group came between it and its earlier members. That is now what it reports. A static property belonging to no configured group does not break a group — nothing says it does not belong there. `static [propTypes] = {}` is also no longer read as the property `propTypes`; a computed key is whatever the variable holds.

  **`reliability/no-jsdoc-terminator-in-example` is deprecated.** It looks for `*/` inside a JSDoc `@example`, and a block comment ends at its _first_ `*/` — so a comment's value can never contain one. Constructing the case produces a parse error, not a finding. Nothing you can write will make this rule fire, which is why it has no defect cases. Remove it from your config; `findTerminatorsInExamples` remains exported and unit-tested.

## 1.7.4

### Patch Changes

- **🐛 Fix** — `void-dom-elements-no-children` no longer reports `<Link>`, `<Img>`, `<Input>` and other capitalized components

  `<Link href="/docs">Read the floor</Link>` from `next/link` was reported as
  "`<link>` is a void element and cannot have children". The tag-name check
  lower-cased the JSX name before looking it up, so any component whose name
  differed from a void element only by case was treated as that element.

  JSX resolves a capitalized name to a binding, never to a DOM tag. Only a
  lowercase `JSXIdentifier` (`link`, `img`, `br`, …) can be a void DOM element,
  and that is now the only thing the rule matches.

## 1.7.3

### Patch Changes

- **🐛 Fix** — The README logo now links to the plugin's own documentation.

  Every plugin README opens with the Interlace logo, and it linked to the
  site root — so the most obvious thing to click on the npm page dropped
  the reader on a landing page and left them looking for the plugin they
  were already reading about. Both the header and footer logos now point
  at that plugin's docs page.

  The oxlint and ESLint logos still link to oxc.rs and eslint.org, which
  is where those belong.

  No rule behaviour changes.

## 1.7.2

### Patch Changes

- **🐛 Fix** — `export default class extends Component` is still a component

  `require-default-props` keyed components by `node.id.name`, so an anonymous
  class had no key and was never tracked. A missing `defaultProps` on
  `export default class extends Component` — among the most common shapes in
  React — reported nothing at all, as did the same omission on a class
  expression assigned to a `const`.

  Two existing test cases appeared to cover exactly this and did not: both
  supplied COMPLETE defaults, so they passed because nothing was missing, while
  their names attributed the pass to an anonymous-class branch. A reader would
  have concluded the omission was deliberate.

- **🐛 Fix** — `class A extends React['Component']` is the same base class

  `no-direct-mutation-state` and `react-class-to-hooks` both gated the
  superclass on `superClass.property.type === 'Identifier'`, so a subscripted
  `React['Component']` was not recognised as a React component at all — and
  every rule that follows from "this is a component" went quiet with it. That
  was 25 of the cases the extended probe found.

  A base class named at runtime still names nothing, and is pinned as such.

- **🐛 Fix** — misspelled members and PropTypes validators read through a string subscript

  `no-typos` checked class properties, methods and member reads on the dotted
  spelling only, so `class A { ["defaulProps"] = 1 }` and
  `Component['defaulProps']` carried the same misspelling unreported.
  `default-props-match-prop-types` resolved `PropTypes['number']` as no
  validator at all, which silently disabled the whole comparison for that prop.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.2`

## 1.7.1

### Patch Changes

- **🐛 Fix** — no-arbitrary-token-class scans a tagged className again

  `@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
  typed it `string` and emitted the RAW text for an escape it could not cook,
  8.68.0 types it `string | null` and emits `null`. Both directions were verified
  against a real 8.54.0 install, not read off a changelog.

  The rule selects `TemplateElement` under a `className` attribute, so a tagged
  template reaches it and a null `cooked` skipped the quasi — `rounded-[12px]`
  shipped unreported. It falls back to `raw`; the lock fails when the fallback is
  `''` instead.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.1`

## 1.7.0

### Minor Changes

- **🐛 Fix** — `items['map'](…)` is the same iteration as `items.map(…)`

  `jsx-key` — `items['map'](i => <li />)` and `Array['from'](items, fn)` reach the same properties the dotted spelling does, and the rule went
  silent on it. That is the notation bundlers emit, so the rule was off on built
  output.

  A dynamic `o[m]` has no statically known property name, so it is still ignored.

### Patch Changes

- **🐛 Fix** — deep-link, CORS, IAM and state-mutation gates read a subscripted member

  `Linking['openURL'](event['url'])`, `res['setHeader']('Access-Control-Allow-Origin', '*')`,
  `registry['create'](payload)` and `this.state.items['push'](x)` each do exactly
  what their dotted spellings do. Seven gates across three plugins compared
  `property.name` before asking what the property was.

  Two more tests had pinned the miss — one describing the guard ("property is not
  an Identifier"), the other the notation ("computed callee property").

- **🐛 Fix** — `React['Component']` is the same base class as `React.Component`

  A class extending `React['Component']` IS a React class component, so a
  deprecated lifecycle method on it is the same finding — and
  `React['useEffect']` is the same hook, with the same dependency array.
  Three tests had pinned all three as valid; the hook's message also said
  "unknown" where it can now name the hook.

- **🐛 Fix** — `ReactDOM['render'](…)` is the same deprecated call

  A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
  compared `property.name` before asking what the property was. They now resolve
  through the devkit's `propertyName`, which still abstains on the one shape that
  genuinely cannot be resolved: a key chosen at runtime, whose name is not
  statically known.

- **🐛 Fix** — `React['findDOMNode']` names the same deprecated API

  `no-deprecated` built its lookup key from `property.name`, so the subscripted
  spelling of a deprecated React member was invisible.

- **🐛 Fix** — `React['createElement']` builds the same element

  `no-danger-with-children` matched the callee on `property.name`, so the
  subscripted spelling hid the dangerouslySetInnerHTML-plus-children conflict.

- **🧹 Refactor** — hook and state-mutation reads carry `string | null` instead of casting it away

  `SET.has(propertyName(node) as string)` reaches the right answer for the wrong
  reason. `propertyName` returns `string | null` because `o[k]` names a property
  the AST cannot read, and that is not the same answer as "named, and not one of
  these" — the cast collapses both, and `Set.prototype.has(null)` being false is
  what made it look correct.

  5 sites across 4 files now ask the two questions separately, via
  `namesOneOf` / `memberPropertyName` from the devkit or an explicit `!== null`.

  No rule behaviour changes: this package's test count and coverage are unchanged.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.0`

## 1.6.1

### Patch Changes

- **🐛 Fix** — Add an install-size badge to the README prelude, linking to each package's packagephobia page. npm renders the README from the last publish, so a badge only appears on npmjs.com after a release.

  Install size rather than bundle size: bundlephobia measures a browser bundle,
  and nobody bundles an ESLint plugin into one, so the number would describe no
  real cost. It was also returning `429` for every package, `react` included.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.2`

## 1.6.0

### Minor Changes

- **✨ Feature** — **🐛 Fix** — a template literal is a string, in 82 rules that disagreed

  A rule that matched `require('child_process')` did not match
  ``require(`child_process`)``. A rule that matched `res.headers['x-api-key']`
  did not match ``res.headers[`x-api-key`]``. Nothing about the two spellings
  differs at runtime, and no consumer chose one on purpose — which is exactly
  why the miss was invisible: the rule looked correct in its own tests, because
  its tests were written in the same spelling as its implementation.

  Rules across these plugins now read a static string wherever the value is
  statically known: a plain literal, a template literal with no substitutions,
  and a concatenation of either. The same pass fixed computed member access, so
  `o['foo']` is read wherever `o.foo` was.

  **These rules now report on code they previously stayed quiet on.** That is
  the point — the missed spelling was a false negative, not an exemption — but
  a codebase written with backticks may see new findings on upgrade.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.0`

## 1.5.0

### Minor Changes

- **🐛 Fix** — `hooks-exhaustive-deps` decides stability by resolving the binding, not by its name

  Stability was matched against three name patterns — `/^set[A-Z]/`,
  `/dispatch/i`, `/Ref$/` — and that failed in both directions at once.

  It **reported real refs** whose names did not fit: `savedCallback`,
  `nextJwtToken`, `frame` and `timeout` were all `useRef` bindings required as
  dependencies across the pinned corpus, where React's own rule reports none of
  them.

  Worse, it **silently exempted reactive values** whose names happened to fit. A
  genuinely missing dependency named `setUpValue` or `dispatchTime` was dropped
  without a word — a stale closure that ships.

  Stability is now read from the binding: a `useRef(...)` call, or the second
  element of a `useState`/`useReducer` destructuring. Values from module scope or
  unresolved identifiers — imports, globals — are not reactive, which matches
  React and also fixes a pre-existing false positive on module-scope imports.

  Verified against `react-hooks/exhaustive-deps` on nine cases; it now agrees on
  all of them.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.4`

## 1.4.0

### Minor Changes

- **🐛 Fix** — `no-unknown-property` stops reporting on custom elements and `xmlns`

  A census of all 65 findings on the pinned corpus found **65 false positives** in
  two classes.

  **Custom elements.** The rule skipped custom _components_ by their capital
  letter, but a web component is lowercase — `<altcha-widget>` — so it looked
  like a host element and every one of its attributes was reported. React passes
  attributes to custom elements through verbatim, and the HTML spec requires a
  hyphen in the name, which is the signal that was missing.

  **XML namespace attributes.** `xmlns` and `xmlnsXlink` on `<svg>` are valid
  React attributes and are emitted by every icon exporter.

  The message also read _"Unknown DOM property detected"_ without naming the
  property, which is unactionable even when the finding is right. It now reads
  `` `flooble` is not a DOM property of `<div>` ``.

  The rule keeps its job: `class` instead of `className`, and unknown attributes
  on ordinary tags, still report.

### Patch Changes

- **🐛 Fix** — `no-unknown-property` reported `loading`, `decoding`, and `fetchPriority` — three standard React DOM props for `<img>` (and `<iframe>`/`<link>`/`<script>` where applicable). `loading` and `decoding` have been valid React props for years; `fetchPriority` is the React 19 camelCase form. All three are in upstream eslint-plugin-react's known-property list; ours was missing them, so every lazy-loaded image in a consumer codebase produced three false positives.

  The lowercase HTML form `fetchpriority` still reports (positive-control test
  locks both directions).

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.3`

## 1.3.1

### Patch Changes

- **🐛 Fix** — point `meta.docs.url` at documentation that exists ([#683](https://github.com/ofri-peretz/eslint/pull/683))

  `meta.docs.url` is what ESLint hands to editors, CLI output and SARIF, so a wrong
  value is a dead "see docs" link in every consumer's IDE. It was wrong for 319 of
  478 rules, all pointing at `packages/eslint-plugin/` — a package that does not
  exist in this repo.

  `withCanonicalDocsUrls` already existed to fix this, but `docsUrlFor` hardcoded
  the `/docs/security/` path segment, so it could not express the nine quality
  plugins and rollout had stalled at three of twenty-six. The category is now
  derived per plugin, and every documented plugin stamps its rules on export.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.2`

## 1.3.0

### Minor Changes

- [#565](https://github.com/ofri-peretz/eslint/pull/565) [`4e26fd3`](https://github.com/ofri-peretz/eslint/commit/4e26fd3f7543fae34fb72dca029dafc9d254e831) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Two React rules now judge evidence rather than names.

  **`display-name`** reported every component. `hasDisplayNameInScope()` returned a
  hardcoded `false` under a comment reading "For now, always require explicit
  displayName", so `function Profile() {}` and `const Profile = () => {}` were both
  findings — in a codebase where every component is named, that is every component.
  React reads the display name off `Function.name` / `Class.name`, so those are
  already named and there was nothing to fix.

  It now reports the three shapes React genuinely cannot name: an anonymous
  `export default`, an anonymous class component, and `memo`/`forwardRef` with no
  binding to take a name from. Wrapper calls are walked through, so
  `const Row = memo(forwardRef(fn))` stays quiet. Measured at 4 of 67 files on the
  benchmark's safe corpus before the fix, all four this defect.

  If you were suppressing this rule because of the noise, it is worth re-enabling.

  **`alt-text`** now resolves `next/image` from its **import** rather than requiring
  `{ img: ['Image'] }` — a default nobody sets, on the framework most likely to need
  it. A renamed default import (`import Pic from 'next/image'`) is caught;
  `next/legacy/image` and `next/future/image` too. A same-named `<Image>` from an
  unrelated package is not, and neither is `getImageProps` aliased to `Image`, which
  returns props rather than rendering.

  This is new detection: expect findings on Next.js images that were previously
  invisible.

### Patch Changes

- Updated dependencies [[`20b22aa`](https://github.com/ofri-peretz/eslint/commit/20b22aab4cf3f49f9c3f72b8235550b55db92fb8)]:
  - @interlace/eslint-devkit@1.16.0

## 1.2.12

### Patch Changes

- [#499](https://github.com/ofri-peretz/eslint/pull/499) [`47070de`](https://github.com/ofri-peretz/eslint/commit/47070de2ccb391252891c72633191709a9bdd03c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Bound the TypeScript peer range and declare the React peer

  `maintainability`, `react-features` and `import-next` shipped
  `"typescript": ">=4.8.4"`, which claims support for every future major —
  including ones the repo has already pinned Dependabot away from. The range is
  now the majors actually tested: `^4.8.4 || ^5.0.0 || ^6.0.0`.

  `react-a11y` and `react-features` lint `JSXElement`, `JSXAttribute` and
  `JSXOpeningElement` and named no React peer, so nothing recorded which React
  majors their rules were written against. Both now declare
  `react: ^17 || ^18 || ^19`, optional, so no adopter is forced to install it.

## 1.2.11

### Patch Changes

- [#407](https://github.com/ofri-peretz/eslint/pull/407) [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the declared ESLint floor: `^8.0.0` → `^8.40.0`.

  `context.sourceCode` landed in ESLint 8.40. The shared devkit reads it without a
  fallback and 20 plugins read it directly, so on ESLint 8.0–8.39 the install
  resolved cleanly and then every rule threw
  `Cannot read properties of undefined (reading 'ast')` at lint time — npm reported
  nothing, because the manifest claimed the version was supported.

  Measured on 8.0.0 / 8.39.0 (throw on load) versus 8.40.0 / 8.57.1 / 9.0.0 /
  9.39.2 / 10.8.0 (all produce the expected finding). No runtime behaviour
  changes; this only makes the manifest match what the code can actually run.

- [#423](https://github.com/ofri-peretz/eslint/pull/423) [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the ESLint peer range shown in the README Compatibility table.

  The manifest floor moved to 8.40.0, but every package README still advertised
  `^8.0.0 || ^9.0.0 || ^10.0.0`. The README is what npm renders on the package
  page, so the requirement consumers actually read disagreed with the one npm
  enforced: an install on 8.39.x warns about a peer conflict while the README
  says that version is supported.

  The range was missed by the original sweep because a markdown table escapes
  the union as `\|\|`, so a grep for the plain shape matched none of the 29
  files.

  Also updates `.agent/rules/readme-structure.md` and
  `.agent/compatibility-matrix.md`, which template this table for new packages,
  and adds a README-vs-manifest assertion to
  `scripts/__tests__/eslint-peer-floor.test.ts` so the two cannot drift again.

- [#309](https://github.com/ofri-peretz/eslint/pull/309) [`237a6b0`](https://github.com/ofri-peretz/eslint/commit/237a6b03313e2ea935999ee84b2a6c8af33e50bc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `meta.hasSuggestions` now matches what each rule actually emits.

  ILB-Remediation measured 27 rules where the declaration and the implementation
  disagreed: 22 declared `hasSuggestions: true` without ever passing `suggest:`
  to `context.report()` (IDE quick-fix menus advertising remediation that never
  arrives), and 5 emitted `suggest:` without the declaration (latent — ESLint
  throws on that combination as soon as one of those suggestions carries a real
  fixer).

  `eslint-plugin-mongodb-security` gains four real suggestions where the rewrite
  is mechanical:

  - `require-lean-queries` — appends `.lean()`
  - `no-unbounded-find` — appends `.limit(100)`
  - `no-debug-mode-production` — rewrites the flag to `process.env.NODE_ENV !== 'production'`
  - `require-tls-connection` — adds (or flips) `tls: true` in the connection options

  Every other dead declaration was removed rather than faked. A workspace lock
  (`scripts/__tests__/suggestions-meta-lock.test.ts`) now fails CI on either
  direction of the drift.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 1.2.10

### Patch Changes

- [#411](https://github.com/ofri-peretz/eslint/pull/411) [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Ship the JavaScript without tsc's layout.

  Every emitted `.js` is re-written through esbuild's `minifyWhitespace`, which
  removes indentation and line breaks. Across the ecosystem that is 3233 kB ->
  2023 kB of shipped JavaScript, a 37% cut; on disk a package install drops about
  28%. Indentation alone was ~32% of a compiled rule file.

  This is deliberately NOT minification. Identifiers keep their names, string
  contents are untouched, and the syntax tree is not rewritten — rule `meta`
  (messages, schema, docs URLs) stays byte-identical, which is what the docs site
  and `--print-config` read, and a stack trace from inside a rule still names
  the function it came from. Full mangling would have bought another 4 kB gzipped
  and cost both.

  Verified against the published artifact: identical lint findings including
  message IDs, identical rule names, and zero differences across every rule's
  meta, messages, schema and presets.

- Updated dependencies [[`7663cfd`](https://github.com/ofri-peretz/eslint/commit/7663cfda0d2c41b4c7dc0b4c680550cb74a27faa), [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31)]:
  - @interlace/eslint-devkit@1.10.0

## 1.2.9

### Patch Changes

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Load rule modules on demand instead of at plugin load.

  Every plugin barrel used to `require` all of its rules the moment ESLint loaded
  the plugin, whether or not your config enabled them. `plugin.rules[id]` is only
  ever read for rules a config turns on, so the rest was parse-and-compile cost
  for code that never ran.

  The published entry now exposes each rule behind a getter, so a rule module is
  read the first time something asks for it. Measured on a 7-plugin config with 34
  rules enabled: 163 rule modules loaded and 251 ms of plugin load, against 34
  modules and 8.5 ms — total ESLint wall time 251 ms → 109 ms. On a preset that
  enables most of a plugin (`node-security/recommended`, 25 of 37) it is a wash,
  72 ms → 65 ms. It is never slower; the win scales with how many plugins you
  stack and how few of their rules you use.

  Nothing about the plugin API changes. `Object.keys(plugin.rules)` still lists
  every rule without loading any of them, repeated reads return the same object,
  and the `./oxlint` sub-export is the same plugin object it always was.

  `eslint-plugin-jwt` and `eslint-plugin-vercel-ai-security` also re-export their
  rule objects as named top-level exports, which cannot be deferred — those two
  keep loading eagerly.

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Declare what we support, load only what we use

  **`tslib` is gone from every package.** It was a NON-optional peer of
  `@interlace/eslint-devkit`, so all 26 plugins declared it as a dependency to
  satisfy that peer — 124 kB every consumer installed so twelve
  `require("tslib")` calls could resolve. The shipped JavaScript now inlines
  the TypeScript helpers instead (`--importHelpers false` on the emit pass that
  already re-writes it), costing ~9.5 kB in devkit. Zero `tslib` requires remain
  anywhere; verified by installing every plugin with no `tslib` in the tree and
  loading all 26 with every rule intact.

  **`eslint-plugin-import-next` had a phantom dependency.** Its rules
  `require("typescript")` at module load, but it was declared in neither
  `dependencies` nor `peerDependencies` — it worked only because something else
  in the tree happened to install it. A clean install crashed the whole plugin,
  not just the type-aware rules. `typescript` is now a required peer, which is
  what the code actually needs.

  **23 "technologies we support" declarations did nothing.** Seven plugins
  listed their target libraries in `peerDependenciesMeta` with no matching
  `peerDependencies` entry, and npm ignores meta for a package that is not
  declared a peer — verified by installing `eslint-plugin-express-security` and
  watching nothing install and nothing warn. `eslint-plugin-jwt` appeared to
  support six JWT libraries and formally supported none. All 23 are now real
  optional peers, matching the convention `pg`, `mongodb`, `prisma` and the
  other nine already followed:

  | plugin                                                          | technologies now actually declared                                                                    |
  | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
  | `eslint-plugin-jwt`                                             | jsonwebtoken, @nestjs/jwt, express-jwt, jose, jwks-rsa, jwt-decode                                    |
  | `eslint-plugin-lambda-security`                                 | @aws-sdk/client-lambda, @middy/core, @middy/http-cors, @middy/http-security-headers, @middy/validator |
  | `eslint-plugin-express-security`                                | express, helmet, cors, csurf, express-rate-limit                                                      |
  | `eslint-plugin-nestjs-security`                                 | @nestjs/common, @nestjs/throttler, class-validator, class-transformer                                 |
  | `eslint-plugin-vercel-ai-security`                              | ai                                                                                                    |
  | `eslint-plugin-maintainability`, `eslint-plugin-react-features` | typescript                                                                                            |

  All optional, so nothing is installed on the consumer’s behalf — the
  declaration is the supported-technology signal, which is exactly what it was
  meant to be.

  **A new gate compares declared dependencies against what the emitted
  JavaScript actually loads**, in both directions: a `require` with no
  declaration (works until someone installs cleanly) and a declaration nothing
  requires (weight every consumer pays). It understands that a dependency may
  exist to satisfy an optional peer of another dependency, which is why
  `eslint-plugin-import-next` legitimately declares `oxc-resolver` that devkit
  lazily loads.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix SDK peer declarations that npm silently ignored

  Twelve plugins listed their target SDKs under `peerDependenciesMeta` with
  `{"optional": true}` but never declared them in `peerDependencies`. npm drops
  any `peerDependenciesMeta` entry that has no matching `peerDependencies` key,
  so the metadata was inert — these packages effectively declared **no SDK peer
  at all**. Nothing warned: the failure mode of a dependency you never declared
  is silence.

  Each SDK now appears in both maps, matching the shape `eslint-plugin-pg` and
  `eslint-plugin-mongodb-security` already use — a supported major range in
  `peerDependencies`, `optional: true` in `peerDependenciesMeta`:

  | Plugin               | SDK                              | Range                                        |
  | :------------------- | :------------------------------- | :------------------------------------------- |
  | `express-security`   | `express`                        | `^4.0.0 \|\| ^5.0.0`                         |
  |                      | `helmet`                         | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`             |
  |                      | `cors`                           | `^2.0.0`                                     |
  |                      | `csurf`                          | `^1.0.0`                                     |
  |                      | `express-rate-limit`             | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
  | `jwt`                | `jsonwebtoken`                   | `^8.0.0 \|\| ^9.0.0`                         |
  |                      | `@nestjs/jwt`                    | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `express-jwt`                    | `^7.0.0 \|\| ^8.0.0`                         |
  |                      | `jose`                           | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `jwks-rsa`                       | `^3.0.0 \|\| ^4.0.0`                         |
  |                      | `jwt-decode`                     | `^3.0.0 \|\| ^4.0.0`                         |
  | `lambda-security`    | `@aws-sdk/client-lambda`         | `^3.0.0`                                     |
  |                      | `@middy/core`                    | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-cors`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-security-headers`   | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/validator`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `maintainability`    | `typescript`                     | `>=4.8.4`                                    |
  | `nestjs-security`    | `@nestjs/common`                 | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `@nestjs/throttler`              | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `class-validator`                | `^0.14.0 \|\| ^0.15.0`                       |
  |                      | `class-transformer`              | `^0.5.0`                                     |
  | `react-features`     | `typescript`                     | `>=4.8.4`                                    |
  | `vercel-ai-security` | `ai`                             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `jwt-security`       | same six as `jwt`                | (identical ranges)                           |
  | `openai-security`    | `openai`                         | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@openai/agents`                 | `>=0.1.0 <1.0.0`                             |
  | `anthropic-security` | `@anthropic-ai/sdk`              | `>=0.1.0 <1.0.0`                             |
  |                      | `@anthropic-ai/claude-agent-sdk` | `>=0.1.0 <1.0.0`                             |
  | `gemini-security`    | `@google/genai`                  | `^1.0.0 \|\| ^2.0.0`                         |
  | `mcp-sdk-security`   | `@modelcontextprotocol/sdk`      | `^1.0.0`                                     |

  Ranges were taken from each SDK's real release history, bounded below by the
  oldest major whose call shape the rules still match and above by the current
  major. `cors`, `csurf`, `class-transformer` and `@aws-sdk/client-lambda` have
  only ever shipped one usable major. The `ai` range spans v4 because
  `require-max-steps` deliberately accepts both the v4 `maxSteps` option and the
  v5+ `stopWhen` form. The two `typescript` entries reuse the `>=4.8.4` bound
  `@interlace/eslint-devkit` already declares, since these are the same
  type-aware-graceful rules behind the same optional TS program.

  Every range admits the version this repo's `__compatibility__` specs are
  actually tested against, so the declaration cannot drift from what CI proves.

  The four SDKs still on `0.x` (`@openai/agents`, both Anthropic packages) use an
  explicit `>=0.1.0 <1.0.0` rather than a caret, because `^0.115.0` resolves to
  `>=0.115.0 <0.116.0` — a range narrow enough to warn on almost every real
  install. These rules match on call shape and never import the SDK, so the
  honest constraint is the pre-1.0 line, not a single minor.

  `peer-declaration-integrity.test.ts` now locks the invariant across every
  workspace package: a `peerDependenciesMeta` key with no `peerDependencies` twin
  fails the suite and is named in the diff. This class had already been fixed
  once, in a commit that never merged — nothing went red in its absence, so the
  bug came back on four newly published packages. A silent failure needs a lock,
  not review attention.

  **Nothing to migrate.** Every entry stays optional, so no install adds a
  package or emits a warning when the SDK is absent. What changes is that a
  consumer on an unsupported major now gets a peer warning instead of nothing —
  which was the point of the metadata in the first place.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 1.2.8

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 1.2.7

### Patch Changes

- [#358](https://github.com/ofri-peretz/eslint/pull/358) [`1b8c0df`](https://github.com/ofri-peretz/eslint/commit/1b8c0df38d460dda7d18e886c891984208e62259) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix SDK peer declarations that npm silently ignored

  Seven plugins listed their target SDKs under `peerDependenciesMeta` with
  `{"optional": true}` but never declared them in `peerDependencies`. npm drops
  any `peerDependenciesMeta` entry that has no matching `peerDependencies` key,
  so the metadata was inert — these packages effectively declared **no SDK peer
  at all**. Nothing warned: the failure mode of a dependency you never declared
  is silence.

  Each SDK now appears in both maps, matching the shape `eslint-plugin-pg` and
  `eslint-plugin-mongodb-security` already use — a supported major range in
  `peerDependencies`, `optional: true` in `peerDependenciesMeta`:

  | Plugin               | SDK                            | Range                                        |
  | :------------------- | :----------------------------- | :------------------------------------------- |
  | `express-security`   | `express`                      | `^4.0.0 \|\| ^5.0.0`                         |
  |                      | `helmet`                       | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`             |
  |                      | `cors`                         | `^2.0.0`                                     |
  |                      | `csurf`                        | `^1.0.0`                                     |
  |                      | `express-rate-limit`           | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
  | `jwt`                | `jsonwebtoken`                 | `^8.0.0 \|\| ^9.0.0`                         |
  |                      | `@nestjs/jwt`                  | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `express-jwt`                  | `^7.0.0 \|\| ^8.0.0`                         |
  |                      | `jose`                         | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `jwks-rsa`                     | `^3.0.0 \|\| ^4.0.0`                         |
  |                      | `jwt-decode`                   | `^3.0.0 \|\| ^4.0.0`                         |
  | `lambda-security`    | `@aws-sdk/client-lambda`       | `^3.0.0`                                     |
  |                      | `@middy/core`                  | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-cors`             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-security-headers` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/validator`             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `maintainability`    | `typescript`                   | `>=4.8.4`                                    |
  | `nestjs-security`    | `@nestjs/common`               | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `@nestjs/throttler`            | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `class-validator`              | `^0.14.0 \|\| ^0.15.0`                       |
  |                      | `class-transformer`            | `^0.5.0`                                     |
  | `react-features`     | `typescript`                   | `>=4.8.4`                                    |
  | `vercel-ai-security` | `ai`                           | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |

  Ranges were taken from each SDK's real release history, bounded below by the
  oldest major whose call shape the rules still match and above by the current
  major. `cors`, `csurf`, `class-transformer` and `@aws-sdk/client-lambda` have
  only ever shipped one usable major. The `ai` range spans v4 because
  `require-max-steps` deliberately accepts both the v4 `maxSteps` option and the
  v5+ `stopWhen` form. The two `typescript` entries reuse the `>=4.8.4` bound
  `@interlace/eslint-devkit` already declares, since these are the same
  type-aware-graceful rules behind the same optional TS program.

  Every range admits the version this repo's `__compatibility__` specs are
  actually tested against, so the declaration cannot drift from what CI proves.

  **Nothing to migrate.** Every entry stays optional, so no install adds a
  package or emits a warning when the SDK is absent. What changes is that a
  consumer on an unsupported major now gets a peer warning instead of nothing —
  which was the point of the metadata in the first place.

- Updated dependencies [[`e8e9ee6`](https://github.com/ofri-peretz/eslint/commit/e8e9ee6d521bac301d0554e54ec22afbe8f49e98)]:
  - @interlace/eslint-devkit@1.7.0

## 1.2.6

### Patch Changes

- [#338](https://github.com/ofri-peretz/eslint/pull/338) [`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Re-publish every package so npm carries the optimised artifact

  No source changed. This is a no-op patch whose entire purpose is to ship the
  artifact the current build already produces.

  **Manifests.** `scripts` and `devDependencies` are now stripped from every
  published `package.json`. Neither can do anything in a consumer’s
  node_modules — npm never runs one and never installs the other — but they
  shipped in all 27 manifests, cluttered the npm page, and were read by SCA
  tools scanning installed manifests. No package declares a lifecycle hook, so
  nothing observable changes. Every published package is bumped so this applies
  uniformly rather than to a subset.

  **Tarballs.** 20 packages were last published before the build pipeline
  changed and still ship `AGENTS.md`, `CHANGELOG.md`, JSDoc in the emitted
  `.js`, and the full generated `.d.ts` tree:

  | package                            | published | rebuilt | saving  |
  | ---------------------------------- | --------- | ------- | ------- |
  | `eslint-plugin-react-features`     | 547 kB    | 320 kB  | −227 kB |
  | `eslint-plugin-secure-coding`      | 653 kB    | 477 kB  | −176 kB |
  | `eslint-plugin-conventions`        | 241 kB    | 116 kB  | −125 kB |
  | `eslint-plugin-browser-security`   | 380 kB    | 291 kB  | −89 kB  |
  | `eslint-plugin-maintainability`    | 178 kB    | 116 kB  | −62 kB  |
  | `eslint-plugin-react-a11y`         | 232 kB    | 173 kB  | −59 kB  |
  | `eslint-plugin-reliability`        | 148 kB    | 90 kB   | −58 kB  |
  | `eslint-plugin-vercel-ai-security` | 187 kB    | 130 kB  | −57 kB  |
  | `eslint-plugin-operability`        | 90 kB     | 43 kB   | −47 kB  |
  | `eslint-plugin-jwt`                | 140 kB    | 95 kB   | −45 kB  |
  | `eslint-plugin-modularity`         | 98 kB     | 58 kB   | −40 kB  |
  | `eslint-plugin-nestjs-security`    | 122 kB    | 86 kB   | −36 kB  |
  | `eslint-plugin-sqlite-security`    | 54 kB     | 20 kB   | −34 kB  |
  | `eslint-plugin-sequelize-security` | 54 kB     | 21 kB   | −34 kB  |
  | `eslint-plugin-prisma-security`    | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-mysql-security`     | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-typeorm-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-drizzle-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-knex-security`      | 51 kB     | 19 kB   | −32 kB  |
  | `eslint-plugin-modernization`      | 45 kB     | 38 kB   | −7 kB   |

  Those 20 go from 3428 kB to 2169 kB — **−36.7%**. The remaining
  7 were released after the pipeline change and only gain the manifest strip.

  A new check in `scripts/check-published-artifacts.ts` fails the build if
  `scripts` or `devDependencies` ever reappear in a published manifest, so the
  strip cannot silently regress.

  The dependency ranges did **not** need updating: every plugin pins
  `@interlace/eslint-devkit` with a caret that 1.6.0 satisfies, verified by a
  clean install of an unchanged plugin resolving devkit 1.6.0 with zero
  dependencies and no `typescript` in the tree.

- Updated dependencies [[`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f)]:
  - @interlace/eslint-devkit@1.6.1

## 1.2.5

### Patch Changes

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 1.2.4

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.2.3

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.2.2

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.2.1

### Patch Changes

- [#229](https://github.com/ofri-peretz/eslint/pull/229) [`acc81a7`](https://github.com/ofri-peretz/eslint/commit/acc81a74d0c329027bf6011f5db4b1bf9beba650) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unknown-property` no longer fires on custom React components. The rule now
  only checks host (lowercase DOM) elements, matching upstream
  `react/no-unknown-property` — uppercase and member-expression JSX names
  (`<Box surface="card">`, `<Motion.div />`) accept arbitrary props.

## 1.2.0

### Minor Changes

- [#100](https://github.com/ofri-peretz/eslint/pull/100) [`fcb6d8e`](https://github.com/ofri-peretz/eslint/commit/fcb6d8ed6c6f531fe11427508673a31fe754a2e6) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Expose the `component-api/*` rule namespace to consumers.

  Eight rules — `no-default-test-id`, `require-data-slot`, `no-is-prefix-prop`,
  `no-inline-style`, `no-raw-color-literal`, `no-arbitrary-token-class`,
  `no-kind-prop-discriminator`, `no-wrapper-sub-component` — already exist in
  `src/rules/component-api/`, but they were not previously included in the
  published `rules` map and so could not be registered by consumers.
  This release adds them so downstream apps (e.g. `apps/blog`, `apps/docs`,
  `interlace-landing`) can register the `componentApi` preset via:

  ```js
  import reactFeatures from "eslint-plugin-react-features";

  {
    plugins: { "react-features": reactFeatures },
    rules: {
      "react-features/component-api/no-default-test-id": "error",
      "react-features/component-api/require-data-slot": "warn",
      "react-features/component-api/no-is-prefix-prop": "warn",
      "react-features/component-api/no-inline-style": "warn",
      "react-features/component-api/no-raw-color-literal": "warn",
      "react-features/component-api/no-arbitrary-token-class": "warn",
      "react-features/component-api/no-kind-prop-discriminator": "warn",
      "react-features/component-api/no-wrapper-sub-component": "warn",
    },
  }
  ```

  Each rule corresponds to a rule ID (R5/R6/R8/R11/R12/R18/R19) in the
  `interlace-component` skill at `agents/skills/interlace-component/SKILL.md`.
  The rules are not part of the `recommended` config — they ship as an opt-in
  `componentApi` preset that strict design systems can enable on top of the
  base react ruleset.

  Unblocks STR-1 in `agents/apps/blog/INTERLACE_AUDIT.md`.

### Patch Changes

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- [#186](https://github.com/ofri-peretz/eslint/pull/186) [`edf208d`](https://github.com/ofri-peretz/eslint/commit/edf208d67ac2357312c97d8964fcf6a462e407eb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Consolidation cleanup — no rule behavior change:
  - **react-features**: the README rules table now lists the 8 `componentApi`
    preset rules. The README generator (`sync-readme-rules.ts`) and the
    `plugin-rule-source-drift` validator now recurse into nested
    `docs/rules/<category>/` subfolders, so every documented rule is advertised
    consistently (previously the nested componentApi docs were silently dropped,
    which an earlier `readme` exception had papered over — that exception is now
    removed in favour of the real fix).
  - **node-security**: remove the orphaned `no-pii-in-logs` rule source — the rule
    was migrated to `eslint-plugin-secure-coding` and is no longer exported here;
    the dead source was still compiling into `dist`.
  - **import-next**: restore the `no-cycle` unit test after [#180](https://github.com/ofri-peretz/eslint/issues/180)'s SCC refactor
    (`computeSCCsFromFile` + `findShortestCyclePath` are now bridged in the mock).

  Also fixes `scripts/ilb-plugin-scope-audit.ts` to stop mis-reading config-preset
  keys (`'recommended-strict': {`) as rules.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- `jsx-no-target-blank`: replaced `/^\/\//.test(href)` with `href.startsWith('//')` (oxlint correctness rule).

## 1.1.4 — 2026-05-03

## 1.1.3 — 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 1.1.2 — 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## 1.1.1 — 2026-02-02

This was a version bump only for eslint-plugin-react-features to align it with other projects, there were no code changes.

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## 1.1.0 — 2026-02-02

### Features

- **infra:** migrate from pnpm to npm for Vercel compatibility ([46172cd7](https://github.com/ofri-peretz/eslint/commit/46172cd7))
- **docs:** implement 3-pillar navigation with sidebar tabs ([03c3f688](https://github.com/ofri-peretz/eslint/commit/03c3f688))
- **docs:** deploy new Interlace VI and mobile UX ([c05b5106](https://github.com/ofri-peretz/eslint/commit/c05b5106))
- add high-fidelity OG images, banners, and update docs layout ([bf60afed](https://github.com/ofri-peretz/eslint/commit/bf60afed))

### Bug Fixes

- **release:** fix release workflow logic, docs cache, and promote lint warnings to errors ([5945113a](https://github.com/ofri-peretz/eslint/commit/5945113a))
- **docs:** resolve MDX compatibility issues and add validation tests ([dac50031](https://github.com/ofri-peretz/eslint/commit/dac50031))
- **docs:** revert inappropriate security additions to non-security plugins ([b8b7bac0](https://github.com/ofri-peretz/eslint/commit/b8b7bac0))
- **docs:** strict readout alignment to NestJS structure and table consolidation ([6e12c39f](https://github.com/ofri-peretz/eslint/commit/6e12c39f))
- **docs:** wrap lucide icons with span for title attribute compatibility ([bd36290d](https://github.com/ofri-peretz/eslint/commit/bd36290d))

### Documentation

- update rule documentation and docs app UI improvements ([53c83f8c](https://github.com/ofri-peretz/eslint/commit/53c83f8c))
- add Known False Negatives to all rules (173 rules updated) ([1e988afd](https://github.com/ofri-peretz/eslint/commit/1e988afd))
- fleet-wide documentation compliance - 160 rules improved ([1d68f96a](https://github.com/ofri-peretz/eslint/commit/1d68f96a))
- update plugin documentation with standardized badges and new OG images ([627773c9](https://github.com/ofri-peretz/eslint/commit/627773c9))
- finalize readme structure, drop security research coverage ([30b96dbd](https://github.com/ofri-peretz/eslint/commit/30b96dbd))
- remove header and legend artifacts from rules table ([8e46b93e](https://github.com/ofri-peretz/eslint/commit/8e46b93e))
- finalize readme layout with centered badges and strict structure ([f9413c91](https://github.com/ofri-peretz/eslint/commit/f9413c91))
- align main README with Interlace branding ([15e520cd](https://github.com/ofri-peretz/eslint/commit/15e520cd))

### ❤️ Thank You

- Ofri Peretz

## 1.0.0 — 2026-01-26

### Added

- Initial stable release with 53 React rules
- 1,190+ test cases covering edge cases and TypeScript integration
- LLM-optimized error messages for AI-assisted development
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rule Categories

#### Migration Rules (React 17→18)

- `jsx-no-target-blank` - Require rel="noopener" on target="\_blank" links
- `jsx-no-script-url` - Disallow javascript: URLs in JSX
- `jsx-no-duplicate-props` - Disallow duplicate props
- `no-danger-with-children` - Disallow children with dangerouslySetInnerHTML
- `no-deprecated` - Disallow deprecated React APIs
- `no-find-dom-node` - Disallow findDOMNode
- `no-unsafe` - Disallow UNSAFE\_ lifecycle methods
- `void-dom-elements-no-children` - Disallow children in void DOM elements

#### Performance Rules

- `no-inline-handlers` - Disallow inline function handlers (re-render prevention)
- `no-object-style-literals` - Disallow object literals in style prop
- `require-memo` - Require React.memo for pure components
- `require-usecallback` - Require useCallback for function props
- `require-usememo` - Require useMemo for expensive computations

#### Core React Rules

- Hooks rules: exhaustive-deps, rules-of-hooks compliance
- Component patterns: naming, structure, composition
- State management: useState, useReducer patterns

### Presets

- `recommended` - Balanced React best practices
- `strict` - All rules as errors
- `performance` - Performance-focused subset
- `migration` - React upgrade assistance

### ⚠️ Breaking from 0.x

- Removed deprecated rules (now in `react-a11y`)
- Renamed: `react-perf/no-jsx-bind` → `performance/no-inline-handlers`

### Known Limitations

Documented in `docs/KNOWN-LIMITATIONS.md`:

- `jsx-no-target-blank`: Dynamic `href` variables not detected
- `jsx-no-script-url`: Obfuscated patterns in variables not detected
- Spread props (`{...props}`) prevent static attribute analysis
