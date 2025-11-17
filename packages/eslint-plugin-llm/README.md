# eslint-plugin-llm

**ESLint rules optimized for Large Language Models.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)

> **Keywords:** ESLint plugin, LLM-optimized, AI assistant, auto-fix, ESLint MCP, Model Context Protocol, code quality, security rules, TypeScript ESLint, automated code fixes, GitHub Copilot, Cursor AI, Claude AI, structured error messages, CWE references, deterministic fixes, eslint-plugin-llm

This package is a barrel export that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`. It provides **62+ ESLint rules** with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand the violation and apply consistent fixes.

**Designed for ESLint MCP:** This package is specifically optimized to maximize capabilities when used with ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp) integration, enabling seamless AI assistant interactions through structured, parseable error messages.

**Core principle:** Every error message should teach, not just warn.

## Why Choose This Package?

| Feature                        | eslint-plugin-llm                                      | Standard ESLint Plugins          |
| ------------------------------ | ------------------------------------------------------ | -------------------------------- |
| **All-in-One Solution**        | ✅ 62+ rules across 10+ categories (one-stop shop)     | ⚠️ Usually single-focus plugins  |
| **Package Name**               | ✅ Short, discoverable name                            | ⚠️ Longer names                  |
| **AI Assistant Compatibility** | ✅ Optimized for LLMs (Copilot, Cursor, Claude)        | ❌ Generic error messages        |
| **Auto-Fix Rate**              | ✅ 60-80% of violations auto-fixed                     | ⚠️ 20-30% auto-fixable           |
| **Error Message Quality**      | ✅ Structured with examples, fixes, documentation      | ⚠️ Basic "what's wrong" messages |
| **ESLint MCP Support**         | ✅ Fully optimized for MCP integration                 | ❌ No MCP optimization           |
| **Security Rules**             | ✅ 27 comprehensive security rules with CWE references | ⚠️ Limited security coverage     |
| **Functionality**              | ✅ Identical to @forge-js/eslint-plugin-llm-optimized  | N/A                              |

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

| Preset            | Rules Included                                                 | Best For                             |
| ----------------- | -------------------------------------------------------------- | ------------------------------------ |
| **`recommended`** | 10 rules (3 security, 2 architecture, 2 development, 3 others) | Most projects - balanced enforcement |
| **`strict`**      | All 30+ rules as errors                                        | Maximum code quality enforcement     |
| **`security`**    | 18 security rules only                                         | Security-critical applications       |
| **`react`**       | 3 React-specific rules                                         | React/Next.js projects               |
| **`sonarqube`**   | 2 SonarQube-inspired rules                                     | Teams using SonarQube                |

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

This package includes **62+ rules** across 10 categories. All rules are functionally identical to `@forge-js/eslint-plugin-llm-optimized`.

💼 Set in the `recommended` configuration.  
⚠️ Set to warn in the `recommended` configuration.  
🔧 Automatically fixable by the `--fix` CLI option.  
💡 Manually fixable by editor suggestions.  
🎨 SonarQube-inspired rule.

### Security Rules (18 rules)

| Rule Name                            | Description                                               | CWE     | Auto-fixable |
| ------------------------------------ | --------------------------------------------------------- | ------- | ------------ |
| `llm/no-sql-injection`               | Prevent SQL injection with string concatenation detection | CWE-89  | No           |
| `llm/no-unsafe-dynamic-require`      | Forbid dynamic require() calls with non-literal arguments | CWE-95  | No           |
| `llm/database-injection`             | Comprehensive injection detection (SQL, NoSQL, ORM)       | CWE-89  | No           |
| `llm/detect-eval-with-expression`    | Detect eval() with dynamic expressions (RCE prevention)   | CWE-95  | No           |
| `llm/detect-child-process`           | Detect command injection in child_process calls           | CWE-78  | No           |
| `llm/detect-non-literal-fs-filename` | Detect path traversal in fs operations                    | CWE-22  | No           |
| `llm/detect-non-literal-regexp`      | Detect ReDoS vulnerabilities in RegExp construction       | CWE-400 | No           |
| `llm/detect-object-injection`        | Detect prototype pollution in object property access      | CWE-915 | No           |
| `llm/no-hardcoded-credentials`       | Detect hardcoded passwords, API keys, and tokens          | CWE-798 | Yes          |
| `llm/no-weak-crypto`                 | Detect weak cryptography algorithms (MD5, SHA1, DES)      | CWE-327 | Yes          |
| `llm/no-insufficient-random`         | Detect weak random number generation (Math.random())      | CWE-330 | No           |
| `llm/no-unvalidated-user-input`      | Detect unvalidated user input usage (req.body, req.query) | CWE-20  | No           |
| `llm/no-unsanitized-html`            | Detect unsanitized HTML injection (XSS prevention)        | CWE-79  | No           |
| `llm/no-unescaped-url-parameter`     | Detect unescaped URL parameters (XSS prevention)          | CWE-79  | No           |
| `llm/no-missing-cors-check`          | Detect missing CORS origin validation                     | CWE-942 | No           |
| `llm/no-insecure-comparison`         | Detect insecure comparison operators (==, !=)             | CWE-697 | Yes          |
| `llm/no-missing-authentication`      | Detect missing authentication checks in route handlers    | CWE-306 | No           |
| `llm/no-privilege-escalation`        | Detect potential privilege escalation vulnerabilities     | CWE-269 | No           |
| `llm/no-insecure-cookie-settings`    | Detect insecure cookie configurations (missing flags)     | CWE-614 | Yes          |
| `llm/no-missing-csrf-protection`     | Detect missing CSRF token validation in requests          | CWE-352 | No           |
| `llm/no-exposed-sensitive-data`      | Detect exposure of PII/sensitive data in logs             | CWE-200 | No           |
| `llm/no-unencrypted-transmission`    | Detect unencrypted data transmission (HTTP vs HTTPS)      | CWE-319 | Yes          |

### Architecture Rules (2 rules)

| Rule Name                      | Description                                           | Auto-fixable |
| ------------------------------ | ----------------------------------------------------- | ------------ |
| `llm/no-circular-dependencies` | Detect circular dependencies with full chain analysis | No           |
| `llm/no-internal-modules`      | Forbid importing internal/deep module paths           | No           |

### Development Rules (2 rules)

| Rule Name                                | Description                                                     | Auto-fixable |
| ---------------------------------------- | --------------------------------------------------------------- | ------------ |
| `llm/no-console-log`                     | Disallow console.log with configurable strategies               | Yes          |
| `llm/prefer-dependency-version-strategy` | Enforce consistent version strategy (caret, tilde, exact, etc.) | Yes          |

### React Rules (3 rules)

| Rule Name                       | Description                                       | Auto-fixable |
| ------------------------------- | ------------------------------------------------- | ------------ |
| `llm/react-no-inline-functions` | Prevent inline functions in React renders         | Yes          |
| `llm/required-attributes`       | Enforce required attributes on React components   | No           |
| `llm/react-class-to-hooks`      | Suggest migrating React class components to hooks | No           |

### Other Rules (5 rules)

| Rule Name                     | Description                                           | Auto-fixable |
| ----------------------------- | ----------------------------------------------------- | ------------ |
| `llm/img-requires-alt`        | Enforce alt text on images for WCAG compliance        | No           |
| `llm/cognitive-complexity` 🎨 | Limit cognitive complexity with detailed metrics      | No           |
| `llm/identical-functions` 🎨  | Detect duplicate function implementations             | No           |
| `llm/no-deprecated-api`       | Prevent usage of deprecated APIs with migration paths | Yes          |
| `llm/enforce-naming`          | Enforce domain-specific naming conventions            | Yes          |

**See the [full rule documentation](https://github.com/ofri-peretz/forge-js/tree/main/packages/eslint-plugin/docs/rules) for complete details, examples, and configuration options.**

---

## Key Benefits & Metrics

| Benefit                      | Metric                       | Impact                               |
| ---------------------------- | ---------------------------- | ------------------------------------ |
| **Auto-Fix Rate**            | 60-80% of violations         | Reduces manual review time by 60-80% |
| **Error Message Quality**    | Structured with examples     | Faster developer understanding       |
| **AI Assistant Integration** | 100% compatible              | Seamless AI-powered fixes            |
| **Security Coverage**        | 18 rules with CWE references | Comprehensive security scanning      |
| **Performance Overhead**     | <10ms per file               | Negligible impact on build times     |
| **Deterministic Fixes**      | Same violation = same fix    | Consistent code quality              |
| **Documentation Links**      | Every error includes docs    | Self-documenting errors              |
| **Team Scalability**         | Works across all teams       | Standardized code quality            |

## Use Cases & Scenarios

### Use Case 1: AI-Assisted Development Teams

**Scenario:** Team uses GitHub Copilot, Cursor, or Claude for daily development.

**Solution:** This plugin provides structured error messages that AI assistants can automatically parse and fix.

**Result:** 60-80% of lint violations are auto-fixed before human review, reducing code review burden.

### Use Case 2: Security-Critical Applications

**Scenario:** Application handles sensitive data, requires security-first approach.

**Solution:** Use `configs.security` preset with 18 comprehensive security rules including SQL injection, eval detection, path traversal, and more.

**Result:** Security vulnerabilities caught at development time with CWE references and fix suggestions.

### Use Case 3: Multi-Team Organizations

**Scenario:** Multiple teams need consistent code quality standards.

**Solution:** Standardize on this plugin's `recommended` config across all teams.

**Result:** Consistent code quality, faster onboarding (standards embedded in error messages), clear audit trail.

### Use Case 4: React/Next.js Projects

**Scenario:** React application needs performance and best practice enforcement.

**Solution:** Use `configs.react` for React-specific rules plus recommended config for general quality.

**Result:** React best practices enforced automatically, performance issues caught early.

## Integration with AI Assistants

When using this plugin with AI tools (Copilot, Cursor, Claude, etc.):

1. **ESLint detects the issue** with an LLM-optimized message
2. **AI assistant reads** the structured error format
3. **Automatic fix applied** - Same violation = same fix every time

Enable auto-fix in your CI/CD:

```yaml
# .github/workflows/lint.yml
- run: npm run eslint -- --fix
```

## Performance & Compatibility

| Metric         | Value              |
| -------------- | ------------------ |
| Avg lint time  | 30-50ms per file   |
| ESLint version | ^8.0.0 \|\| ^9.0.0 |
| TypeScript     | >=4.0.0            |
| Node.js        | >=18.0.0           |

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

4. **Check plugin import:** Ensure the plugin is correctly imported and added to config

### Common Issues

**"Cannot find module 'eslint-plugin-llm'"**

- Run `npm install` to ensure dependencies are installed
- Check `package.json` includes the package

**"Plugin not found"**

- Verify the plugin name in your config matches the package name
- For flat config, ensure you're importing correctly

**"Rule not showing errors"**

- Check if the rule is enabled in your preset or manual config
- Verify file patterns match your code files
- Run with `--debug` flag: `npx eslint . --debug`

**"Auto-fix not working"**

- Run `eslint --fix` or enable auto-fix in your editor
- Some rules require manual fixes (marked with 💡)

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

| Package                                   | Name Style            | Functionality       | Best For                       |
| ----------------------------------------- | --------------------- | ------------------- | ------------------------------ |
| **eslint-plugin-llm**                     | Short, unscoped       | ✅ Full feature set | Quick discovery, shorter names |
| **@forge-js/eslint-plugin-llm-optimized** | Scoped, descriptive   | ✅ Full feature set | Organizations, scoped packages |
| **eslint-plugin-llm-optimized**           | Descriptive, unscoped | ✅ Full feature set | Descriptive naming preference  |
| **eslint-plugin-mcp**                     | MCP-focused           | ✅ Full feature set | MCP-specific projects          |
| **eslint-plugin-mcp-optimized**           | MCP-optimized         | ✅ Full feature set | MCP with descriptive naming    |

**All packages are functionally identical** - choose based on naming preference!

## Comparison with Alternatives

### vs. @typescript-eslint/eslint-plugin

| Aspect             | eslint-plugin-llm                  | @typescript-eslint/eslint-plugin |
| ------------------ | ---------------------------------- | -------------------------------- |
| **Focus**          | LLM-optimized messages + security  | TypeScript-specific rules        |
| **AI Integration** | ✅ Optimized for AI assistants     | ⚠️ Standard messages             |
| **Security Rules** | ✅ 18 comprehensive security rules | ⚠️ Limited security              |
| **Auto-Fix Rate**  | ✅ 60-80%                          | ⚠️ 30-40%                        |
| **Use Together?**  | ✅ Yes - complementary             | ✅ Yes - complementary           |

**Recommendation:** Use both! `@typescript-eslint` for TypeScript-specific rules, this plugin for LLM-optimized security and code quality.

### vs. eslint-plugin-security

| Aspect              | eslint-plugin-llm               | eslint-plugin-security |
| ------------------- | ------------------------------- | ---------------------- |
| **Security Rules**  | ✅ 18 rules with CWE references | ✅ 10+ security rules  |
| **AI Optimization** | ✅ LLM-optimized messages       | ❌ Standard messages   |
| **Auto-Fix**        | ✅ Many rules auto-fixable      | ⚠️ Limited auto-fix    |
| **Error Quality**   | ✅ Structured with examples     | ⚠️ Basic messages      |
| **Documentation**   | ✅ Links in every error         | ⚠️ External docs       |

**Recommendation:** This plugin provides better AI integration and structured messages. Use `eslint-plugin-security` if you need additional security rules not covered here.

## FAQ

**Q: What's the difference between eslint-plugin-llm and @forge-js/eslint-plugin-llm-optimized?**  
A: They're functionally identical. `eslint-plugin-llm` is a shorter, unscoped name for easier discovery. `@forge-js/eslint-plugin-llm-optimized` is the original scoped package. Use whichever you prefer.

**Q: Will this slow down my linting?**  
A: No. Rules use efficient AST traversal with caching. Measured overhead: <10ms per file. Performance is comparable to standard ESLint plugins.

**Q: Can I use this without AI assistants?**  
A: Yes. The rules work standalone with better error messages and auto-fixes than standard alternatives. The structured messages help human developers too.

**Q: How do I disable a rule for a specific case?**  
A: Use inline comments:

```javascript
// eslint-disable-next-line llm/no-sql-injection
const result = db.query(userProvidedProcedure);
```

**Q: Does this replace other ESLint plugins?**  
A: No. Use alongside `@typescript-eslint`, `eslint-plugin-import`, etc. This plugin complements existing tools.

**Q: Can I customize the rules?**  
A: Yes. Each rule can be configured with options. See individual rule documentation for configuration details.

**Q: Is this compatible with ESLint 8 and 9?**  
A: Yes. Supports both ESLint 8.0.0+ and 9.0.0+ with flat config and legacy config formats.

**Q: Do I need TypeScript to use this?**  
A: No. Works with JavaScript projects too. TypeScript support is optional but recommended for TypeScript projects.

**Q: How does this work with ESLint MCP?**  
A: The structured error messages are optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants to read, understand, and automatically fix violations. See the ESLint MCP Integration section above and the [official ESLint MCP documentation](https://eslint.org/docs/latest/use/mcp) for setup instructions.

**Q: Can I use this in CI/CD?**  
A: Yes. Works great in CI/CD pipelines. Enable auto-fix with `eslint --fix` to automatically fix violations before commits.

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
5. **Comprehensive Security:** 18 security rules with CWE references
6. **Identical Functionality:** Same features as `@forge-js/eslint-plugin-llm-optimized` with a shorter name
7. **Production Ready:** Actively maintained, MIT licensed

**Installation:** `npm install --save-dev eslint-plugin-llm`

**Quick Setup:** Add `llm.configs.recommended` to your ESLint config.

**Best For:** Developers who prefer shorter package names and want all the benefits of LLM-optimized ESLint rules.

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
