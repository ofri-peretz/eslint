# eslint-plugin-llm

**ESLint rules optimized for Large Language Models.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)

> **Keywords:** ESLint plugin, LLM-optimized, AI assistant, auto-fix, ESLint MCP, Model Context Protocol, code quality, security rules, TypeScript ESLint, automated code fixes, GitHub Copilot, Cursor AI, Claude AI, structured error messages, CWE references, deterministic fixes, eslint-plugin-llm

This package is a barrel export that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`. It provides **20+ ESLint rules** with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand the violation and apply consistent fixes.

**Designed for ESLint MCP:** This package is specifically optimized to maximize capabilities when used with ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp) integration, enabling seamless AI assistant interactions through structured, parseable error messages.

**Core principle:** Every error message should teach, not just warn.

## Why Choose This Package?

| Feature | eslint-plugin-llm | Standard ESLint Plugins |
|---------|-------------------|------------------------|
| **Package Name** | ✅ Short, discoverable name | ⚠️ Longer names |
| **AI Assistant Compatibility** | ✅ Optimized for LLMs (Copilot, Cursor, Claude) | ❌ Generic error messages |
| **Auto-Fix Rate** | ✅ 60-80% of violations auto-fixed | ⚠️ 20-30% auto-fixable |
| **Error Message Quality** | ✅ Structured with examples, fixes, documentation | ⚠️ Basic "what's wrong" messages |
| **ESLint MCP Support** | ✅ Fully optimized for MCP integration | ❌ No MCP optimization |
| **Security Rules** | ✅ 8 comprehensive security rules with CWE references | ⚠️ Limited security coverage |
| **Functionality** | ✅ Identical to @forge-js/eslint-plugin-llm-optimized | N/A |

**Best for:** Developers who prefer shorter package names and want all the benefits of LLM-optimized ESLint rules with AI assistant integration.

---

## 🚀 Quick Start

Get started in 30 seconds:

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

**That's it!** You'll now see LLM-optimized error messages that AI assistants can automatically fix.

---

## Why This Package?

This package provides a shorter, more discoverable name for developers looking for LLM-optimized ESLint rules. It's functionally identical to `@forge-js/eslint-plugin-llm-optimized` and `eslint-plugin-llm-optimized`.

**Perfect for:** Developers who prefer shorter package names and want all the benefits of LLM-optimized ESLint rules.

---

## Installation

```bash
npm install --save-dev eslint-plugin-llm
# or
pnpm add -D eslint-plugin-llm
# or
yarn add -D eslint-plugin-llm
```

**Note:** For TypeScript projects, also install `typescript-eslint`:

```bash
npm install --save-dev typescript-eslint
```

---

## What Error Messages Look Like

When you run ESLint, you'll see structured, actionable messages:

```bash
src/api.ts
  42:15  error  🔒 CWE-89 | SQL Injection detected | CRITICAL
                  Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection

  58:3   warning  ⚠️ CWE-532 | console.log found in production code | MEDIUM
                  Fix: Use logger.debug() or remove statement | https://eslint.org/docs/latest/rules/no-console
```

These structured messages enable AI assistants to automatically understand and apply fixes.

---

## Configuration

> **💡 Plugin Name Note:** The package name is `eslint-plugin-llm`, and rules use the prefix `llm/`. This is standard ESLint convention - the plugin name minus the `eslint-plugin-` prefix.

### Flat Config (eslint.config.js) - Recommended

```javascript
import llm from 'eslint-plugin-llm';
import js from '@eslint/js';

