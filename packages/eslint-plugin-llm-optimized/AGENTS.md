# eslint-plugin-llm-optimized - AI Agent Guide

## Package Overview

**Name:** eslint-plugin-llm-optimized  
**Version:** 2.5.0  
**Description:** ESLint rules that AI assistants can actually fix - error messages optimized for both human developers and Large Language Models. Provides 62+ ESLint rules with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand the violation and apply consistent fixes.

**Keywords:** eslint, eslint-plugin, typescript, linting, llm-optimized, code-quality, ast, static-analysis, ai-assistant, auto-fix, github-copilot, cursor-ai, claude-ai, structured-error-messages, cwe-references, deterministic-fixes, mcp, model-context-protocol

**Homepage:** https://github.com/ofri-peretz/forge-js#readme  
**Repository:** https://github.com/ofri-peretz/forge-js.git  
**Directory:** packages/eslint-plugin-llm-optimized

## Installation

```bash
npm install --save-dev eslint-plugin-llm-optimized
# or
pnpm add -D eslint-plugin-llm-optimized
# or
yarn add -D eslint-plugin-llm-optimized
```

**For TypeScript projects:**
```bash
npm install --save-dev typescript-eslint
```

## Quick Start

```bash
# 1. Install
npm install --save-dev eslint-plugin-llm-optimized

# 2. Add to eslint.config.js
import llmOptimized from 'eslint-plugin-llm-optimized';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  llmOptimized.configs.recommended,
];

# 3. Run ESLint
npx eslint .
```

## Available Presets

| Preset | Rules Included | Best For |
|--------|---------------|----------|
| **recommended** | 10 rules (3 security, 2 architecture, 2 development, 3 others) | Most projects - balanced enforcement |
| **strict** | All 62+ rules as errors | Maximum code quality enforcement |
| **security** | 27 security rules only | Security-critical applications |
| **react** | 3 React-specific rules | React/Next.js projects |
| **sonarqube** | 2 SonarQube-inspired rules | Teams using SonarQube |

## Key Features

- **60-80% auto-fix rate:** Most violations can be automatically fixed by AI assistants
- **Structured error messages:** Every error includes problem, fix, and documentation links
- **CWE references:** Security rules include Common Weakness Enumeration references
- **Deterministic fixes:** Same violation = same fix every time
- **ESLint MCP optimized:** Fully compatible with ESLint's Model Context Protocol
- **TypeScript support:** Full TypeScript support with comprehensive type checking
- **Performance:** <10ms overhead per file

## Rule Categories

### Security Rules (8 rules)
- no-sql-injection, no-unsafe-dynamic-require, database-injection, detect-eval-with-expression, detect-child-process, detect-non-literal-fs-filename, detect-non-literal-regexp, detect-object-injection, no-hardcoded-credentials, no-weak-crypto, no-insufficient-random, no-unvalidated-user-input, no-unsanitized-html, no-unescaped-url-parameter, no-missing-cors-check, no-insecure-comparison, no-missing-authentication, no-privilege-escalation

### Architecture Rules (2 rules)
- no-circular-dependencies, no-internal-modules

### Development Rules (2 rules)
- no-console-log, prefer-dependency-version-strategy

### React Rules (3 rules)
- react-no-inline-functions, required-attributes, react-class-to-hooks

### Other Rules
- img-requires-alt, cognitive-complexity, identical-functions, no-deprecated-api, enforce-naming

## Error Message Format

All error messages follow a structured 2-line format optimized for AI assistants:

```
Line 1: Icon, CWE reference (if applicable), description, severity
Line 2: Specific fix instruction with documentation link
```

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

## FAQ

**Q: How do I initialize the plugin?**  
A: Import the plugin and add a config preset: `llmOptimized.configs.recommended`

**Q: How do I configure a specific rule?**  
A: Add the rule to your rules object: `'llm-optimized/rule-name': 'error'`

**Q: How do I disable a rule for a specific case?**  
A: Use inline comments: `// eslint-disable-next-line llm-optimized/rule-name`

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

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized:** Scoped version**
- **eslint-plugin-llm:** Shorter name variant**
- **eslint-plugin-mcp:** MCP-focused variant**
- **@forge-js/eslint-plugin-utils:** Build your own LLM-optimized rules

## License

MIT © Ofri Peretz

