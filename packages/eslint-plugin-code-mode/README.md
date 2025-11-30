# eslint-plugin-code-mode

**ESLint rules optimized for Code Mode.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-code-mode.svg)](https://www.npmjs.com/package/eslint-plugin-code-mode)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-code-mode.svg)](https://www.npmjs.com/package/eslint-plugin-code-mode)

> **Keywords:** ESLint plugin, Code Mode, AI assistant, auto-fix, code quality, security rules, TypeScript ESLint, automated code fixes, GitHub Copilot, Cursor AI, Claude AI, structured error messages, CWE references, deterministic fixes

---

## 🎯 The Problem with Traditional ESLint Rules

Traditional ESLint plugins tell developers **what's wrong** but leave them guessing **how to fix it**. This becomes critical when:

- **Non-fixable rules** leave AI assistants without guidance on how to resolve issues
- **Generic error messages** force LLMs to hallucinate solutions, leading to inconsistent fixes
- **Multiple plugins** are needed to cover security, architecture, React, and code quality
- **No Code Mode optimization** means AI tools can't leverage structured error messages effectively

---

## 💡 The Solution: Code Mode-Optimized Error Messages

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

### 2. Built for Code Mode & ESLint MCP Integration

This plugin is specifically optimized for Code Mode and ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), the official bridge between ESLint and AI assistants.

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

**Code Mode + LLM-Optimized Messages = Maximum AI Capability**

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
npm install --save-dev eslint-plugin-code-mode

# 2. Add to eslint.config.js
import codeMode from 'eslint-plugin-code-mode';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  codeMode.configs.recommended,
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
| **Code Mode Optimization**    | ✅ Built for Code Mode                   | ❌ No Code Mode consideration  |
| **All-in-One Coverage**       | ✅ 137 rules across 10+ categories       | ⚠️ Multiple plugins needed     |
| **AI Auto-Fix Rate**          | ✅ 60-80% (including guided non-fixable) | ⚠️ 20-30% (auto-fix only)      |
| **Security Rules**            | ✅ 29 rules with CWE references          | ⚠️ Limited coverage            |
| **Deterministic Fixes**       | ✅ Same violation = same fix             | ⚠️ Inconsistent AI suggestions |
| **Documentation Links**       | ✅ Every error includes docs             | ❌ Rarely included             |
| **Package Name**              | ✅ Code Mode-focused                     | ⚠️ Generic names               |

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
export default [codeMode.configs.recommended, codeMode.configs.security];
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

> This package (`eslint-plugin-code-mode`) re-exports `@forge-js/eslint-plugin-llm-optimized` with a Code Mode-focused name.

**All these packages are functionally identical (137 rules each):**

- `eslint-plugin-code-mode` (this package - Code Mode-focused)
- `@forge-js/eslint-plugin-llm-optimized` (scoped, original)
- `eslint-plugin-llm` (shortest name)
- `eslint-plugin-llm-optimized` (descriptive)
- `eslint-plugin-mcp` (MCP-focused)
- `eslint-plugin-mcp-optimized` (MCP-optimized)

**Choose based on naming preference—they all work the same way!**

---

## ❓ FAQ

**Q: How is this different from standard ESLint plugins?**  
A: Standard plugins tell you "what's wrong." This plugin tells AI assistants "how to fix it" with structured messages—even for rules that can't be auto-fixed.

**Q: Do I need Code Mode or ESLint MCP?**  
A: No, but it's recommended. This plugin works standalone but is specifically optimized for Code Mode integration.

**Q: Will this slow down linting?**  
A: No. <10ms overhead per file. Rules use efficient AST traversal with caching.

**Q: Can I use this without AI assistants?**  
A: Yes. The structured messages help human developers too—every error teaches the correct pattern.

---

## 📚 Full Documentation

See the complete rule documentation at [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) for:

- All 137 rules with detailed descriptions
- Advanced configuration options
- Integration guides

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
