# Known False Negatives and False Positives

This document catalogs known limitations in our ESLint rules to help users understand edge cases and make informed decisions.

## eslint-plugin-react-features

### Security Rules

#### `jsx-no-target-blank`

**Known False Negatives (Not Detected)**

- Dynamic href values: `<a href={url} target="_blank">` where `url` is a variable that might contain external URLs
- Spread props containing `target="_blank"`: `<a {...linkProps}>Link</a>`
- Template literals with external URLs: `<a href={`${baseUrl}/path`} target="_blank">`

**Known False Positives (Incorrectly Flagged)**

- None known - the rule correctly identifies external URLs vs relative/internal URLs

---

#### `jsx-no-script-url`

**Known False Negatives (Not Detected)**

- Dynamic href values: `<a href={maliciousUrl}>` where variable contains `javascript:`
- Template literals: `<a href={`javascript:${code}`}>`
- Obfuscated patterns: `<a href="  javascript:void(0)">` (with leading spaces - though we do handle this)

**Known False Positives (Incorrectly Flagged)**

- None known

---

#### `jsx-no-duplicate-props`

**Known False Negatives (Not Detected)**

- Spread props that might override each other: `<div {...props1} {...props2}>`
- Conditionally applied props via ternary that create duplicates

**Known False Positives (Incorrectly Flagged)**

- None known

---

#### `no-danger`

**Known False Negatives (Not Detected)**

- Custom components that accept HTML and render it unsafely
- Third-party components with similar XSS-prone patterns
- Dynamic property access: `element[prop]` where `prop` is `dangerouslySetInnerHTML`

**Known False Positives (Incorrectly Flagged)**

- Sanitized HTML usage (e.g., with DOMPurify) - rule flags all usage regardless of sanitization

---

#### `no-danger-with-children`

**Known False Negatives (Not Detected)**

- Spread props that include both `dangerouslySetInnerHTML` and `children`
- Runtime prop merging that creates this conflict

**Known False Positives (Incorrectly Flagged)**

- None known

---

### Deprecated API Rules

#### `no-deprecated`

**Known False Negatives (Not Detected)**

- Aliased imports: `import { render as r } from "react-dom"; r(<App />, el);`
- Dynamic method access: `ReactDOM[methodName](...)`
- Indirect calls through helper functions

**Known False Positives (Incorrectly Flagged)**

- User-defined functions named `render` that are not ReactDOM.render

---

#### `no-find-dom-node`

**Known False Negatives (Not Detected)**

- Aliased imports: `import { findDOMNode as fdn } from "react-dom"`
- Dynamic property access on ReactDOM object
- Wrapped/curried function calls

**Known False Positives (Incorrectly Flagged)**

- User-defined functions named `findDOMNode`

---

#### `no-unsafe`

**Known False Negatives (Not Detected)**

- Methods defined outside the class then assigned
- Dynamically computed method names
- Decorator-based lifecycle methods

**Known False Positives (Incorrectly Flagged)**

- Non-React classes with UNSAFE\_ prefixed methods (rare edge case)

---

#### `void-dom-elements-no-children`

**Known False Negatives (Not Detected)**

- Custom elements that happen to be void-like but not in our list
- Spread props that include children on void elements

**Known False Positives (Incorrectly Flagged)**

- None known - only flags standard void HTML elements

---

### Performance Rules

#### `hooks-exhaustive-deps`

**Known False Negatives (Not Detected)**

- Dependencies accessed through object destructuring in the function body
- Closures over mutable refs that change semantics
- ESM re-exports that alias hook dependencies

**Known False Positives (Incorrectly Flagged)**

- Intentionally stable references (e.g., dispatch from useReducer, refs)
- Functions that are stable but not wrapped in useCallback

---

#### `jsx-no-bind`

**Known False Negatives (Not Detected)**

- Arrow functions defined in render and passed as callbacks
- Bind calls hidden in helper functions
- Dynamic function creation patterns

**Known False Positives (Incorrectly Flagged)**

- Event handlers in list items where bind is intentional for passing data
- Memoized components where inline functions are acceptable

---

### Core React Rules

#### `jsx-key`

**Known False Negatives (Not Detected)**

- Keys applied via spread: `{...{key: id}}`
- Dynamic arrays created with runtime methods
- Arrays created in third-party libraries

**Known False Positives (Incorrectly Flagged)**

- Fragment shorthand `<>` in some edge cases (though this is valid)

---

## eslint-plugin-react-a11y

### Focus Management Rules

#### `no-autofocus`

**Known False Negatives (Not Detected)**

- Programmatic focus via refs: `ref.current.focus()`
- Focus management in useEffect
- Third-party focus management libraries

**Known False Positives (Incorrectly Flagged)**

- Modal/dialog patterns where autofocus is accessibility-appropriate

---

#### `interactive-supports-focus`

**Known False Negatives (Not Detected)**

- Interactive behavior added via third-party libraries
- Event handlers added through refs

**Known False Positives (Incorrectly Flagged)**

- Elements where focus is handled by a parent element
- Custom components that manage focus internally

---

### ARIA Rules

#### `role-has-required-aria-props`

**Known False Negatives (Not Detected)**

- ARIA props applied via spread
- Conditional ARIA props based on state
- Custom component wrappers that add required props

**Known False Positives (Incorrectly Flagged)**

- None known

---

#### `aria-props`

**Known False Negatives (Not Detected)**

- ARIA props from spread operators
- Dynamically computed ARIA prop names

**Known False Positives (Incorrectly Flagged)**

- None known - uses ARIA spec for validation

---

### Content Rules

#### `alt-text`

**Known False Negatives (Not Detected)**

- Alt text in custom image components
- Alt text passed via spread props
- Dynamic alt text from variables (can't validate content quality)

**Known False Positives (Incorrectly Flagged)**

- Decorative images that intentionally have empty alt (though `alt=""` is correct pattern)

---

## Mitigation Strategies

### For False Negatives

1. **Code Reviews**: Supplement linting with manual review for complex patterns
2. **Testing**: Add runtime accessibility testing (e.g., axe-core, Lighthouse)
3. **Custom Rules**: Create project-specific rules for unique patterns

### For False Positives

1. **Inline Disable Comments**: Use `// eslint-disable-next-line` with explanation
2. **Rule Configuration**: Adjust rule options where available
3. **Overrides**: Use ESLint config overrides for specific files/patterns

---

## Reporting Issues

If you discover additional false negatives or false positives:

1. Open an issue at https://github.com/ofri-peretz/eslint
2. Include a minimal reproduction code example
3. Specify the expected vs actual behavior
