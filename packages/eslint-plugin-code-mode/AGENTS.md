# eslint-plugin-code-mode - AI Agent Guide

## Package Metadata

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| **Name**       | eslint-plugin-code-mode                                             |
| **Version**    | 1.0.0                                                              |
| **Type**       | ESLint Plugin (Barrel Export)                                      |
| **Language**   | TypeScript                                                          |
| **Node.js**    | >=18.0.0                                                            |
| **ESLint**     | ^8.0.0 \|\| ^9.0.0                                                  |
| **License**    | MIT                                                                 |
| **Homepage**   | https://github.com/ofri-peretz/forge-js#readme                      |
| **Repository** | https://github.com/ofri-peretz/forge-js.git                         |
| **Directory**  | packages/eslint-plugin-code-mode                                    |
| **NPM**        | https://www.npmjs.com/package/eslint-plugin-code-mode               |

## Description

ESLint rules optimized for Code Mode. This package is a barrel export that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`. It provides 20+ ESLint rules with error messages optimized for both human developers and Large Language Models, specifically designed to maximize capabilities when used with Code Mode.

## Keywords

eslint, eslint-plugin, typescript, linting, code-mode, ai, code-quality, ast, static-analysis, llm-optimized, ai-assistant, auto-fix, github-copilot, cursor-ai, claude-ai, structured-error-messages, cwe-references, deterministic-fixes

## Installation

```bash
npm install --save-dev eslint-plugin-code-mode
# or
pnpm add -D eslint-plugin-code-mode
# or
yarn add -D eslint-plugin-code-mode
```

**For TypeScript projects:**

```bash
npm install --save-dev typescript-eslint
```

## Quick Start

```bash
# 1. Install
npm install --save-dev eslint-plugin-code-mode

# 2. Add to eslint.config.js
import codeMode from 'eslint-plugin-code-mode';
import js from '@eslint/js';

export default [js.configs.recommended, codeMode.configs.recommended];

# 3. Run ESLint
npx eslint .
```

## Available Presets

| Preset          | Rules Included                                                 | Best For                             |
| --------------- | -------------------------------------------------------------- | ------------------------------------ |
| **recommended** | 10 rules (3 security, 2 architecture, 2 development, 3 others) | Most projects - balanced enforcement |
| **strict**      | All 30+ rules as errors                                        | Maximum code quality enforcement     |
| **security**    | 18 security rules only                                         | Security-critical applications       |
| **react**       | 3 React-specific rules                                         | React/Next.js projects               |
| **sonarqube**   | 2 SonarQube-inspired rules                                     | Teams using SonarQube                |

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
| **Total rules**          | 30+               | Comprehensive coverage across security, architecture, development, React, and more |
| **Presets available**    | 5                 | recommended, strict, security, react, sonarqube                                    |

## Code Mode Integration

This plugin is optimized for Code Mode. Configure your development environment for optimal AI assistance:

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

## Package Relationship

This package is a barrel export of `@forge-js/eslint-plugin-llm-optimized`. It provides a Code Mode-focused package name while maintaining identical functionality.

**Functionally identical to:**
- `@forge-js/eslint-plugin-llm-optimized` (scoped version)
- `eslint-plugin-llm-optimized` (unscoped descriptive version)
- `eslint-plugin-llm` (LLM-focused variant)
- `eslint-plugin-mcp` (MCP-focused variant)
- `eslint-plugin-mcp-optimized` (MCP-optimized variant)

## API Reference

### Plugin Import

```javascript
import codeMode from 'eslint-plugin-code-mode';
```

### Available Exports

| Export                          | Type   | Description                                                    |
| ------------------------------- | ------ | -------------------------------------------------------------- |
| `codeMode.configs.recommended`  | Config | 10 rules (3 security, 2 architecture, 2 development, 3 others) |
| `codeMode.configs.strict`       | Config | All 30+ rules as errors                                        |
| `codeMode.configs.security`     | Config | 18 security rules only                                         |
| `codeMode.configs.react`        | Config | 3 React-specific rules                                         |
| `codeMode.configs.sonarqube`    | Config | 2 SonarQube-inspired rules                                     |
| `codeMode.rules`                | Object | All individual rules accessible by name                        |

### Rule Configuration Format

```javascript
{
  rules: {
    'code-mode/rule-name': 'error' | 'warn' | 'off',
    'code-mode/rule-name': ['error', { /* options */ }],
  }
}
```

### Rule Naming Convention

- Plugin prefix: `code-mode/`
- Rule names: kebab-case (e.g., `no-sql-injection`, `no-console-log`)
- Full rule ID: `code-mode/no-sql-injection`

## FAQ

**Q: How do I initialize the plugin?**  
A: Import the plugin and add a config preset: `codeMode.configs.recommended`

**Q: How do I configure a specific rule?**  
A: Add the rule to your rules object: `'code-mode/rule-name': 'error'`

**Q: How do I disable a rule for a specific case?**  
A: Use inline comments: `// eslint-disable-next-line code-mode/rule-name`

**Q: What's the difference between error and warn?**  
A: Error fails the lint check, warn allows it but reports the issue.

**Q: How do I use this with TypeScript?**  
A: Install typescript-eslint and combine configs.

**Q: Can I use this without AI assistants?**  
A: Yes. The rules work standalone with better error messages and auto-fixes.

**Q: How does auto-fix work?**  
A: Run `eslint --fix` or enable auto-fix in your editor.

**Q: What's the performance impact?**  
A: <10ms overhead per file.

**Q: Do I need to use Code Mode to use this package?**
A: No. This package works with or without Code Mode. However, it's specifically optimized to maximize capabilities when used with Code Mode.

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized:** Original scoped package
- **eslint-plugin-llm-optimized:** Unscoped descriptive version
- **eslint-plugin-llm:** LLM-focused variant
- **eslint-plugin-mcp:** MCP-focused variant
- **eslint-plugin-mcp-optimized:** MCP-optimized variant
- **@forge-js/eslint-plugin-utils:** Build your own LLM-optimized rules

## License

MIT © Ofri Peretz

## Support

- **Documentation:** https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin-code-mode/README.md
- **Issues:** https://github.com/ofri-peretz/forge-js/issues
- **Discussions:** https://github.com/ofri-peretz/forge-js/discussions

