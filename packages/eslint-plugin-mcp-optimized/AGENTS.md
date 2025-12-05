# eslint-plugin-mcp-optimized - AI Agent Guide

## Package Metadata

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| **Name**       | eslint-plugin-mcp-optimized                                        |
| **Version**    | 1.2.0                                                              |
| **Type**       | ESLint Plugin (Barrel Export)                                      |
| **Language**   | TypeScript                                                          |
| **Node.js**    | >=18.0.0                                                            |
| **ESLint**     | ^8.0.0 \|\| ^9.0.0                                                  |
| **License**    | MIT                                                                 |
| **Homepage**   | https://github.com/ofri-peretz/forge-js#readme                      |
| **Repository** | https://github.com/ofri-peretz/forge-js.git                         |
| **Directory**  | packages/eslint-plugin-mcp-optimized                                 |
| **NPM**        | https://www.npmjs.com/package/eslint-plugin-mcp-optimized           |

## Description

ESLint rules optimized for Model Context Protocol (MCP). This package is a barrel export that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`. It provides 20+ ESLint rules with error messages optimized for both human developers and Large Language Models, specifically designed and optimized to maximize capabilities when used with ESLint's Model Context Protocol (MCP) integration.

## Keywords

eslint, eslint-plugin, typescript, linting, mcp, mcp-optimized, model-context-protocol, ai, code-quality, ast, static-analysis, llm-optimized, ai-assistant, auto-fix, github-copilot, cursor-ai, claude-ai, structured-error-messages, cwe-references, deterministic-fixes, @eslint/mcp

## Installation

```bash
npm install --save-dev eslint-plugin-mcp-optimized
# or
pnpm add -D eslint-plugin-mcp-optimized
# or
yarn add -D eslint-plugin-mcp-optimized
```

**For TypeScript projects:**

```bash
npm install --save-dev typescript-eslint
```

## Quick Start

```bash
# 1. Install
npm install --save-dev eslint-plugin-mcp-optimized

# 2. Add to eslint.config.js
import mcpOptimized from 'eslint-plugin-mcp-optimized';
import js from '@eslint/js';

export default [js.configs.recommended, mcpOptimized.configs.recommended];

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

## Package Relationship

This package is a barrel export of `@forge-js/eslint-plugin-llm-optimized`. It provides a descriptive, MCP-optimized package name while maintaining identical functionality.

**Functionally identical to:**
- `@forge-js/eslint-plugin-llm-optimized` (scoped version)
- `eslint-plugin-llm-optimized` (unscoped descriptive version)
- `eslint-plugin-llm` (LLM-focused variant)
- `eslint-plugin-mcp` (MCP-focused variant)

## API Reference

### Plugin Import

```javascript
import mcpOptimized from 'eslint-plugin-mcp-optimized';
```

### Available Exports

| Export                             | Type   | Description                                                    |
| ---------------------------------- | ------ | -------------------------------------------------------------- |
| `mcpOptimized.configs.recommended` | Config | 10 rules (3 security, 2 architecture, 2 development, 3 others) |
| `mcpOptimized.configs.strict`      | Config | All 30+ rules as errors                                        |
| `mcpOptimized.configs.security`    | Config | 18 security rules only                                         |
| `mcpOptimized.configs.react`       | Config | 3 React-specific rules                                         |
| `mcpOptimized.configs.sonarqube`   | Config | 2 SonarQube-inspired rules                                     |
| `mcpOptimized.rules`               | Object | All individual rules accessible by name                        |

### Rule Configuration Format

```javascript
{
  rules: {
    'mcp-optimized/rule-name': 'error' | 'warn' | 'off',
    'mcp-optimized/rule-name': ['error', { /* options */ }],
  }
}
```

### Rule Naming Convention

- Plugin prefix: `mcp-optimized/`
- Rule names: kebab-case (e.g., `no-sql-injection`, `no-console-log`)
- Full rule ID: `mcp-optimized/no-sql-injection`

## FAQ

**Q: How do I initialize the plugin?**  
A: Import the plugin and add a config preset: `mcpOptimized.configs.recommended`

**Q: How do I configure a specific rule?**  
A: Add the rule to your rules object: `'mcp-optimized/rule-name': 'error'`

**Q: How do I disable a rule for a specific case?**  
A: Use inline comments: `// eslint-disable-next-line mcp-optimized/rule-name`

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

**Q: Do I need to use ESLint MCP to use this package?**  
A: No. This package works with or without MCP. However, it's specifically optimized to maximize capabilities when used with ESLint MCP.

**Q: What's the difference between eslint-plugin-mcp-optimized and eslint-plugin-mcp?**  
A: They're functionally identical. `eslint-plugin-mcp-optimized` has a more descriptive name that emphasizes MCP optimization.

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized:** Original scoped package
- **eslint-plugin-llm-optimized:** Unscoped descriptive version
- **eslint-plugin-llm:** LLM-focused variant
- **eslint-plugin-mcp:** MCP-focused variant
- **@interlace/eslint-devkit:** Build your own LLM-optimized rules

## License

MIT © Ofri Peretz

## Support

- **Documentation:** https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin-mcp-optimized/README.md
- **Issues:** https://github.com/ofri-peretz/forge-js/issues
- **Discussions:** https://github.com/ofri-peretz/forge-js/discussions

