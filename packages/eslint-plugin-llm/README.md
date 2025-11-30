# eslint-plugin-llm

**ESLint rules that AI assistants can actually understand and fix.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)

> **Keywords:** ESLint plugin, LLM-optimized, AI assistant, auto-fix, ESLint MCP, Model Context Protocol, code quality, security rules, TypeScript ESLint, automated code fixes, GitHub Copilot, Cursor AI, Claude AI, structured error messages, CWE references, deterministic fixes

---

## 🎯 The Problem with Traditional ESLint Rules

Traditional ESLint plugins tell developers **what's wrong** but leave them guessing **how to fix it**. This becomes critical when:

- **Non-fixable rules** leave AI assistants without guidance on how to resolve issues
- **Generic error messages** force LLMs to hallucinate solutions, leading to inconsistent fixes
- **Multiple plugins** are needed to cover security, architecture, React, and code quality
- **No MCP optimization** means AI tools can't leverage ESLint's Model Context Protocol effectively

---

## 💡 The Solution: LLM-Optimized Error Messages

This plugin provides **137 ESLint rules** where every error message is structured to guide both humans and AI assistants toward the correct fix—**even for rules that can't be auto-fixed**.

```bash
src/api.ts
  42:15  error  🔒 CWE-89 | SQL Injection detected | CRITICAL
                  Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection

  58:3   warning  ⚠️ CWE-532 | console.log found in production code | MEDIUM
                  Fix: Use logger.debug() or remove statement | https://eslint.org/docs/latest/rules/no-console
```

**Core principle:** Every error message should teach, not just warn.

---

## 🔥 Three Competitive Edges

### 1. LLM Guidance for Non-Fixable Rules

**The biggest differentiator.** Traditional ESLint plugins with non-fixable rules just say "this is wrong." Our structured messages tell AI assistants exactly how to solve it.

| Rule Type        | Traditional Plugin          | This Plugin                                               |
| ---------------- | --------------------------- | --------------------------------------------------------- |
| **Auto-fixable** | ✅ ESLint applies fix       | ✅ ESLint applies fix                                     |
| **Non-fixable**  | ❌ "SQL injection detected" | ✅ "Use parameterized query: `db.query("...", [userId])`" |

**Why this matters for organizations:**

- **Spread guidelines easily** - Complex conventions that can't be auto-fixed (architecture patterns, security practices) become enforceable
- **Consistent AI fixes** - Same violation = same fix suggestion = deterministic results
- **Self-documenting standards** - Every error teaches the correct pattern with documentation links

### 2. Built for ESLint MCP Integration

This plugin is specifically optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), the official bridge between ESLint and AI assistants.

```json
// .cursor/mcp.json or .vscode/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

**MCP + LLM-Optimized Messages = Maximum AI Capability**

- AI reads structured errors in real-time
- Understands severity, CWE references, and fix instructions
- Applies consistent fixes automatically
- Provides context-aware suggestions even for complex refactors

### 3. All-in-One Solution (137 Rules)

Stop juggling multiple plugins. One install covers:

| Category           | Rules | Examples                                       |
| ------------------ | ----- | ---------------------------------------------- |
| **Security**       | 29    | SQL injection, XSS, CSRF, credentials, crypto  |
| **Architecture**   | 28    | Circular deps, module boundaries, imports      |
| **React**          | 41    | Keys, hooks, state management, best practices  |
| **Code Quality**   | 9     | Complexity, null checks, ternary expressions   |
| **Development**    | 7     | Console logs, module formats, dependencies     |
| **Performance**    | 7     | Memory leaks, N+1 queries, render optimization |
| **Error Handling** | 4     | Unhandled promises, silent errors, context     |
| **Accessibility**  | 3     | Alt text, ARIA labels, keyboard navigation     |
| **Other**          | 9     | Complexity, DDD, migration, deprecation, API   |

---

## 🚀 Quick Start

```bash
# 1. Install
npm install --save-dev eslint-plugin-llm

# 2. Add to eslint.config.js
import llm from 'eslint-plugin-llm';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  llm.configs.recommended,
];

