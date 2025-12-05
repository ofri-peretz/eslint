# 📚 Rules Reference (107 Rules)

> **Note:** Security rules (48) have been moved to [eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding).
> **Note:** Accessibility rules (37) have been moved to [eslint-plugin-react-a11y](https://www.npmjs.com/package/eslint-plugin-react-a11y).

💼 Set in `recommended` | ⚠️ Warns in `recommended` | 🔧 Auto-fixable | 💡 Editor suggestions

## Security (29 rules)

| Name                                                                        | Description                                               | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------------------- | --------------------------------------------------------- | --- | --- | --- | --- |
| [no-sql-injection](./rules/no-sql-injection.md)                             | Prevent SQL injection with string concatenation detection | 💼  |     |     |     |
| [database-injection](./rules/database-injection.md)                         | Comprehensive injection detection (SQL, NoSQL, ORM)       | 💼  |     |     |     |
| [detect-eval-with-expression](./rules/detect-eval-with-expression.md)       | Detect eval() with dynamic expressions (RCE prevention)   | 💼  |     |     |     |
| [detect-child-process](./rules/detect-child-process.md)                     | Detect command injection in child_process calls           | 💼  |     |     |     |
| [detect-non-literal-fs-filename](./rules/detect-non-literal-fs-filename.md) | Detect path traversal in fs operations                    | 💼  |     |     |     |
| [detect-non-literal-regexp](./rules/detect-non-literal-regexp.md)           | Detect ReDoS vulnerabilities in RegExp construction       | 💼  |     |     |     |
| [detect-object-injection](./rules/detect-object-injection.md)               | Detect prototype pollution in object property access      | 💼  |     |     |     |
| [no-unsafe-dynamic-require](./rules/no-unsafe-dynamic-require.md)           | Forbid dynamic require() with non-literal arguments       | 💼  |     |     |     |
| [no-hardcoded-credentials](./rules/no-hardcoded-credentials.md)             | Detect hardcoded passwords, API keys, tokens              | 💼  |     |     |     |
| [no-weak-crypto](./rules/no-weak-crypto.md)                                 | Detect weak cryptography (MD5, SHA1, DES)                 | 💼  |     |     |     |
| [no-insufficient-random](./rules/no-insufficient-random.md)                 | Detect weak random (Math.random())                        | 💼  |     |     |     |
| [no-unvalidated-user-input](./rules/no-unvalidated-user-input.md)           | Detect unvalidated user input                             | 💼  |     |     |     |
| [no-unsanitized-html](./rules/no-unsanitized-html.md)                       | Detect XSS via unsanitized HTML                           | 💼  |     |     |     |
| [no-unescaped-url-parameter](./rules/no-unescaped-url-parameter.md)         | Detect unescaped URL parameters                           | 💼  |     |     |     |
| [no-missing-cors-check](./rules/no-missing-cors-check.md)                   | Detect missing CORS validation                            | 💼  |     |     |     |
| [no-insecure-comparison](./rules/no-insecure-comparison.md)                 | Detect insecure == and !=                                 | 💼  |     | 🔧  |     |
| [no-missing-authentication](./rules/no-missing-authentication.md)           | Detect missing auth checks                                | 💼  |     |     |     |
| [no-privilege-escalation](./rules/no-privilege-escalation.md)               | Detect privilege escalation                               | 💼  |     |     |     |
| [no-insecure-cookie-settings](./rules/no-insecure-cookie-settings.md)       | Detect insecure cookie configs                            | 💼  |     |     |     |
| [no-missing-csrf-protection](./rules/no-missing-csrf-protection.md)         | Detect missing CSRF protection                            | 💼  |     |     |     |
| [no-exposed-sensitive-data](./rules/no-exposed-sensitive-data.md)           | Detect PII exposure in logs                               | 💼  |     |     |     |
| [no-unencrypted-transmission](./rules/no-unencrypted-transmission.md)       | Detect HTTP vs HTTPS issues                               | 💼  |     |     |     |
| [no-redos-vulnerable-regex](./rules/no-redos-vulnerable-regex.md)           | Detect ReDoS patterns                                     | 💼  |     |     | 💡  |
| [no-unsafe-regex-construction](./rules/no-unsafe-regex-construction.md)     | Detect unsafe RegExp                                      | 💼  |     |     | 💡  |
| [no-sensitive-data-exposure](./rules/no-sensitive-data-exposure.md)         | Detect sensitive data exposure                            | 💼  |     |     | 💡  |
| [no-toctou-vulnerability](./rules/no-toctou-vulnerability.md)               | Detect TOCTOU race conditions                             | 💼  |     |     | 💡  |
| [no-missing-security-headers](./rules/no-missing-security-headers.md)       | Detect missing security headers                           | 💼  |     |     | 💡  |
| [no-insecure-redirects](./rules/no-insecure-redirects.md)                   | Detect open redirects                                     | 💼  |     |     | 💡  |
| [no-document-cookie](./rules/no-document-cookie.md)                         | Detect document.cookie usage                              | 💼  |     |     | 💡  |

## Imports (7 rules)

| Name                                                      | Description                                    | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------- | ---------------------------------------------- | --- | --- | --- | --- |
| [no-duplicates](./rules/no-duplicates.md)                 | Report duplicate imports                       | 💼  |     | 🔧  |     |
| [first](./rules/first.md)                                 | Ensure imports are at the top                  |     | ⚠️  | 🔧  |     |
| [newline-after-import](./rules/newline-after-import.md)   | Enforce newline after imports                  |     | ⚠️  | 🔧  |     |
| [extensions](./rules/extensions.md)                       | Enforce/forbid file extensions                 |     | ⚠️  | 🔧  |     |
| [named](./rules/named.md)                                 | Ensure named imports exist                     | 💼  |     |     | 💡  |
| [default](./rules/default.md)                             | Ensure default imports exist                   | 💼  |     |     | 💡  |
| [namespace](./rules/namespace.md)                         | Ensure namespace properties exist              |     | ⚠️  |     | 💡  |

## Architecture (28 rules)

| Name                                                                            | Description                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------------- | ------------------------------------------------ | --- | --- | --- | --- |
| [no-circular-dependencies](./rules/no-circular-dependencies.md)                 | Detect circular dependencies with chain analysis |     |     |     |     |
| [no-internal-modules](./rules/no-internal-modules.md)                           | Forbid importing internal/deep paths             |     |     |     |     |
| [no-cross-domain-imports](./rules/no-cross-domain-imports.md)                   | Prevent cross-domain imports                     |     |     |     | 💡  |
| [enforce-dependency-direction](./rules/enforce-dependency-direction.md)         | Enforce dependency direction                     |     |     |     | 💡  |
| [no-external-api-calls-in-utils](./rules/no-external-api-calls-in-utils.md)     | No API calls in utils                            |     |     |     | 💡  |
| [prefer-node-protocol](./rules/prefer-node-protocol.md)                         | Enforce node: protocol                           |     | ⚠️  | 🔧  |     |
| [consistent-existence-index-check](./rules/consistent-existence-index-check.md) | Consistent property checks                       |     | ⚠️  | 🔧  |     |
| [prefer-event-target](./rules/prefer-event-target.md)                           | Prefer EventTarget                               |     | ⚠️  |     | 💡  |
| [prefer-at](./rules/prefer-at.md)                                               | Prefer .at() method                              |     | ⚠️  | 🔧  |     |
| [no-unreadable-iife](./rules/no-unreadable-iife.md)                             | Prevent unreadable IIFEs                         |     | ⚠️  |     | 💡  |
| [no-await-in-loop](./rules/no-await-in-loop.md)                                 | Disallow await in loops                          |     | ⚠️  |     | 💡  |
| [no-self-import](./rules/no-self-import.md)                                     | Prevent self-imports                             |     | ⚠️  |     | 💡  |
| [no-unused-modules](./rules/no-unused-modules.md)                               | Find unused exports                              |     | ⚠️  |     | 💡  |
| [no-extraneous-dependencies](./rules/no-extraneous-dependencies.md)             | Detect extraneous dependencies                   |     | ⚠️  |     | 💡  |
| [max-dependencies](./rules/max-dependencies.md)                                 | Limit module dependencies                        |     | ⚠️  |     | 💡  |
| [no-anonymous-default-export](./rules/no-anonymous-default-export.md)           | Forbid anonymous exports                         |     | ⚠️  |     | 💡  |
| [no-restricted-paths](./rules/no-restricted-paths.md)                           | Restrict import paths                            |     | ⚠️  |     | 💡  |
| [no-deprecated](./rules/no-deprecated.md)                                       | Detect deprecated imports                        |     | ⚠️  |     | 💡  |
| [no-mutable-exports](./rules/no-mutable-exports.md)                             | Forbid mutable exports                           |     | ⚠️  |     | 💡  |
| [prefer-default-export](./rules/prefer-default-export.md)                       | Prefer default export                            |     | ⚠️  |     | 💡  |
| [no-unresolved](./rules/no-unresolved.md)                                       | Detect unresolved imports                        |     |     |     | 💡  |
| [no-relative-parent-imports](./rules/no-relative-parent-imports.md)             | Forbid relative parent imports                   |     | ⚠️  |     | 💡  |
| [no-default-export](./rules/no-default-export.md)                               | Forbid default exports                           |     | ⚠️  |     | 💡  |
| [no-named-export](./rules/no-named-export.md)                                   | Forbid named exports                             |     | ⚠️  |     | 💡  |
| [no-unassigned-import](./rules/no-unassigned-import.md)                         | Forbid unassigned imports                        |     | ⚠️  |     | 💡  |
| [enforce-import-order](./rules/enforce-import-order.md)                         | Enforce specific import order                    |     | ⚠️  | 🔧  | 💡  |
| [consistent-function-scoping](./rules/consistent-function-scoping.md)           | Consistent function scoping                      |     | ⚠️  |     | 💡  |
| [filename-case](./rules/filename-case.md)                                       | Enforce filename conventions                     |     | ⚠️  |     | 💡  |
| [no-instanceof-array](./rules/no-instanceof-array.md)                           | Forbid instanceof Array                          |     | ⚠️  | 🔧  |     |

## React (41 rules)

| Name                                                                                      | Description                               | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------------------------- | ----------------------------------------- | --- | --- | --- | --- |
| [hooks-exhaustive-deps](./rules/hooks-exhaustive-deps.md)                                 | Enforce exhaustive hook dependencies      |     | ⚠️  |     | 💡  |
| [required-attributes](./rules/required-attributes.md)                                     | Enforce required attributes               |     |     | 🔧  |     |
| [jsx-key](./rules/jsx-key.md)                                                             | Detect missing React keys                 |     |     |     | 💡  |
| [no-direct-mutation-state](./rules/no-direct-mutation-state.md)                           | Prevent direct state mutation             |     |     |     | 💡  |
| [require-optimization](./rules/require-optimization.md)                                   | Require React optimizations               |     | ⚠️  |     | 💡  |
| [no-set-state](./rules/no-set-state.md)                                                   | Disallow setState in components           |     |     |     | 💡  |
| [no-this-in-sfc](./rules/no-this-in-sfc.md)                                               | Disallow this in stateless components     |     |     |     | 💡  |
| [no-access-state-in-setstate](./rules/no-access-state-in-setstate.md)                     | Disallow this.state in setState           |     |     |     | 💡  |
| [no-children-prop](./rules/no-children-prop.md)                                           | Disallow passing children as props        |     |     |     | 💡  |
| [no-danger](./rules/no-danger.md)                                                         | Disallow dangerouslySetInnerHTML          |     |     |     | 💡  |
| [no-string-refs](./rules/no-string-refs.md)                                               | Disallow string refs                      |     |     |     | 💡  |
| [no-unknown-property](./rules/no-unknown-property.md)                                     | Disallow unknown DOM properties           |     |     |     | 💡  |
| [checked-requires-onchange-or-readonly](./rules/checked-requires-onchange-or-readonly.md) | Require onChange or readOnly with checked |     |     |     | 💡  |
| [default-props-match-prop-types](./rules/default-props-match-prop-types.md)               | Enforce defaultProps match propTypes      |     |     |     | 💡  |
| [display-name](./rules/display-name.md)                                                   | Require displayName in components         |     |     |     | 💡  |
| [jsx-handler-names](./rules/jsx-handler-names.md)                                         | Enforce handler naming conventions        |     |     |     | 💡  |
| [jsx-max-depth](./rules/jsx-max-depth.md)                                                 | Limit JSX nesting depth                   |     |     |     | 💡  |
| [jsx-no-bind](./rules/jsx-no-bind.md)                                                     | Disallow bind() in JSX props              |     |     |     | 💡  |
| [jsx-no-literals](./rules/jsx-no-literals.md)                                             | Disallow string literals in JSX           |     |     |     | 💡  |
| [no-adjacent-inline-elements](./rules/no-adjacent-inline-elements.md)                     | Disallow adjacent inline elements         |     |     |     | 💡  |
| [no-arrow-function-lifecycle](./rules/no-arrow-function-lifecycle.md)                     | Disallow arrow functions in lifecycle     |     |     |     | 💡  |
| [no-did-mount-set-state](./rules/no-did-mount-set-state.md)                               | Disallow setState in componentDidMount    |     |     |     | 💡  |
| [no-did-update-set-state](./rules/no-did-update-set-state.md)                             | Disallow setState in componentDidUpdate   |     |     |     | 💡  |
| [no-invalid-html-attribute](./rules/no-invalid-html-attribute.md)                         | Disallow invalid HTML attributes          |     |     |     | 💡  |
| [no-is-mounted](./rules/no-is-mounted.md)                                                 | Disallow isMounted                        |     |     |     | 💡  |
| [no-multi-comp](./rules/no-multi-comp.md)                                                 | One component per file                    |     |     |     | 💡  |
| [no-namespace](./rules/no-namespace.md)                                                   | Disallow namespace imports for React      |     |     |     | 💡  |
| [no-object-type-as-default-prop](./rules/no-object-type-as-default-prop.md)               | Disallow object as default prop           |     |     |     | 💡  |
| [no-redundant-should-component-update](./rules/no-redundant-should-component-update.md)   | Disallow redundant shouldComponentUpdate  |     |     |     | 💡  |
| [no-render-return-value](./rules/no-render-return-value.md)                               | Disallow render() return value            |     |     |     | 💡  |
| [no-typos](./rules/no-typos.md)                                                           | Detect common typos in React              |     |     |     | 💡  |
| [no-unescaped-entities](./rules/no-unescaped-entities.md)                                 | Disallow unescaped entities in JSX        |     |     |     | 💡  |
| [prefer-es6-class](./rules/prefer-es6-class.md)                                           | Prefer ES6 class syntax                   |     |     |     | 💡  |
| [prefer-stateless-function](./rules/prefer-stateless-function.md)                         | Prefer stateless functional components    |     |     |     | 💡  |
| [prop-types](./rules/prop-types.md)                                                       | Require propTypes declarations            |     |     |     | 💡  |
| [react-in-jsx-scope](./rules/react-in-jsx-scope.md)                                       | Require React in JSX scope                |     |     |     | 💡  |
| [require-default-props](./rules/require-default-props.md)                                 | Require defaultProps for optional props   |     |     |     | 💡  |
| [require-render-return](./rules/require-render-return.md)                                 | Require return in render                  |     |     |     | 💡  |
| [sort-comp](./rules/sort-comp.md)                                                         | Enforce component method order            |     |     |     | 💡  |
| [state-in-constructor](./rules/state-in-constructor.md)                                   | Enforce state initialization style        |     |     |     | 💡  |
| [static-property-placement](./rules/static-property-placement.md)                         | Enforce static property placement         |     |     |     | 💡  |

## Development (7 rules)

| Name                                                                                | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------------------- | ------------------------------------ | --- | --- | --- | --- |
| [no-console-log](./rules/no-console-log.md)                                         | Disallow console.log with strategies |     | ⚠️  | 🔧  |     |
| [prefer-dependency-version-strategy](./rules/prefer-dependency-version-strategy.md) | Enforce version strategy             |     | ⚠️  | 🔧  |     |
| [no-amd](./rules/no-amd.md)                                                         | Disallow AMD imports                 |     | ⚠️  |     | 💡  |
| [no-commonjs](./rules/no-commonjs.md)                                               | Disallow CommonJS imports            |     | ⚠️  |     | 💡  |
| [no-nodejs-modules](./rules/no-nodejs-modules.md)                                   | Disallow Node.js modules             |     |     |     | 💡  |
| [no-process-exit](./rules/no-process-exit.md)                                       | Disallow process.exit()              |     | ⚠️  |     | 💡  |
| [no-console-spaces](./rules/no-console-spaces.md)                                   | Detect console.log spacing issues    |     | ⚠️  | 🔧  |     |

## Performance (7 rules)

| Name                                                              | Description                         | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------- | ----------------------------------- | --- | --- | --- | --- |
| [react-no-inline-functions](./rules/react-no-inline-functions.md) | Prevent inline functions in renders |     | ⚠️  |     |     |
| [no-unnecessary-rerenders](./rules/no-unnecessary-rerenders.md)   | Detect unnecessary rerenders        |     | ⚠️  |     | 💡  |
| [no-memory-leak-listeners](./rules/no-memory-leak-listeners.md)   | Detect memory leak listeners        |     | ⚠️  |     | 💡  |
| [no-blocking-operations](./rules/no-blocking-operations.md)       | Detect blocking operations          |     | ⚠️  |     | 💡  |
| [no-unbounded-cache](./rules/no-unbounded-cache.md)               | Detect unbounded caches             |     | ⚠️  |     | 💡  |
| [detect-n-plus-one-queries](./rules/detect-n-plus-one-queries.md) | Detect N+1 queries                  |     | ⚠️  |     |     |
| [react-render-optimization](./rules/react-render-optimization.md) | React render optimization           |     | ⚠️  |     | 💡  |

## Code Quality (9 rules)

| Name                                                                    | Description                        | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------- | ---------------------------------- | --- | --- | --- | --- |
| [no-commented-code](./rules/no-commented-code.md)                       | Remove commented code              |     | ⚠️  |     | 💡  |
| [max-parameters](./rules/max-parameters.md)                             | Limit function parameters          |     | ⚠️  |     | 💡  |
| [no-missing-null-checks](./rules/no-missing-null-checks.md)             | Enforce null checks                |     | ⚠️  |     | 💡  |
| [no-unsafe-type-narrowing](./rules/no-unsafe-type-narrowing.md)         | Safe type narrowing                |     | ⚠️  |     | 💡  |
| [expiring-todo-comments](./rules/expiring-todo-comments.md)             | Detect expired TODO comments       |     | ⚠️  |     | 💡  |
| [no-lonely-if](./rules/no-lonely-if.md)                                 | Detect lonely if statements        |     | ⚠️  | 🔧  |     |
| [no-nested-ternary](./rules/no-nested-ternary.md)                       | Forbid nested ternary expressions  |     | ⚠️  |     | 💡  |
| [prefer-code-point](./rules/prefer-code-point.md)                       | Prefer codePointAt over charCodeAt |     | ⚠️  | 🔧  |     |
| [prefer-dom-node-text-content](./rules/prefer-dom-node-text-content.md) | Prefer textContent over innerText  |     | ⚠️  | 🔧  |     |

## Error Handling (4 rules)

| Name                                                            | Description                | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------- | -------------------------- | --- | --- | --- | --- |
| [no-unhandled-promise](./rules/no-unhandled-promise.md)         | Handle promise rejections  |     |     |     | 💡  |
| [no-silent-errors](./rules/no-silent-errors.md)                 | No silent error swallowing |     |     |     | 💡  |
| [no-missing-error-context](./rules/no-missing-error-context.md) | Error context required     |     |     |     | 💡  |
| [error-message](./rules/error-message.md)                       | Require error messages     |     | ⚠️  |     | 💡  |

## Complexity (2 rules)

| Name                                                                | Description                | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------- | -------------------------- | --- | --- | --- | --- |
| [cognitive-complexity](./rules/cognitive-complexity.md)             | Limit cognitive complexity |     |     |     |     |
| [nested-complexity-hotspots](./rules/nested-complexity-hotspots.md) | Detect complexity hotspots |     |     |     | 💡  |

## DDD (2 rules)

| Name                                                                      | Description               | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------- | ------------------------- | --- | --- | --- | --- |
| [ddd-anemic-domain-model](./rules/ddd-anemic-domain-model.md)             | Detect anemic models      |     |     |     | 💡  |
| [ddd-value-object-immutability](./rules/ddd-value-object-immutability.md) | Value object immutability |     |     |     | 💡  |

## Migration (1 rule)

| Name                                                    | Description        | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------- | ------------------ | --- | --- | --- | --- |
| [react-class-to-hooks](./rules/react-class-to-hooks.md) | Migration to hooks |     |     |     |     |

## Deprecation (1 rule)

| Name                                              | Description             | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------- | ----------------------- | --- | --- | --- | --- |
| [no-deprecated-api](./rules/no-deprecated-api.md) | Prevent deprecated APIs |     |     |     |     |

## Domain (1 rule)

| Name                                        | Description            | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------- | ---------------------- | --- | --- | --- | --- |
| [enforce-naming](./rules/enforce-naming.md) | Domain-specific naming |     |     |     |     |

## Duplication (1 rule)

| Name                                                  | Description                | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------- | -------------------------- | --- | --- | --- | --- |
| [identical-functions](./rules/identical-functions.md) | Detect duplicate functions |     |     |     |     |

## API (1 rule)

| Name                                                            | Description          | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------- | -------------------- | --- | --- | --- | --- |
| [enforce-rest-conventions](./rules/enforce-rest-conventions.md) | REST API conventions |     |     |     | 💡  |
