# @forge-js/eslint-plugin-llm-optimized - AI Agent Guide

## Package Metadata

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| **Name**       | @forge-js/eslint-plugin-llm-optimized                               |
| **Version**    | 1.9.1                                                               |
| **Type**       | ESLint Plugin                                                       |
| **Language**   | TypeScript                                                          |
| **Node.js**    | >=18.0.0                                                            |
| **ESLint**     | ^8.0.0 \|\| ^9.0.0                                                  |
| **License**    | MIT                                                                 |
| **Homepage**   | https://github.com/ofri-peretz/forge-js#readme                      |
| **Repository** | https://github.com/ofri-peretz/forge-js.git                         |
| **Directory**  | packages/eslint-plugin                                              |
| **NPM**        | https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized |

## Description

A solid TypeScript-based ESLint plugin infrastructure inspired by typescript-eslint. Provides 62+ ESLint rules with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand the violation and apply consistent fixes.

## Keywords

eslint, eslint-plugin, typescript, linting, llm-optimized, code-quality, ast, static-analysis, ai-assistant, auto-fix, github-copilot, cursor-ai, claude-ai, structured-error-messages, cwe-references, deterministic-fixes, mcp, model-context-protocol

## Installation

```bash
npm install --save-dev @forge-js/eslint-plugin-llm-optimized
# or
pnpm add -D @forge-js/eslint-plugin-llm-optimized
# or
yarn add -D @forge-js/eslint-plugin-llm-optimized
```

**Peer Dependencies:**

- typescript >=4.0.0
- @typescript-eslint/utils ^8.0.0

**For TypeScript projects:**

```bash
npm install --save-dev typescript-eslint
```

## Quick Start

### Basic Configuration

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import js from '@eslint/js';

export default [js.configs.recommended, llmOptimized.configs.recommended];
```

### With TypeScript

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  llmOptimized.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@forge-js/llm-optimized/database-injection': 'error',
    },
  },
];
```

## Available Presets

| Preset            | Rules Included                                                 | Best For                              |
| ----------------- | -------------------------------------------------------------- | ------------------------------------- |
| **recommended**   | 10 rules (3 security, 2 architecture, 2 development, 3 others) | Most projects - balanced enforcement  |
| **strict**        | All 62+ rules as errors                                        | Maximum code quality enforcement      |
| **security**      | 27 security rules only                                         | Security-critical applications        |
| **react**         | 3 React-specific rules                                         | React/Next.js projects                |
| **react-modern**  | Hooks-focused rules, class component rules disabled            | Modern React (functional + hooks)     |
| **sonarqube**     | 2 SonarQube-inspired rules                                     | Teams using SonarQube                 |

## Rule Categories

### Security Rules (27 rules)

| Rule Name                      | Description                                               | CWE     | Auto-fixable |
| ------------------------------ | --------------------------------------------------------- | ------- | ------------ |
| no-sql-injection               | Prevent SQL injection with string concatenation detection | CWE-89  | No           |
| no-unsafe-dynamic-require      | Forbid dynamic require() calls with non-literal arguments | CWE-95  | No           |
| database-injection             | Comprehensive injection detection (SQL, NoSQL, ORM)       | CWE-89  | No           |
| detect-eval-with-expression    | Detect eval() with dynamic expressions (RCE prevention)   | CWE-95  | No           |
| detect-child-process           | Detect command injection in child_process calls           | CWE-78  | No           |
| detect-non-literal-fs-filename | Detect path traversal in fs operations                    | CWE-22  | No           |
| detect-non-literal-regexp      | Detect ReDoS vulnerabilities in RegExp construction       | CWE-400 | No           |
| detect-object-injection        | Detect prototype pollution in object property access      | CWE-915 | No           |
| no-hardcoded-credentials       | Detect hardcoded passwords, API keys, and tokens          | CWE-798 | Yes          |
| no-weak-crypto                 | Detect weak cryptography algorithms (MD5, SHA1, DES)      | CWE-327 | Yes          |
| no-insufficient-random         | Detect weak random number generation (Math.random())      | CWE-330 | No           |
| no-unvalidated-user-input      | Detect unvalidated user input usage (req.body, req.query) | CWE-20  | No           |
| no-unsanitized-html            | Detect unsanitized HTML injection (XSS prevention)        | CWE-79  | No           |
| no-unescaped-url-parameter     | Detect unescaped URL parameters (XSS prevention)          | CWE-79  | No           |
| no-missing-cors-check          | Detect missing CORS origin validation                     | CWE-942 | No           |
| no-insecure-comparison         | Detect insecure comparison operators (==, !=)             | CWE-697 | Yes          |
| no-missing-authentication      | Detect missing authentication checks in route handlers    | CWE-306 | No           |
| no-privilege-escalation        | Detect potential privilege escalation vulnerabilities     | CWE-269 | No           |

### Architecture Rules (5 rules)

| Rule Name                | Description                                           | CWE     | Auto-fixable |
| ------------------------ | ----------------------------------------------------- | ------- | ------------ |
| no-circular-dependencies | Detect circular dependencies with full chain analysis | CWE-407 | No           |
| no-internal-modules      | Forbid importing internal/deep module paths           | N/A     | No           |

### Development Rules (2 rules)

| Rule Name                          | Description                                                     | CWE     | Auto-fixable |
| ---------------------------------- | --------------------------------------------------------------- | ------- | ------------ |
| no-console-log                     | Disallow console.log with configurable strategies               | CWE-532 | Yes          |
| prefer-dependency-version-strategy | Enforce consistent version strategy (caret, tilde, exact, etc.) | N/A     | Yes          |

### React Rules (3 rules)