# 3. Run ESLint
npx eslint .
```

**That's it!** AI assistants now receive structured, actionable guidance for every violation.

---

## 📊 Why Choose This Plugin?

| Feature                       | This Plugin                              | Standard ESLint Plugins        |
| ----------------------------- | ---------------------------------------- | ------------------------------ |
| **Non-Fixable Rule Guidance** | ✅ Structured fix instructions for AI    | ❌ Generic "what's wrong" only |
| **ESLint MCP Optimization**   | ✅ Built for MCP integration             | ❌ No MCP consideration        |
| **All-in-One Coverage**       | ✅ 137 rules across 10+ categories       | ⚠️ Multiple plugins needed     |
| **AI Auto-Fix Rate**          | ✅ 60-80% (including guided non-fixable) | ⚠️ 20-30% (auto-fix only)      |
| **Security Rules**            | ✅ 29 rules with CWE references          | ⚠️ Limited coverage            |
| **Deterministic Fixes**       | ✅ Same violation = same fix             | ⚠️ Inconsistent AI suggestions |
| **Documentation Links**       | ✅ Every error includes docs             | ❌ Rarely included             |
| **Package Name**              | ✅ Short, discoverable                   | ⚠️ Longer names                |

---

## 📈 Benchmarks

| Metric                     | This Plugin | eslint-plugin-security | eslint-plugin-import |
| -------------------------- | ----------- | ---------------------- | -------------------- |
| **Security Rules**         | 29 rules    | 6 rules                | 0 rules              |
| **False Positive Rate**    | 7.1%        | 24.9%                  | N/A                  |
| **AI Fix Success Rate**    | 94%         | 67%                    | 78%                  |
| **Circular Dep Detection** | 100%        | N/A                    | 73%                  |

| Capability             | Our Implementation              | Industry Standard |
| ---------------------- | ------------------------------- | ----------------- |
| **LLM Message Format** | ✅ Structured 2-line with CWE   | ❌ Plain text     |
| **Compliance Mapping** | ✅ SOC2, HIPAA, PCI-DSS auto    | ❌ None           |
| **SARIF Export**       | ✅ Full GitHub Security support | ⚠️ Basic          |

> 📊 **[Full Benchmarks →](https://github.com/ofri-peretz/forge-js/blob/main/docs/BENCHMARK.md)**

---

## 📋 Available Presets

| Preset            | Rules                    | Best For                             |
| ----------------- | ------------------------ | ------------------------------------ |
| **`recommended`** | Core rules (balanced)    | Most projects - balanced enforcement |
| **`strict`**      | All 137 rules as errors  | Maximum code quality                 |
| **`security`**    | 29 security rules        | Security-critical applications       |
| **`react`**       | 40+ React-specific rules | React/Next.js projects               |
| **`sonarqube`**   | SonarQube-inspired rules | Teams using SonarQube                |

```javascript
// Use multiple presets
export default [llm.configs.recommended, llm.configs.security];
```

---

## 🏢 For Organizations

**Scaling Code Standards Across Teams**

This plugin enables organizations to enforce conventions that traditional static analysis can't handle:

| Challenge                     | Traditional Approach       | LLM-Optimized Approach             |
| ----------------------------- | -------------------------- | ---------------------------------- |
| Complex architecture patterns | Code reviews catch some    | AI guided by structured rules      |
| Security best practices       | Training + manual review   | Every violation teaches the fix    |
| Domain-specific naming        | Documentation nobody reads | Errors include correct terminology |
| Migration patterns            | Manual tracking            | AI applies consistent migrations   |

---

## 📦 Package Information

> This package (`eslint-plugin-llm`) re-exports `@forge-js/eslint-plugin-llm-optimized` with a shorter, more discoverable name.

**All these packages are functionally identical:**

- `eslint-plugin-llm` (this package - shortest name)
- `@forge-js/eslint-plugin-llm-optimized` (scoped, original)
- `eslint-plugin-llm-optimized` (unscoped, descriptive)
- `eslint-plugin-mcp` (MCP-focused)
- `eslint-plugin-mcp-optimized` (MCP-optimized)
- `eslint-plugin-code-mode` (Code Mode-focused)

**Choose based on naming preference—they all work the same way!**

---

## ❓ FAQ

**Q: How is this different from standard ESLint plugins?**  
A: Standard plugins tell you "what's wrong." This plugin tells AI assistants "how to fix it" with structured messages—even for rules that can't be auto-fixed.

**Q: Do I need ESLint MCP?**  
A: No, but it's recommended. This plugin works standalone but is specifically optimized for MCP integration.

**Q: Will this slow down linting?**  
A: No. <10ms overhead per file. Rules use efficient AST traversal with caching.

**Q: Can I use this without AI assistants?**  
A: Yes. The structured messages help human developers too—every error teaches the correct pattern.

---

## 📚 Rules Reference (137 Rules)

💼 Set in `recommended` | ⚠️ Warns in `recommended` | 🔧 Auto-fixable | 💡 Editor suggestions

> 📖 **Full documentation:** [github.com/ofri-peretz/forge-js/packages/eslint-plugin/docs](https://github.com/ofri-peretz/forge-js/tree/main/packages/eslint-plugin/docs)

### Security (29 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [no-sql-injection](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-sql-injection.md) | Prevent SQL injection with string concatenation detection | 💼 | | | |
| [database-injection](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/database-injection.md) | Comprehensive injection detection (SQL, NoSQL, ORM) | 💼 | | | |
| [detect-eval-with-expression](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-eval-with-expression.md) | Detect eval() with dynamic expressions (RCE prevention) | 💼 | | | |
| [detect-child-process](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-child-process.md) | Detect command injection in child_process calls | 💼 | | | |
| [detect-non-literal-fs-filename](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-non-literal-fs-filename.md) | Detect path traversal in fs operations | 💼 | | | |
| [detect-non-literal-regexp](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-non-literal-regexp.md) | Detect ReDoS vulnerabilities in RegExp construction | 💼 | | | |
| [detect-object-injection](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-object-injection.md) | Detect prototype pollution in object property access | 💼 | | | |
| [no-unsafe-dynamic-require](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unsafe-dynamic-require.md) | Forbid dynamic require() with non-literal arguments | 💼 | | | |
| [no-hardcoded-credentials](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-hardcoded-credentials.md) | Detect hardcoded passwords, API keys, tokens | 💼 | | | |
| [no-weak-crypto](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-weak-crypto.md) | Detect weak cryptography (MD5, SHA1, DES) | 💼 | | | |
| [no-insufficient-random](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-insufficient-random.md) | Detect weak random (Math.random()) | 💼 | | | |
| [no-unvalidated-user-input](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unvalidated-user-input.md) | Detect unvalidated user input | 💼 | | | |
| [no-unsanitized-html](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unsanitized-html.md) | Detect XSS via unsanitized HTML | 💼 | | | |
| [no-unescaped-url-parameter](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unescaped-url-parameter.md) | Detect unescaped URL parameters | 💼 | | | |
| [no-missing-cors-check](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-missing-cors-check.md) | Detect missing CORS validation | 💼 | | | |
| [no-insecure-comparison](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-insecure-comparison.md) | Detect insecure == and != | 💼 | | 🔧 | |
| [no-missing-authentication](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-missing-authentication.md) | Detect missing auth checks | 💼 | | | |
| [no-privilege-escalation](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-privilege-escalation.md) | Detect privilege escalation | 💼 | | | |
| [no-insecure-cookie-settings](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-insecure-cookie-settings.md) | Detect insecure cookie configs | 💼 | | | |
| [no-missing-csrf-protection](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-missing-csrf-protection.md) | Detect missing CSRF protection | 💼 | | | |
| [no-exposed-sensitive-data](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-exposed-sensitive-data.md) | Detect PII exposure in logs | 💼 | | | |
| [no-unencrypted-transmission](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unencrypted-transmission.md) | Detect HTTP vs HTTPS issues | 💼 | | | |
| [no-redos-vulnerable-regex](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-redos-vulnerable-regex.md) | Detect ReDoS patterns | 💼 | | | 💡 |
| [no-unsafe-regex-construction](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unsafe-regex-construction.md) | Detect unsafe RegExp | 💼 | | | 💡 |
| [no-sensitive-data-exposure](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-sensitive-data-exposure.md) | Detect sensitive data exposure | 💼 | | | 💡 |
| [no-toctou-vulnerability](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-toctou-vulnerability.md) | Detect TOCTOU race conditions | 💼 | | | 💡 |
| [no-missing-security-headers](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-missing-security-headers.md) | Detect missing security headers | 💼 | | | 💡 |
| [no-insecure-redirects](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-insecure-redirects.md) | Detect open redirects | 💼 | | | 💡 |
| [no-document-cookie](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-document-cookie.md) | Detect document.cookie usage | 💼 | | | 💡 |

### Architecture (28 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [no-circular-dependencies](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-circular-dependencies.md) | Detect circular dependencies with chain analysis | | | | |
| [no-internal-modules](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-internal-modules.md) | Forbid importing internal/deep paths | | | | |
| [no-cross-domain-imports](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-cross-domain-imports.md) | Prevent cross-domain imports | | | | 💡 |
| [enforce-dependency-direction](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/enforce-dependency-direction.md) | Enforce dependency direction | | | | 💡 |
| [no-external-api-calls-in-utils](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-external-api-calls-in-utils.md) | No API calls in utils | | | | 💡 |
| [prefer-node-protocol](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-node-protocol.md) | Enforce node: protocol | | ⚠️ | 🔧 | |
| [consistent-existence-index-check](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/consistent-existence-index-check.md) | Consistent property checks | | ⚠️ | 🔧 | |
| [prefer-event-target](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-event-target.md) | Prefer EventTarget | | ⚠️ | | 💡 |
| [prefer-at](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-at.md) | Prefer .at() method | | ⚠️ | 🔧 | |
| [no-unreadable-iife](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unreadable-iife.md) | Prevent unreadable IIFEs | | ⚠️ | | 💡 |
| [no-await-in-loop](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-await-in-loop.md) | Disallow await in loops | | ⚠️ | | 💡 |
| [no-self-import](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-self-import.md) | Prevent self-imports | | ⚠️ | | 💡 |
| [no-unused-modules](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unused-modules.md) | Find unused exports | | ⚠️ | | 💡 |
| [no-extraneous-dependencies](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-extraneous-dependencies.md) | Detect extraneous dependencies | | ⚠️ | | 💡 |
| [max-dependencies](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/max-dependencies.md) | Limit module dependencies | | ⚠️ | | 💡 |
| [no-anonymous-default-export](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-anonymous-default-export.md) | Forbid anonymous exports | | ⚠️ | | 💡 |
| [no-restricted-paths](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-restricted-paths.md) | Restrict import paths | | ⚠️ | | 💡 |
| [no-deprecated](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-deprecated.md) | Detect deprecated imports | | ⚠️ | | 💡 |
| [no-mutable-exports](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-mutable-exports.md) | Forbid mutable exports | | ⚠️ | | 💡 |
| [prefer-default-export](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-default-export.md) | Prefer default export | | ⚠️ | | 💡 |
| [no-unresolved](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unresolved.md) | Detect unresolved imports | | | | 💡 |
| [no-relative-parent-imports](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-relative-parent-imports.md) | Forbid relative parent imports | | ⚠️ | | 💡 |
| [no-default-export](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-default-export.md) | Forbid default exports | | ⚠️ | | 💡 |
| [no-named-export](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-named-export.md) | Forbid named exports | | ⚠️ | | 💡 |
| [no-unassigned-import](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unassigned-import.md) | Forbid unassigned imports | | ⚠️ | | 💡 |
| [consistent-function-scoping](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/consistent-function-scoping.md) | Consistent function scoping | | ⚠️ | | 💡 |
| [filename-case](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/filename-case.md) | Enforce filename conventions | | ⚠️ | | 💡 |
| [no-instanceof-array](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-instanceof-array.md) | Forbid instanceof Array | | ⚠️ | 🔧 | |

### React (41 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [hooks-exhaustive-deps](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/hooks-exhaustive-deps.md) | Enforce exhaustive hook dependencies | | ⚠️ | | 💡 |
| [required-attributes](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/required-attributes.md) | Enforce required attributes | | | 🔧 | |
| [jsx-key](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/jsx-key.md) | Detect missing React keys | | | | 💡 |
| [no-direct-mutation-state](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-direct-mutation-state.md) | Prevent direct state mutation | | | | 💡 |
| [require-optimization](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/require-optimization.md) | Require React optimizations | | ⚠️ | | 💡 |
| [no-set-state](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-set-state.md) | Disallow setState in components | | | | 💡 |
| [no-this-in-sfc](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-this-in-sfc.md) | Disallow this in stateless components | | | | 💡 |
| [no-access-state-in-setstate](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-access-state-in-setstate.md) | Disallow this.state in setState | | | | 💡 |
| [no-children-prop](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-children-prop.md) | Disallow passing children as props | | | | 💡 |
| [no-danger](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-danger.md) | Disallow dangerouslySetInnerHTML | | | | 💡 |
| [no-string-refs](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-string-refs.md) | Disallow string refs | | | | 💡 |
| [no-unknown-property](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unknown-property.md) | Disallow unknown DOM properties | | | | 💡 |
| [checked-requires-onchange-or-readonly](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/checked-requires-onchange-or-readonly.md) | Require onChange or readOnly with checked | | | | 💡 |
| [default-props-match-prop-types](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/default-props-match-prop-types.md) | Enforce defaultProps match propTypes | | | | 💡 |
| [display-name](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/display-name.md) | Require displayName in components | | | | 💡 |
| [jsx-handler-names](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/jsx-handler-names.md) | Enforce handler naming conventions | | | | 💡 |
| [jsx-max-depth](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/jsx-max-depth.md) | Limit JSX nesting depth | | | | 💡 |
| [jsx-no-bind](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/jsx-no-bind.md) | Disallow bind() in JSX props | | | | 💡 |
| [jsx-no-literals](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/jsx-no-literals.md) | Disallow string literals in JSX | | | | 💡 |
| [no-adjacent-inline-elements](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-adjacent-inline-elements.md) | Disallow adjacent inline elements | | | | 💡 |
| [no-arrow-function-lifecycle](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-arrow-function-lifecycle.md) | Disallow arrow functions in lifecycle | | | | 💡 |
| [no-did-mount-set-state](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-did-mount-set-state.md) | Disallow setState in componentDidMount | | | | 💡 |
| [no-did-update-set-state](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-did-update-set-state.md) | Disallow setState in componentDidUpdate | | | | 💡 |
| [no-invalid-html-attribute](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-invalid-html-attribute.md) | Disallow invalid HTML attributes | | | | 💡 |
| [no-is-mounted](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-is-mounted.md) | Disallow isMounted | | | | 💡 |
| [no-multi-comp](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-multi-comp.md) | One component per file | | | | 💡 |
| [no-namespace](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-namespace.md) | Disallow namespace imports for React | | | | 💡 |
| [no-object-type-as-default-prop](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-object-type-as-default-prop.md) | Disallow object as default prop | | | | 💡 |
| [no-redundant-should-component-update](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-redundant-should-component-update.md) | Disallow redundant shouldComponentUpdate | | | | 💡 |
| [no-render-return-value](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-render-return-value.md) | Disallow render() return value | | | | 💡 |
| [no-typos](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-typos.md) | Detect common typos in React | | | | 💡 |
| [no-unescaped-entities](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unescaped-entities.md) | Disallow unescaped entities in JSX | | | | 💡 |
| [prefer-es6-class](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-es6-class.md) | Prefer ES6 class syntax | | | | 💡 |
| [prefer-stateless-function](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-stateless-function.md) | Prefer stateless functional components | | | | 💡 |
| [prop-types](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prop-types.md) | Require propTypes declarations | | | | 💡 |
| [react-in-jsx-scope](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/react-in-jsx-scope.md) | Require React in JSX scope | | | | 💡 |
| [require-default-props](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/require-default-props.md) | Require defaultProps for optional props | | | | 💡 |
| [require-render-return](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/require-render-return.md) | Require return in render | | | | 💡 |
| [sort-comp](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/sort-comp.md) | Enforce component method order | | | | 💡 |
| [state-in-constructor](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/state-in-constructor.md) | Enforce state initialization style | | | | 💡 |
| [static-property-placement](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/static-property-placement.md) | Enforce static property placement | | | | 💡 |

### Development (7 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [no-console-log](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-console-log.md) | Disallow console.log with strategies | | ⚠️ | 🔧 | |
| [prefer-dependency-version-strategy](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-dependency-version-strategy.md) | Enforce version strategy | | ⚠️ | 🔧 | |
| [no-amd](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-amd.md) | Disallow AMD imports | | ⚠️ | | 💡 |
| [no-commonjs](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-commonjs.md) | Disallow CommonJS imports | | ⚠️ | | 💡 |
| [no-nodejs-modules](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-nodejs-modules.md) | Disallow Node.js modules | | | | 💡 |
| [no-process-exit](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-process-exit.md) | Disallow process.exit() | | ⚠️ | | 💡 |
| [no-console-spaces](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-console-spaces.md) | Detect console.log spacing issues | | ⚠️ | 🔧 | |

### Performance (7 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [react-no-inline-functions](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/react-no-inline-functions.md) | Prevent inline functions in renders | | ⚠️ | | |
| [no-unnecessary-rerenders](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unnecessary-rerenders.md) | Detect unnecessary rerenders | | ⚠️ | | 💡 |
| [no-memory-leak-listeners](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-memory-leak-listeners.md) | Detect memory leak listeners | | ⚠️ | | 💡 |
| [no-blocking-operations](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-blocking-operations.md) | Detect blocking operations | | ⚠️ | | 💡 |
| [no-unbounded-cache](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unbounded-cache.md) | Detect unbounded caches | | ⚠️ | | 💡 |
| [detect-n-plus-one-queries](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-n-plus-one-queries.md) | Detect N+1 queries | | ⚠️ | | |
| [react-render-optimization](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/react-render-optimization.md) | React render optimization | | ⚠️ | | 💡 |

### Code Quality (9 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [no-commented-code](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-commented-code.md) | Remove commented code | | ⚠️ | | 💡 |
| [max-parameters](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/max-parameters.md) | Limit function parameters | | ⚠️ | | 💡 |
| [no-missing-null-checks](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-missing-null-checks.md) | Enforce null checks | | ⚠️ | | 💡 |
| [no-unsafe-type-narrowing](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unsafe-type-narrowing.md) | Safe type narrowing | | ⚠️ | | 💡 |
| [expiring-todo-comments](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/expiring-todo-comments.md) | Detect expired TODO comments | | ⚠️ | | 💡 |
| [no-lonely-if](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-lonely-if.md) | Detect lonely if statements | | ⚠️ | 🔧 | |
| [no-nested-ternary](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-nested-ternary.md) | Forbid nested ternary expressions | | ⚠️ | | 💡 |
| [prefer-code-point](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-code-point.md) | Prefer codePointAt over charCodeAt | | ⚠️ | 🔧 | |
| [prefer-dom-node-text-content](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/prefer-dom-node-text-content.md) | Prefer textContent over innerText | | ⚠️ | 🔧 | |

### Error Handling (4 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [no-unhandled-promise](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unhandled-promise.md) | Handle promise rejections | | | | 💡 |
| [no-silent-errors](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-silent-errors.md) | No silent error swallowing | | | | 💡 |
| [no-missing-error-context](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-missing-error-context.md) | Error context required | | | | 💡 |
| [error-message](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/error-message.md) | Require error messages | | ⚠️ | | 💡 |

### Accessibility (3 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [img-requires-alt](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/img-requires-alt.md) | Enforce alt text on images | | ⚠️ | | |
| [no-keyboard-inaccessible-elements](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-keyboard-inaccessible-elements.md) | Keyboard accessibility | | ⚠️ | | 💡 |
| [no-missing-aria-labels](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-missing-aria-labels.md) | Enforce ARIA labels | | ⚠️ | | 💡 |

### Complexity (2 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [cognitive-complexity](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/cognitive-complexity.md) | Limit cognitive complexity | | | | |
| [nested-complexity-hotspots](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/nested-complexity-hotspots.md) | Detect complexity hotspots | | | | 💡 |

### DDD (2 rules)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [ddd-anemic-domain-model](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/ddd-anemic-domain-model.md) | Detect anemic models | | | | 💡 |
| [ddd-value-object-immutability](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/ddd-value-object-immutability.md) | Value object immutability | | | | 💡 |

### Migration (1 rule)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [react-class-to-hooks](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/react-class-to-hooks.md) | Migration to hooks | | | | |

### Deprecation (1 rule)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [no-deprecated-api](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-deprecated-api.md) | Prevent deprecated APIs | | | | |

### Domain (1 rule)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [enforce-naming](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/enforce-naming.md) | Domain-specific naming | | | | |

### Duplication (1 rule)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [identical-functions](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/identical-functions.md) | Detect duplicate functions | | | | |

### API (1 rule)

| Name | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-------------|---|---|---|---|
| [enforce-rest-conventions](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/enforce-rest-conventions.md) | REST API conventions | | | | 💡 |

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
