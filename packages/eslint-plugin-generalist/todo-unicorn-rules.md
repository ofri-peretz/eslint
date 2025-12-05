# 🦄 eslint-plugin-unicorn Rules TODO

Comprehensive list of rules from `eslint-plugin-unicorn` to be implemented in `eslint-plugin-generalist`.

> **Status:**
> 🟢 = Implemented
> 🟡 = In Progress / Planned
> 🔴 = Not Started
> ❌ = Skipped (Legacy/Not needed)

## 📊 Analysis
- **Total Rules:** ~100+
- **Implemented:** ~5
- **Priority:** Medium (High-value "sugar" rules, low-value "nitpick" rules)

---

## 🛠️ Better JavaScript (High Value)

These rules enforce modern, cleaner JS features.

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 | `prefer-array-flat` | Prefer `Array#flat()` over legacy alternatives. | Medium | |
| 🟢 | `prefer-array-flat-map` | Prefer `Array#flatMap()` over `map().flat()`. | Medium | |
| 🟢 | `prefer-at` | Prefer `.at()` method for index access. | High | Implemented. |
| 🔴 | `prefer-code-point` | Prefer `String#codePointAt()` over `String#charCodeAt()`. | Low | |
| 🔴 | `prefer-date-now` | Prefer `Date.now()` to get the number of milliseconds. | Low | |
| 🔴 | `prefer-default-parameters` | Prefer default parameters over reassignment. | Medium | |
| 🔴 | `prefer-dom-node-append` | Prefer `Node#append()` over `Node#appendChild()`. | Low | |
| 🔴 | `prefer-dom-node-dataset` | Prefer `.dataset` over `getAttribute('data-')`. | Low | |
| 🔴 | `prefer-dom-node-remove` | Prefer `child.remove()` over `parent.removeChild(child)`. | Low | |
| 🔴 | `prefer-dom-node-text-content` | Prefer `.textContent` over `.innerText`. | Medium | Performance. |
| 🔴 | `prefer-includes` | Prefer `.includes()` over `.indexOf()`. | High | Readability. |
| 🔴 | `prefer-logical-operator-over-ternary` | Prefer `&&` / `||` over ternary. | Medium | |
| 🔴 | `prefer-math-trunc` | Prefer `Math.trunc()` over bitwise operations. | Low | |
| 🔴 | `prefer-modern-dom-apis` | Prefer modern DOM APIs. | Medium | |
| 🔴 | `prefer-module` | Prefer ESM over CommonJS. | High | |
| 🔴 | `prefer-negative-index` | Prefer negative index over `.length - index`. | Medium | Pairs with `prefer-at`. |
| 🟢 | `prefer-node-protocol` | Prefer `node:` protocol for Node.js built-ins. | High | Implemented. |
| 🔴 | `prefer-number-properties` | Prefer `Number.isNaN` over global `isNaN`. | Medium | Correctness. |
| 🔴 | `prefer-object-from-entries` | Prefer `Object.fromEntries()` over manual reduction. | Medium | |
| 🔴 | `prefer-optional-catch-binding` | Prefer omitting the catch binding parameter. | Low | |
| 🔴 | `prefer-regexp-test` | Prefer `RegExp#test()` over `String#match()`. | Medium | Performance. |
| 🔴 | `prefer-set-has` | Prefer `Set#has()` over `Array#includes()`. | High | Performance. |
| 🔴 | `prefer-spread` | Prefer spread operator over `Array.from()`. | Medium | |
| 🔴 | `prefer-string-replace-all` | Prefer `String#replaceAll()` over regex with global flag. | Medium | |
| 🔴 | `prefer-string-slice` | Prefer `String#slice()` over `String#substr()`. | Medium | |
| 🔴 | `prefer-string-starts-ends-with` | Prefer `startsWith`/`endsWith` over regex. | Medium | |
| 🔴 | `prefer-switch` | Prefer `switch` over multiple `if/else`. | Low | |
| 🔴 | `prefer-ternary` | Prefer ternary over `if/else`. | Low | |
| 🔴 | `prefer-top-level-await` | Prefer top-level await. | Low | |