| Rule Name                 | Description                                       | CWE      | Auto-fixable |
| ------------------------- | ------------------------------------------------- | -------- | ------------ |
| react-no-inline-functions | Prevent inline functions in React renders         | CWE-1104 | Yes          |
| required-attributes       | Enforce required attributes on React components   | N/A      | No           |
| react-class-to-hooks      | Suggest migrating React class components to hooks | N/A      | No           |

### Other Rules (29 rules)

| Rule Name            | Description                                           | CWE      | Auto-fixable |
| -------------------- | ----------------------------------------------------- | -------- | ------------ |
| img-requires-alt     | Enforce alt text on images for WCAG compliance        | CWE-252  | No           |
| cognitive-complexity | Limit cognitive complexity with detailed metrics      | CWE-1104 | No           |
| identical-functions  | Detect duplicate function implementations             | CWE-1104 | No           |
| no-deprecated-api    | Prevent usage of deprecated APIs with migration paths | CWE-1078 | Yes          |
| enforce-naming       | Enforce domain-specific naming conventions            | N/A      | Yes          |

## Error Message Format

All error messages follow a structured 2-line format optimized for AI assistants:

```
Line 1: Icon, CWE reference (if applicable), description, severity
Line 2: Specific fix instruction with documentation link
```

**Example:**

```
42:15  error  🔒 CWE-89 | SQL Injection detected | CRITICAL
              Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection
```

## Key Features

| Feature                  | Value             | Description                                                                        |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------------- |
| **Auto-fix rate**        | 60-80%            | Most violations can be automatically fixed by AI assistants                        |
| **Error message format** | Structured 2-line | Every error includes problem, fix, and documentation links                         |
| **CWE references**       | Included          | Security rules include Common Weakness Enumeration references                      |
| **Deterministic fixes**  | Yes               | Same violation = same fix every time                                               |
| **ESLint MCP support**   | Full              | Fully compatible with ESLint's Model Context Protocol                              |
| **TypeScript support**   | Full              | Full TypeScript support with comprehensive type checking                           |
| **Performance overhead** | <10ms per file    | Efficient AST traversal with caching                                               |
| **Total rules**          | 62+               | Comprehensive coverage across security, architecture, development, React, and more |
| **Presets available**    | 5                 | recommended, strict, security, react, sonarqube                                    |

## ESLint MCP Integration

This plugin is optimized for ESLint's Model Context Protocol (MCP). Configure MCP in your editor:

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

## API Reference

### Plugin Import

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
```

### Available Exports

| Export                                  | Type   | Description                                                    |
| --------------------------------------- | ------ | -------------------------------------------------------------- |
| `llmOptimized.configs.recommended`      | Config | 10 rules (3 security, 2 architecture, 2 development, 3 others) |
| `llmOptimized.configs.strict`           | Config | All 62+ rules as errors                                        |
| `llmOptimized.configs.security`         | Config | 27 security rules only                                         |
| `llmOptimized.configs.react`            | Config | 3 React-specific rules                                         |
| `llmOptimized.configs['react-modern']`  | Config | Hooks-focused rules, class component rules disabled            |
| `llmOptimized.configs.sonarqube`        | Config | 2 SonarQube-inspired rules                                     |
| `llmOptimized.rules`                    | Object | All individual rules accessible by name                        |

### Rule Configuration Format

```javascript
{
  rules: {
    '@forge-js/llm-optimized/rule-name': 'error' | 'warn' | 'off',
    '@forge-js/llm-optimized/rule-name': ['error', { /* options */ }],
  }
}
```

### Rule Naming Convention

- Plugin prefix: `@forge-js/llm-optimized/`
- Rule names: kebab-case (e.g., `no-sql-injection`, `no-console-log`)
- Full rule ID: `@forge-js/llm-optimized/no-sql-injection`

## FAQ

**Q: How do I initialize the plugin?**  
A: Import the plugin and add a config preset to your ESLint config: `llmOptimized.configs.recommended`

**Q: How do I configure a specific rule?**  
A: Add the rule to your rules object: `'@forge-js/llm-optimized/rule-name': 'error'`

**Q: How do I disable a rule for a specific case?**  
A: Use inline comments: `// eslint-disable-next-line @forge-js/llm-optimized/rule-name`

**Q: What's the difference between error and warn?**  
A: Error fails the lint check, warn allows it but reports the issue. Recommended config uses warn for non-critical rules.

**Q: How do I use this with TypeScript?**  
A: Install typescript-eslint and combine configs: `[...tseslint.configs.recommended, llmOptimized.configs.recommended]`

**Q: Can I use this without AI assistants?**  
A: Yes. The rules work standalone with better error messages and auto-fixes than standard alternatives.

**Q: How does auto-fix work?**  
A: Run `eslint --fix` or enable auto-fix in your editor. Rules marked with 🔧 support automatic fixes.

**Q: What's the performance impact?**  
A: <10ms overhead per file. Rules use efficient AST traversal with caching.

**Q: How do I report a bug?**  
A: Open an issue at https://github.com/ofri-peretz/forge-js/issues

**Q: How do I contribute?**  
A: See CONTRIBUTING.md at https://github.com/ofri-peretz/forge-js/blob/main/CONTRIBUTING.md

## Related Packages

- **@interlace/eslint-devkit:** Build your own LLM-optimized rules
- **eslint-plugin-llm:** Unscoped version with shorter name
- **eslint-plugin-llm-optimized:** Unscoped descriptive version
- **eslint-plugin-mcp:** MCP-focused variant
- **eslint-plugin-mcp-optimized:** MCP-optimized variant

## License

MIT © Ofri Peretz

## Support

- **Documentation:** https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/README.md
- **Issues:** https://github.com/ofri-peretz/forge-js/issues
- **Discussions:** https://github.com/ofri-peretz/forge-js/discussions
