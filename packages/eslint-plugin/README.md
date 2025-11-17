# @forge-js/eslint-plugin-llm-optimized

**ESLint rules that AI assistants can actually fix.**

[![npm version](https://img.shields.io/npm/v/@forge-js/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)
[![npm downloads](https://img.shields.io/npm/dm/@forge-js/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)

> **Keywords:** ESLint plugin, LLM-optimized, AI assistant, auto-fix, ESLint MCP, Model Context Protocol, code quality, security rules, TypeScript ESLint, automated code fixes, GitHub Copilot, Cursor AI, Claude AI, structured error messages, CWE references, deterministic fixes

This plugin provides **62+ ESLint rules** with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand the violation and apply consistent fixes.

**Designed for ESLint MCP:** This package is specifically optimized to maximize capabilities when used with ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp) integration, enabling seamless AI assistant interactions through structured, parseable error messages.

**Core principle:** Every error message should teach, not just warn.

## Why Choose This Plugin?

| Feature                        | This Plugin                                            | Standard ESLint Plugins          |
| ------------------------------ | ------------------------------------------------------ | -------------------------------- |
| **All-in-One Solution**        | ✅ 62+ rules across 10+ categories (one-stop shop)     | ⚠️ Usually single-focus plugins  |
| **AI Assistant Compatibility** | ✅ Optimized for LLMs (Copilot, Cursor, Claude)        | ❌ Generic error messages        |
| **Auto-Fix Rate**              | ✅ 60-80% of violations auto-fixed                     | ⚠️ 20-30% auto-fixable           |
| **Error Message Quality**      | ✅ Structured with examples, fixes, documentation      | ⚠️ Basic "what's wrong" messages |
| **ESLint MCP Support**         | ✅ Fully optimized for MCP integration                 | ❌ No MCP optimization           |
| **Security Rules**             | ✅ 27 comprehensive security rules with CWE references | ⚠️ Limited security coverage     |
| **Deterministic Fixes**        | ✅ Same violation = same fix every time                | ⚠️ Inconsistent fixes            |
| **Documentation Links**        | ✅ Every error includes relevant docs                  | ❌ No documentation links        |
| **TypeScript Support**         | ✅ Full TypeScript support                             | ✅ TypeScript support            |
| **React Rules**                | ✅ 3 React-specific rules                              | ✅ React rules available         |
| **Performance Impact**         | ✅ <10ms overhead per file                             | ✅ Low overhead                  |

**Best for:** Teams using AI coding assistants (GitHub Copilot, Cursor, Claude), projects requiring consistent code quality, security-critical applications, and organizations scaling code standards across multiple teams.

---

## 🚀 Quick Start

Get started in 30 seconds:

```bash
# 1. Install
npm install --save-dev @forge-js/eslint-plugin-llm-optimized

# 2. Add to eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  llmOptimized.configs.recommended,
];

# 3. Run ESLint
npx eslint .
```

**That's it!** You'll now see LLM-optimized error messages that AI assistants can automatically fix.

---

## Why This Works

Traditional ESLint rules communicate _what's wrong_. This plugin ensures every rule communicates _how to fix it_ in a way that both humans and AI can understand.

- **Deterministic fixes** - Same violation = same fix every time
- **Structured context** - CWE references, examples, documentation links
- **Lower review burden** - 60-80% of violations auto-fixed before human review
- **Faster onboarding** - New developers learn patterns from every error message

**For organizations scaling code quality:** See [ESLint + LLMs: Leadership Strategy](https://github.com/ofri-peretz/forge-js/blob/main/docs/ESLINT_LEADERSHIP_STRATEGY.md) for implementation approaches, ROI calculations, and deployment strategies.

---

## Rules

💼 Set in the `recommended` configuration.  
⚠️ Set to warn in the `recommended` configuration.  
🔧 Automatically fixable by the `--fix` CLI option.  
💡 Manually fixable by editor suggestions.  
❌ Deprecated.  
🎨 SonarQube-inspired rule.

### Development

| Name                                                                                     | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-console-log](./docs/rules/no-console-log.md)                                         | Disallow `console.log` with configurable remediation strategies and LLM-optim... |     | ⚠️  | 🔧  |     |
| [prefer-dependency-version-strategy](./docs/rules/prefer-dependency-version-strategy.md) | Enforce consistent version strategy (caret `^`, tilde `~`, exact, range, or a... |     | ⚠️  | 🔧  |     |

### Architecture

| Name                                                                             | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-circular-dependencies](./docs/rules/no-circular-dependencies.md)             | Detects and reports circular dependencies that cause memory bloat during bund... |     |     |     |     |
| [no-internal-modules](./docs/rules/no-internal-modules.md)                       | Prevent importing from internal/deep module paths with configurable strategie... |     |     |     |     |
| [no-cross-domain-imports](./docs/rules/no-cross-domain-imports.md)               | ESLint Rule: no-cross-domain-imports with LLM-optimized suggestions and auto-... |     |     |     | 💡  |
| [enforce-dependency-direction](./docs/rules/enforce-dependency-direction.md)     | ESLint Rule: enforce-dependency-direction with LLM-optimized suggestions and ... |     |     |     | 💡  |
| [no-external-api-calls-in-utils](./docs/rules/no-external-api-calls-in-utils.md) | ESLint Rule: no-external-api-calls-in-utils with LLM-optimized suggestions an... |     |     |     | 💡  |

### Security

| Name                                                                             | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-sql-injection](./docs/rules/no-sql-injection.md)                             | Disallows SQL injection vulnerabilities by detecting string concatenation in ... | 💼  |     |     |     |
| [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md)           | Disallows dynamic `require()` calls with non-literal arguments that could lea... | 💼  |     |     |     |
| [database-injection](./docs/rules/database-injection.md)                         | Comprehensive database injection detection across SQL, NoSQL, and ORM queries... | 💼  |     |     |     |
| [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md)       | Detects `eval(variable)` which can allow an attacker to run arbitrary code in... | 💼  |     |     |     |
| [detect-child-process](./docs/rules/detect-child-process.md)                     | Detects instances of `child_process` & non-literal `exec()` calls that may al... | 💼  |     |     |     |
| [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md) | Detects variable in filename argument of fs calls, which might allow an attac... | 💼  |     |     |     |
| [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md)           | Detects `RegExp(variable)`, which might allow an attacker to DOS your server ... | 💼  |     |     |     |
| [detect-object-injection](./docs/rules/detect-object-injection.md)               | Detects `variable[key]` as a left- or right-hand assignment operand (prototyp... | 💼  |     |     |     |
| [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md)             | Detects hardcoded passwords, API keys, tokens, and other sensitive credential... | 💼  |     |     |     |
| [no-weak-crypto](./docs/rules/no-weak-crypto.md)                                 | Detects use of weak cryptography algorithms (MD5, SHA1, DES, 3DES, RC4) and s... | 💼  |     |     |     |
| [no-insufficient-random](./docs/rules/no-insufficient-random.md)                 | ESLint rule                                                                      | 💼  |     |     |     |
| [no-unvalidated-user-input](./docs/rules/no-unvalidated-user-input.md)           | Detects unvalidated user input usage (req.body, req.query, etc.) in Express, ... | 💼  |     |     |     |
| [no-unsanitized-html](./docs/rules/no-unsanitized-html.md)                       | Detects unsanitized HTML injection (dangerouslySetInnerHTML, innerHTML) that ... | 💼  |     |     |     |
| [no-unescaped-url-parameter](./docs/rules/no-unescaped-url-parameter.md)         | Detects unescaped URL parameters that can lead to Cross-Site Scripting (XSS) ... | 💼  |     |     |     |
| [no-missing-cors-check](./docs/rules/no-missing-cors-check.md)                   | Detects missing CORS validation (wildcard CORS, missing origin check) that ca... | 💼  |     |     |     |
| [no-insecure-comparison](./docs/rules/no-insecure-comparison.md)                 | Detects insecure comparison operators (`==`, `!=`) that can lead to type coer... | 💼  |     |     |     |
| [no-missing-authentication](./docs/rules/no-missing-authentication.md)           | Detects missing authentication checks in route handlers. This rule is part of... | 💼  |     |     |     |
| [no-privilege-escalation](./docs/rules/no-privilege-escalation.md)               | Detects potential privilege escalation vulnerabilities where user input is us... | 💼  |     |     |     |
| [no-insecure-cookie-settings](./docs/rules/no-insecure-cookie-settings.md)       | Detects insecure cookie configurations (missing httpOnly, secure, sameSite fl... | 💼  |     |     |     |
| [no-missing-csrf-protection](./docs/rules/no-missing-csrf-protection.md)         | Detects missing CSRF token validation in POST/PUT/DELETE requests. This rule ... | 💼  |     |     |     |
| [no-exposed-sensitive-data](./docs/rules/no-exposed-sensitive-data.md)           | Detects exposure of sensitive data (SSN, credit card numbers, passwords, API ... | 💼  |     |     |     |
| [no-unencrypted-transmission](./docs/rules/no-unencrypted-transmission.md)       | Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols). ... | 💼  |     |     |     |
| [no-redos-vulnerable-regex](./docs/rules/no-redos-vulnerable-regex.md)           | ESLint Rule: no-redos-vulnerable-regex with LLM-optimized suggestions and aut... | 💼  |     |     | 💡  |
| [no-unsafe-regex-construction](./docs/rules/no-unsafe-regex-construction.md)     | ESLint Rule: no-unsafe-regex-construction with LLM-optimized suggestions and ... | 💼  |     |     | 💡  |
| [no-sensitive-data-exposure](./docs/rules/no-sensitive-data-exposure.md)         | ESLint Rule: no-sensitive-data-exposure with LLM-optimized suggestions and au... | 💼  |     |     | 💡  |
| [no-toctou-vulnerability](./docs/rules/no-toctou-vulnerability.md)               | ESLint Rule: no-toctou-vulnerability with LLM-optimized suggestions and auto-... | 💼  |     |     | 💡  |
| [no-missing-security-headers](./docs/rules/no-missing-security-headers.md)       | ESLint Rule: no-missing-security-headers with LLM-optimized suggestions and a... | 💼  |     |     | 💡  |
| [no-insecure-redirects](./docs/rules/no-insecure-redirects.md)                   | ESLint Rule: no-insecure-redirects with LLM-optimized suggestions and auto-fi... | 💼  |     |     | 💡  |

### Accessibility

| Name                                                                                   | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-keyboard-inaccessible-elements](./docs/rules/no-keyboard-inaccessible-elements.md) | ESLint Rule: no-keyboard-inaccessible-elements with LLM-optimized suggestions... |     | ⚠️  |     | 💡  |
| [no-missing-aria-labels](./docs/rules/no-missing-aria-labels.md)                       | ESLint Rule: no-missing-aria-labels with LLM-optimized suggestions and auto-f... |     | ⚠️  |     | 💡  |
| [img-requires-alt](./docs/rules/img-requires-alt.md)                                   | Enforces `alt` attribute on `<img>` elements for accessibility (WCAG 2.1 Leve... |     | ⚠️  |     |     |

### React

| Name                                                       | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [required-attributes](./docs/rules/required-attributes.md) | Enforce required attributes on React components with customizable ignore list... |     |     | 🔧  |     |

### Performance

| Name                                                                   | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-unnecessary-rerenders](./docs/rules/no-unnecessary-rerenders.md)   | ESLint Rule: no-unnecessary-rerenders with LLM-optimized suggestions and auto... |     | ⚠️  |     | 💡  |
| [no-memory-leak-listeners](./docs/rules/no-memory-leak-listeners.md)   | ESLint Rule: no-memory-leak-listeners with LLM-optimized suggestions and auto... |     | ⚠️  |     | 💡  |
| [no-blocking-operations](./docs/rules/no-blocking-operations.md)       | ESLint Rule: no-blocking-operations with LLM-optimized suggestions and auto-f... |     | ⚠️  |     | 💡  |
| [no-unbounded-cache](./docs/rules/no-unbounded-cache.md)               | ESLint Rule: no-unbounded-cache with LLM-optimized suggestions and auto-fix c... |     | ⚠️  |     | 💡  |
| [detect-nplus-one-queries](./docs/rules/detect-nplus-one-queries.md)   | ESLint rule                                                                      |     | ⚠️  |     |     |
| [react-render-optimization](./docs/rules/react-render-optimization.md) | ESLint Rule: react-render-optimization with LLM-optimized suggestions and aut... |     | ⚠️  |     | 💡  |
| [react-no-inline-functions](./docs/rules/react-no-inline-functions.md) | Prevent inline functions in React renders with performance metrics. This rule... |     | ⚠️  |     |     |

### Migration

| Name                                                         | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [react-class-to-hooks](./docs/rules/react-class-to-hooks.md) | Suggest migrating React class components to hooks with detailed migration pat... |     |     |     |     |

### Deprecation

| Name                                                   | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-deprecated-api](./docs/rules/no-deprecated-api.md) | Prevent usage of deprecated APIs with migration context and timeline. This ru... |     |     |     |     |

### Domain

| Name                                             | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------ | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [enforce-naming](./docs/rules/enforce-naming.md) | Enforce domain-specific naming conventions with business context. This rule i... |     |     |     |     |

### Complexity

| Name                                                                     | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [cognitive-complexity](./docs/rules/cognitive-complexity.md)             | Enforces a maximum cognitive complexity threshold with refactoring guidance. ... |     |     |     |     |
| [nested-complexity-hotspots](./docs/rules/nested-complexity-hotspots.md) | ESLint Rule: nested-complexity-hotspots with LLM-optimized suggestions and au... |     |     |     | 💡  |

### Duplication

| Name                                                       | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [identical-functions](./docs/rules/identical-functions.md) | Detects duplicate function implementations with DRY refactoring suggestions. ... |     |     |     |     |

### Quality

| Name                                                                 | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-commented-code](./docs/rules/no-commented-code.md)               | ESLint Rule: no-commented-code with LLM-optimized suggestions and auto-fix ca... |     | ⚠️  |     | 💡  |
| [max-parameters](./docs/rules/max-parameters.md)                     | ESLint Rule: max-parameters with LLM-optimized suggestions and auto-fix capab... |     | ⚠️  |     | 💡  |
| [no-missing-null-checks](./docs/rules/no-missing-null-checks.md)     | ESLint Rule: no-missing-null-checks with LLM-optimized suggestions and auto-f... |     | ⚠️  |     | 💡  |
| [no-unsafe-type-narrowing](./docs/rules/no-unsafe-type-narrowing.md) | ESLint Rule: no-unsafe-type-narrowing with LLM-optimized suggestions and auto... |     | ⚠️  |     | 💡  |

### Error handling

| Name                                                                 | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [no-unhandled-promise](./docs/rules/no-unhandled-promise.md)         | Disallow unhandled Promise rejections with LLM-optimized suggestions for prop... |     |     |     | 💡  |
| [no-silent-errors](./docs/rules/no-silent-errors.md)                 | ESLint Rule: no-silent-errors with LLM-optimized suggestions and auto-fix cap... |     |     |     | 💡  |
| [no-missing-error-context](./docs/rules/no-missing-error-context.md) | ESLint Rule: no-missing-error-context with LLM-optimized suggestions and auto... |     |     |     | 💡  |

### Ddd

| Name                                                                           | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [ddd-anemic-domain-model](./docs/rules/ddd-anemic-domain-model.md)             | ESLint Rule: ddd-anemic-domain-model with LLM-optimized suggestions and auto-... |     |     |     | 💡  |
| [ddd-value-object-immutability](./docs/rules/ddd-value-object-immutability.md) | ESLint Rule: ddd-value-object-immutability with LLM-optimized suggestions and... |     |     |     | 💡  |

### Api

| Name                                                                 | Description                                                                      | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | --- | --- | --- |
| [enforce-rest-conventions](./docs/rules/enforce-rest-conventions.md) | ESLint Rule: enforce-rest-conventions with LLM-optimized suggestions and auto... |     |     |     | 💡  |

---
