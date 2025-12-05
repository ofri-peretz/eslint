# ⚛️ eslint-plugin-react Rules TODO

Comprehensive list of rules from `eslint-plugin-react` & `eslint-plugin-react-hooks` to be implemented in `eslint-plugin-generalist`.

> **Status:**
> 🟢 = Implemented
> 🟡 = In Progress / Planned
> 🔴 = Not Started
> ❌ = Skipped (Legacy/Not needed)

## 📊 Analysis
- **Total Rules:** ~100+
- **Implemented:** ~41
- **Priority:** High (React is the dominant framework)

---

## 🎣 React Hooks (Critical)

These rules prevent infinite loops and stale closures.

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 | `rules-of-hooks` | Enforces the Rules of Hooks. | **Critical** | Implemented via `eslint-plugin-react-hooks` logic? Need to verify. |
| 🟢 | `exhaustive-deps` | Verify the list of dependencies for Hooks like useEffect and similar. | **Critical** | Implemented. |

## 🛡️ Safety & Correctness

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 | `no-direct-mutation-state` | Prevent usage of `this.state` mutation. | High | Class components. |
| 🔴 | `no-is-mounted` | Prevent usage of `isMounted`. | Low | Deprecated pattern. |
| 🔴 | `no-render-return-value` | Prevent usage of the return value of `React.render`. | Low | |
| 🔴 | `no-string-refs` | Prevent using string refs. | Medium | Deprecated. |
| 🔴 | `no-unescaped-entities` | Prevent invalid characters from appearing in markup. | Medium | Common bug. |
| 🔴 | `no-unknown-property` | Prevent usage of unknown DOM property. | High | Typo prevention. |
| 🔴 | `no-unsafe` | Prevent usage of unsafe lifecycle methods. | Medium | Class components. |
| 🔴 | `no-unstable-nested-components` | Prevent creating unstable components inside components. | **Critical** | Performance killer. |
| 🔴 | `no-unused-prop-types` | Prevent definition of unused prop types. | Medium | |
| 🔴 | `prop-types` | Prevent missing props validation in a React component definition. | Low | TypeScript replaces this. |
| 🔴 | `react-in-jsx-scope` | Prevent missing React when using JSX. | Low | Not needed in React 17+. |
| 🔴 | `require-render-return` | Enforce ES5 or ES6 class for returning value in render function. | Medium | Class components. |
| 🔴 | `void-dom-elements-no-children` | Prevent void DOM elements (e.g. `<img />`, `<br />`) from receiving children. | High | HTML spec compliance. |

## ⚡ Performance

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 | `no-unnecessary-rerenders` | Prevent unnecessary re-renders. | High | Implemented. |
| 🟢 | `react-no-inline-functions` | Prevent inline functions in render props. | High | Implemented. |
| 🔴 | `jsx-no-bind` | Prevent `.bind()` or arrow functions in JSX props. | Medium | |
| 🔴 | `jsx-key` | Detect missing `key` prop. | **Critical** | Essential for list rendering. |
| 🔴 | `no-array-index-key` | Prevent usage of Array index in keys. | High | Performance/Bug risk. |

