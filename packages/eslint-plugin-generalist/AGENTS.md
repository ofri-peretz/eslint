# eslint-plugin-generalist - AI Agent Guide

## Package Metadata

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| **Name**       | eslint-plugin-generalist                                            |
| **Version**    | 1.0.0                                                               |
| **Type**       | ESLint Plugin (Barrel Export)                                       |
| **Language**   | TypeScript                                                          |
| **Node.js**    | >=18.0.0                                                            |
| **ESLint**     | ^8.0.0 \|\| ^9.0.0                                                  |
| **License**    | MIT                                                                 |
| **Homepage**   | https://github.com/ofri-peretz/forge-js#readme                      |
| **Repository** | https://github.com/ofri-peretz/forge-js.git                         |
| **Directory**  | packages/eslint-plugin-generalist                                   |
| **NPM**        | https://www.npmjs.com/package/eslint-plugin-generalist              |

## Description

The "Generalist" ESLint plugin. A single, monolithic plugin that aims to replace the fragmented ecosystem of `import`, `security`, `react`, and `unicorn` plugins. It provides 137+ rules covering Security, Architecture, React, and Code Quality, all powered by an AI-optimized engine.

## Keywords

eslint, eslint-plugin, generalist, all-in-one, linting, security, react, architecture, code-quality, ai-optimized, llm, automation, monolith

## Installation

```bash
npm install --save-dev eslint-plugin-generalist
# or
pnpm add -D eslint-plugin-generalist
# or
yarn add -D eslint-plugin-generalist
```

**For TypeScript projects:**

```bash
npm install --save-dev typescript-eslint
```

## Quick Start

```bash
# 1. Install
npm install --save-dev eslint-plugin-generalist

# 2. Add to eslint.config.js
import generalist from 'eslint-plugin-generalist';
import js from '@eslint/js';

export default [js.configs.recommended, generalist.configs.recommended];

# 3. Run ESLint
npx eslint .
```

## Available Presets

| Preset          | Rules Included                                                 | Best For                             |
| --------------- | -------------------------------------------------------------- | ------------------------------------ |
| **recommended** | 10 rules (3 security, 2 architecture, 2 development, 3 others) | Most projects - balanced enforcement |
| **strict**      | All 137+ rules as errors                                       | Maximum code quality enforcement     |
| **security**    | 29 security rules only                                         | Security-critical applications       |
| **react**       | 41 React-specific rules                                        | React/Next.js projects               |
| **sonarqube**   | 2 SonarQube-inspired rules                                     | Teams using SonarQube                |

## Package Relationship

This package is a barrel export of `@forge-js/eslint-plugin-llm-optimized`. It provides a "Generalist" branded package name while maintaining identical functionality.

**Functionally identical to:**
- `@forge-js/eslint-plugin-llm-optimized` (scoped version)
- `eslint-plugin-mcp` (MCP-focused variant)
- `eslint-plugin-llm` (LLM-focused variant)

## Rule Naming Convention

- Plugin prefix: `generalist/`
- Rule names: kebab-case (e.g., `no-sql-injection`, `no-console-log`)
- Full rule ID: `generalist/no-sql-injection`

## License

MIT © Ofri Peretz

