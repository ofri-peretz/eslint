# @forge-js/eslint-plugin-llm-optimized

**ESLint rules that AI assistants can actually understand and fix.**

[![npm version](https://img.shields.io/npm/v/@forge-js/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)
[![npm downloads](https://img.shields.io/npm/dm/@forge-js/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)

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

This plugin provides **144 ESLint rules** where every error message is structured to guide both humans and AI assistants toward the correct fix—**even for rules that can't be auto-fixed**.

```bash
src/api.ts
  42:15  error  🔒 CWE-89 | SQL Injection detected | CRITICAL
                  Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection

  58:3   warning  ⚠️ CWE-532 | console.log found in production code | MEDIUM
                  Fix: Use logger.debug() or remove statement | https://eslint.org/docs/latest/rules/no-console
```

**Core principle:** Every error message should teach, not just warn.

---

## 🚀 Quick Start

```bash
# 1. Install
npm install --save-dev @forge-js/eslint-plugin-llm-optimized

# 2. Add to eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  llmOptimized.configs.recommended,
  // OR for specific needs:
  // llmOptimized.configs.security,
  // llmOptimized.configs['react-modern'],
];

# 3. Run ESLint
npx eslint .
```

---

## 📚 Documentation

- **[Rules Reference](./docs/RULES.md)**: Complete list of all 137 rules with configuration options.
- **[Migration Guide](./docs/MIGRATION.md)**: Coming from `eslint-plugin-import` or `eslint-plugin-security`? Start here.
- **[Benchmarks](../../docs/BENCHMARK.md)**: Performance comparisons vs industry standards.
- **[Leadership Strategy](../../docs/ESLINT_LEADERSHIP_STRATEGY.md)**: How to roll this out in your organization.

---

## 🔥 Key Features

### 1. LLM Guidance for Non-Fixable Rules

**The biggest differentiator.** Traditional ESLint plugins with non-fixable rules just say "this is wrong." Our structured messages tell AI assistants exactly how to solve it.

| Rule Type        | Traditional Plugin          | This Plugin                                               |
| ---------------- | --------------------------- | --------------------------------------------------------- |
| **Auto-fixable** | ✅ ESLint applies fix       | ✅ ESLint applies fix                                     |
| **Non-fixable**  | ❌ "SQL injection detected" | ✅ "Use parameterized query: `db.query("...", [userId])`" |

### 2. Built for ESLint MCP Integration

This plugin is specifically optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp).

> 💡 **Important:** This is a standard ESLint plugin. You don't need ESLint MCP to use it, but it works seamlessly with it.

### 3. All-in-One Solution (107 Rules)

Stop juggling multiple plugins. One install covers:

- **Architecture**: 28 rules (Circular deps, module boundaries)
- **Imports**: 7 rules (Validation, duplicates, extensions)
- **React**: 41 rules (Keys, hooks, optimization)
- **Code Quality**: 9 rules (Complexity, null checks)
- **Performance**: 7 rules (Memory leaks, N+1 queries)
- **DDD/Domain**: 3 rules (Anemic models, value objects)

> **See also:** [eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding) (48 security rules) | [eslint-plugin-react-a11y](https://www.npmjs.com/package/eslint-plugin-react-a11y) (37 accessibility rules)

---

## 📊 Why Choose This Plugin?

| Feature                       | This Plugin                              | Standard ESLint Plugins        |
| ----------------------------- | ---------------------------------------- | ------------------------------ |
| **Non-Fixable Rule Guidance** | ✅ Structured fix instructions for AI    | ❌ Generic "what's wrong" only |
| **ESLint MCP Optimization**   | ✅ Built for MCP integration             | ❌ No MCP consideration        |
| **All-in-One Coverage**       | ✅ 107 rules across 10+ categories       | ⚠️ Multiple plugins needed     |
| **AI Auto-Fix Rate**          | ✅ 60-80% (including guided non-fixable) | ⚠️ 20-30% (auto-fix only)      |
| **Modular Packages**          | ✅ Security & A11y as separate packages  | ⚠️ Limited coverage            |
| **Performance Impact**        | ✅ <10ms overhead per file               | ✅ Low overhead                |

---

## 🔒 Privacy & Security

Unlike cloud-based security scanners, this plugin runs **100% locally**:

- **Data leaves your machine:** ❌ Never
- **API calls required:** ❌ None
- **Works offline:** ✅ Yes
- **License:** ✅ MIT (Open Source)

---

## 📋 Available Presets

| Preset             | Best For                             |
| ------------------ | ------------------------------------ |
| **`recommended`**  | Most projects - balanced enforcement |
| **`strict`**       | Maximum code quality                 |
| **`security`**     | Security-critical applications       |
| **`react`**        | React/Next.js projects               |
| **`react-modern`** | Modern React (functional components) |
| **`architecture`** | Clean architecture enforcement       |
| **`performance`**  | Performance-critical applications    |

---

## 📦 Related Packages

All packages below are **functionally identical** - choose based on naming preference:

- **[eslint-plugin-llm](https://www.npmjs.com/package/eslint-plugin-llm)**
- **[eslint-plugin-llm-optimized](https://www.npmjs.com/package/eslint-plugin-llm-optimized)**
- **[eslint-plugin-mcp](https://www.npmjs.com/package/eslint-plugin-mcp)**
- **[eslint-plugin-mcp-optimized](https://www.npmjs.com/package/eslint-plugin-mcp-optimized)**

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