## 🎨 JSX & Style

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 | `jsx-boolean-value` | Enforce boolean attributes notation in JSX. | Low | Style. |
| 🔴 | `jsx-child-element-spacing` | Enforce or disallow spaces between siblings in JSX. | Low | formatting. |
| 🔴 | `jsx-closing-bracket-location` | Validate closing bracket location in JSX. | Low | formatting. |
| 🔴 | `jsx-closing-tag-location` | Validate closing tag location in JSX. | Low | formatting. |
| 🔴 | `jsx-curly-brace-presence` | Disallow unnecessary JSX expressions when literals alone are sufficient. | Low | formatting. |
| 🔴 | `jsx-curly-newline` | Enforce consistent line breaks inside curly braces in JSX attributes. | Low | formatting. |
| 🔴 | `jsx-curly-spacing` | Enforce or disallow spaces inside of curly braces in JSX attributes. | Low | formatting. |
| 🔴 | `jsx-equals-spacing` | Enforce or disallow spaces around equal signs in JSX attributes. | Low | formatting. |
| 🔴 | `jsx-filename-extension` | Restrict file extensions that may contain JSX. | Low | |
| 🔴 | `jsx-first-prop-new-line` | Enforce position of the first prop in JSX. | Low | formatting. |
| 🔴 | `jsx-fragments` | Enforce shorthand or standard fragment syntax. | Low | Style. |
| 🔴 | `jsx-handler-names` | Enforce event handler naming conventions in JSX. | Medium | naming. |
| 🔴 | `jsx-indent` | Validate JSX indentation. | Low | formatting. |
| 🔴 | `jsx-indent-props` | Validate props indentation in JSX. | Low | formatting. |
| 🔴 | `jsx-max-depth` | Validate JSX maximum depth. | Low | complexity. |
| 🔴 | `jsx-max-props-per-line` | Limit maximum of props on a single line in JSX. | Low | formatting. |
| 🔴 | `jsx-newline` | Require or prevent a new line after jsx elements and expressions. | Low | formatting. |
| 🔴 | `jsx-no-comment-textnodes` | Prevent comments from being inserted as text nodes. | Medium | |
| 🔴 | `jsx-no-constructed-context-values` | Prevent react context provider values from being created in render. | High | Performance. |
| 🔴 | `jsx-no-duplicate-props` | Prevent duplicate props in JSX. | High | |
| 🔴 | `jsx-no-literals` | Prevent usage of unwrapped JSX strings. | Low | i18n. |
| 🔴 | `jsx-no-script-url` | Prevent usage of `javascript:` URLs. | **Critical** | Security (XSS). |
| 🔴 | `jsx-no-target-blank` | Prevent usage of unsafe `target='_blank'`. | **Critical** | Security. |
| 🔴 | `jsx-no-undef` | Disallow undeclared variables in JSX. | **Critical** | Correctness. |
| 🔴 | `jsx-no-useless-fragment` | Disallow unnecessary fragments. | Medium | Cleanup. |
| 🔴 | `jsx-one-expression-per-line` | Limit to one expression per line in JSX. | Low | formatting. |
| 🔴 | `jsx-pascal-case` | Enforce PascalCase for user-defined JSX components. | Medium | naming. |
| 🔴 | `jsx-props-no-multi-spaces` | Disallow multiple spaces between inline JSX props. | Low | formatting. |
| 🔴 | `jsx-props-no-spreading` | Prevent JSX prop spreading. | Low | style. |
| 🔴 | `jsx-sort-props` | Enforce props alphabetical sorting. | Low | style. |
| 🔴 | `jsx-tag-spacing` | Validate whitespace in and around the JSX opening and closing tags. | Low | formatting. |
| 🔴 | `jsx-uses-react` | Prevent React to be incorrectly marked as unused. | Low | Legacy. |
| 🔴 | `jsx-uses-vars` | Prevent variables used in JSX to be incorrectly marked as unused. | **Critical** | Correctness. |
| 🔴 | `jsx-wrap-multilines` | Prevent missing parentheses around multilines JSX. | Low | formatting. |

## 🧠 AI Implementation Context

### Strategy
1.  **Prioritize "Logic" over "Style":** Formatting rules (`jsx-indent`, `jsx-curly-spacing`) are better handled by Prettier. Focus on correctness (`jsx-no-undef`, `jsx-key`) and performance (`no-unstable-nested-components`).
2.  **Modern React First:** Deprioritize class-component rules (`no-did-mount-set-state`, `sort-comp`) unless requested. Focus on Hooks and Functional Components.
3.  **Type Awareness:** Use TypeScript to detect if a component is actually a component (returns JSX) vs just a function.

### Reference Implementation Links
- [jsx-eslint/eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react)
- [React Hooks Rules](https://react.dev/reference/react/hooks)