## 🧹 Cleanup & Consistency

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 | `catch-error-name` | Enforce a specific parameter name in catch clauses. | Low | |
| 🔴 | `consistent-destructuring` | Use destructuring consistently. | Medium | |
| 🔴 | `consistent-function-scoping` | Move function definitions to the highest possible scope. | High | Performance. |
| 🔴 | `custom-error-definition` | Enforce correct error subclassing. | Low | |
| 🔴 | `empty-brace-spaces` | Enforce no spaces in empty braces. | Low | Formatting. |
| 🔴 | `error-message` | Enforce passing a message value when creating a built-in error. | Medium | Debugging. |
| 🔴 | `escape-case` | Require escape sequences to use uppercase values. | Low | |
| 🔴 | `expiring-todo-comments` | Add expiration conditions to TODO comments. | High | Process. |
| 🔴 | `explicit-length-check` | Enforce explicitly comparing the `length` property of a value. | Medium | |
| 🔴 | `filename-case` | Enforce a case style for filenames. | High | Consistency. |
| 🔴 | `import-style` | Enforce specific import styles. | Low | |
| 🔴 | `new-for-builtins` | Enforce the use of `new` for all builtins. | Low | |
| 🔴 | `no-abusive-eslint-disable` | Enforce specifying rules to disable in `eslint-disable` comments. | High | Quality. |
| 🔴 | `no-array-callback-reference` | Prevent passing a function reference directly to iterator methods. | Medium | Bug prevention. |
| 🔴 | `no-array-for-each` | Prefer `for...of` over `Array#forEach()`. | Medium | |
| 🔴 | `no-array-method-this-argument` | Prevent using the `this` argument of array methods. | Low | |
| 🔴 | `no-array-push-push` | Prefer `Array#push` with multiple arguments. | Low | |
| 🔴 | `no-array-reduce` | Disallow `Array#reduce()`. | Low | Controversial. |
| 🔴 | `no-await-expression-member` | Disallow member access from await expression. | Low | |
| 🔴 | `no-console-spaces` | Do not use leading/trailing space between `console.log` parameters. | Low | |
| 🔴 | `no-document-cookie` | Prevent `document.cookie`. | High | Security. |
| 🔴 | `no-empty-file` | Disallow empty files. | Low | |
| 🔴 | `no-for-loop` | Do not use `for` loops. | Medium | |
| 🔴 | `no-hex-escape` | Enforce the use of unicode escapes. | Low | |
| 🔴 | `no-instanceof-array` | Require `Array.isArray()` instead of `instanceof Array`. | Medium | |
| 🔴 | `no-invalid-remove-event-listener` | Prevent invalid `removeEventListener`. | High | Bug prevention. |
| 🔴 | `no-keyword-prefix` | Disallow identifiers starting with `new` or `class`. | Low | |
| 🔴 | `no-lonely-if` | Disallow `if` statements as the only statement in `else` blocks. | Medium | |
| 🔴 | `no-nested-ternary` | Disallow nested ternary expressions. | High | Readability. |
| 🔴 | `no-new-array` | Disallow `new Array()`. | Low | |
| 🔴 | `no-new-buffer` | Disallow `new Buffer()`. | Medium | Deprecated. |
| 🔴 | `no-null` | Disallow the use of the `null` literal. | Low | TypeScript users often prefer `undefined`. |
| 🔴 | `no-object-as-default-parameter` | Disallow the use of objects as default parameters. | Medium | Performance. |
| 🔴 | `no-process-exit` | Disallow `process.exit()`. | High | Implemented. |
| 🔴 | `no-static-only-class` | Disallow classes that only have static members. | Low | |
| 🔴 | `no-this-assignment` | Disallow assigning `this` to a variable. | Medium | |
| 🔴 | `no-unreadable-array-destructuring` | Disallow unreadable array destructuring. | Low | |
| 🔴 | `no-unreadable-iife` | Disallow unreadable IIFEs. | Low | |
| 🔴 | `no-unsafe-regex` | Disallow unsafe regular expressions. | **Critical** | Security (ReDoS). |
| 🔴 | `no-unused-properties` | Disallow unused object properties. | Medium | |
| 🔴 | `no-useless-fallback-in-spread` | Disallow useless fallback when spreading. | Low | |
| 🔴 | `no-useless-length-check` | Disallow useless array length checks. | Low | |
| 🔴 | `no-useless-promise-resolve-reject` | Disallow useless `Promise.resolve/reject`. | Low | |
| 🔴 | `no-useless-spread` | Disallow useless spread. | Low | |
| 🔴 | `no-useless-switch-case` | Disallow useless case in switch statements. | Low | |
| 🔴 | `no-useless-undefined` | Disallow useless `undefined`. | Low | |
| 🔴 | `no-zero-fractions` | Disallow number literals with zero fractions. | Low | |
| 🔴 | `numeric-separators-style` | Enforce the style of numeric separators. | Low | |
| 🔴 | `prevent-abbreviations` | Prevent abbreviations. | Low | Controversial. |
| 🔴 | `require-array-join-separator` | Enforce using the separator argument with `Array#join()`. | Low | |
| 🔴 | `require-number-to-fixed-digits-argument` | Enforce using the digits argument with `Number#toFixed()`. | Low | |
| 🔴 | `require-post-message-target-origin` | Enforce using the `targetOrigin` argument with `postMessage()`. | **Critical** | Security. |
| 🔴 | `string-content` | Enforce better string content. | Low | |
| 🔴 | `template-indent` | Fix template literal indentation. | Low | |
| 🔴 | `text-encoding-identifier-case` | Enforce the case of the encoding identifier. | Low | |
| 🔴 | `throw-new-error` | Require `new` when throwing an error. | Medium | |

## 🧠 AI Implementation Context

### Strategy
1.  **Focus on "Sugar" with Performance Benefits:** Rules like `prefer-set-has`, `prefer-at`, and `prefer-includes` make code faster and easier for LLMs to read.
2.  **Ignore "Nitpicks":** Rules like `prevent-abbreviations` or formatting rules are often annoying and cause high churn. Only implement them if highly requested.
3.  **Security Overlap:** `no-unsafe-regex`, `no-document-cookie`, `require-post-message-target-origin` are excellent Security rules hiding in Unicorn. Prioritize these.

### Reference Implementation Links
- [sindresorhus/eslint-plugin-unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn)