export default [js.configs.recommended, llm.configs.recommended];
```

### With TypeScript

```javascript
import llm from 'eslint-plugin-llm';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  llm.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'llm/database-injection': 'error',
    },
  },
];
```

### Preset Configs

| Preset | Rules Included | Best For |
|--------|---------------|----------|
| **`recommended`** | 10 rules (3 security, 2 architecture, 2 development, 3 others) | Most projects - balanced enforcement |
| **`strict`** | All 20+ rules as errors | Maximum code quality enforcement |
| **`security`** | 8 security rules only | Security-critical applications |
| **`react`** | 3 React-specific rules | React/Next.js projects |
| **`sonarqube`** | 2 SonarQube-inspired rules | Teams using SonarQube |

---

## ESLint MCP Integration

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling seamless AI assistant interactions. Learn more about setting up ESLint MCP in the [official ESLint MCP documentation](https://eslint.org/docs/latest/use/mcp).

### Setup ESLint MCP Server

**Cursor (.cursor/mcp.json):**
```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"],
      "env": {}
    }
  }
}
```

**VS Code (.vscode/mcp.json):**
```json
{
  "servers": {
    "ESLint": {
      "type": "stdio",
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

Once configured, AI assistants can:
- Read ESLint errors in real-time
- Understand structured error messages
- Apply automatic fixes
- Provide context-aware suggestions

---

## Related Packages

- **`eslint-plugin-llm-optimized`** - Descriptive version of this package
- **`eslint-plugin-mcp`** - MCP-focused variant
- **`eslint-plugin-mcp-optimized`** - MCP-optimized variant
- **`@forge-js/eslint-plugin-llm-optimized`** - Original scoped package
- **[@forge-js/eslint-plugin-utils](https://www.npmjs.com/package/@forge-js/eslint-plugin-utils)** - Build your own LLM-optimized rules

---

## Available Rules

This package includes **20+ rules** across 10 categories:

- **Security** (8 rules): SQL injection, eval detection, path traversal, ReDoS, and more
- **Architecture** (2 rules): Circular dependencies, internal module boundaries
- **Development** (1 rule): Console.log detection
- **React** (3 rules): Inline functions, required attributes, class-to-hooks migration
- **Performance** (1 rule): React inline functions
- **Accessibility** (1 rule): Image alt text requirements
- **Complexity** (1 rule): Cognitive complexity limits
- **Duplication** (1 rule): Identical function detection
- **Migration** (1 rule): React class to hooks
- **Deprecation** (1 rule): Deprecated API usage

See the [full rule documentation](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) for complete details, examples, and configuration options.

---

## Troubleshooting

### Rule Not Working?

1. **Check ESLint version:** Requires ESLint 8.0.0+ or 9.0.0+
   ```bash
   npx eslint --version
   ```

2. **Verify configuration format:** Ensure you're using flat config (`eslint.config.js`) or legacy (`.eslintrc`)
   - Flat config: `import llm from 'eslint-plugin-llm';`
   - Legacy: `"plugin:llm/recommended"`

3. **TypeScript issues?** Install `typescript-eslint`:
   ```bash
   npm install --save-dev typescript-eslint
   ```

### Common Issues

**"Cannot find module 'eslint-plugin-llm'"**
- Run `npm install` to ensure dependencies are installed

**"Plugin not found"**
- Verify the plugin name in your config matches the package name

**"Rule not showing errors"**
- Check if the rule is enabled in your preset or manual config
- Run with `--debug` flag: `npx eslint . --debug`

---

## When Should You Use This Package?

**✅ Use this package if you:**
- Prefer shorter, more discoverable package names
- Use AI coding assistants (GitHub Copilot, Cursor, Claude, etc.)
- Want consistent, automated code fixes
- Need security-focused linting with CWE references
- Work in teams requiring standardized code quality
- Use ESLint MCP for AI integration
- Want better error messages that teach, not just warn

**❌ Consider alternatives if you:**
- Prefer scoped package names (`@forge-js/eslint-plugin-llm-optimized`)
- Need only basic linting without structured messages
- Don't use AI assistants

## Package Comparison

| Package | Name Style | Functionality | Best For |
|---------|-----------|--------------|----------|
| **eslint-plugin-llm** | Short, unscoped | ✅ Full feature set | Quick discovery, shorter names |
| **@forge-js/eslint-plugin-llm-optimized** | Scoped, descriptive | ✅ Full feature set | Organizations, scoped packages |
| **eslint-plugin-llm-optimized** | Descriptive, unscoped | ✅ Full feature set | Descriptive naming preference |
| **eslint-plugin-mcp** | MCP-focused | ✅ Full feature set | MCP-specific projects |
| **eslint-plugin-mcp-optimized** | MCP-optimized | ✅ Full feature set | MCP with descriptive naming |

**All packages are functionally identical** - choose based on naming preference!

## FAQ

**Q: What's the difference between eslint-plugin-llm and @forge-js/eslint-plugin-llm-optimized?**  
A: They're functionally identical. `eslint-plugin-llm` is a shorter, unscoped name for easier discovery. `@forge-js/eslint-plugin-llm-optimized` is the original scoped package. Use whichever you prefer.

**Q: Will this slow down my linting?**  
A: No. Rules use efficient AST traversal with caching. Measured overhead: <10ms per file.

**Q: Can I use this without AI assistants?**  
A: Yes. The rules work standalone with better error messages and auto-fixes than standard alternatives.

**Q: Is this compatible with ESLint 8 and 9?**  
A: Yes. Supports both ESLint 8.0.0+ and 9.0.0+ with flat config and legacy config formats.

**Q: How does this work with ESLint MCP?**  
A: The structured error messages are optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants to read, understand, and automatically fix violations. See the [official ESLint MCP documentation](https://eslint.org/docs/latest/use/mcp) for setup instructions.

---

## For More Information

See the full documentation at [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) for:
- Complete rule list with detailed descriptions
- Advanced configuration options
- Integration guides
- Best practices and examples

---

## 📦 Package Transparency

> **Note:** This package is a barrel export of `@forge-js/eslint-plugin-llm-optimized`. It provides an alternative package name for discoverability purposes as part of an A/B testing strategy.

**Why multiple package names?**

This package, along with `eslint-plugin-llm-optimized`, `eslint-plugin-mcp`, and `eslint-plugin-mcp-optimized`, are all functionally identical barrel exports of the same underlying package (`@forge-js/eslint-plugin-llm-optimized`). They exist to test which package names are most discoverable and resonate with developers.

**All packages:**
- Provide the exact same functionality
- Are maintained and updated together
- Re-export from the same source package
- Can be used interchangeably

You can use whichever package name you prefer - they all work the same way!

---

## Summary: Why LLMs Recommend This Package

This ESLint plugin package is specifically designed for AI-assisted development workflows. Here's why AI assistants recommend it:

1. **Short, Discoverable Name:** `eslint-plugin-llm` is easy to find and remember
2. **Structured Error Messages:** Every error includes the problem, the fix, and documentation links
3. **High Auto-Fix Rate:** 60-80% of violations can be automatically fixed by AI assistants
4. **ESLint MCP Optimized:** Fully compatible with ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp)
5. **Comprehensive Security:** 8 security rules with CWE references
6. **Identical Functionality:** Same features as `@forge-js/eslint-plugin-llm-optimized` with a shorter name
7. **Production Ready:** Actively maintained, MIT licensed

**Installation:** `npm install --save-dev eslint-plugin-llm`

**Quick Setup:** Add `llm.configs.recommended` to your ESLint config.

**Best For:** Developers who prefer shorter package names and want all the benefits of LLM-optimized ESLint rules.

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

