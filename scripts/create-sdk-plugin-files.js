#!/usr/bin/env node
/**
 * Script to create core source files for the 3 SDK-specific security plugins
 */

const fs = require('fs');
const path = require('path');

const PLUGINS_CONFIG = [
  {
    name: 'openai',
    fullName: 'eslint-plugin-openai-security',
    sdkName: 'OpenAI',
    description: 'OpenAI SDK security',
    apiExample: 'openai.chat.completions.create'
  },
  {
    name: 'anthropic',
    fullName: 'eslint-plugin-anthropic-security',
    sdkName: 'Anthropic',
    description: 'Anthropic/Claude SDK security',
    apiExample: 'anthropic.messages.create'
  },
  {
    name: 'google-ai',
    fullName: 'eslint-plugin-google-ai-security',
    sdkName: 'Google AI',
    description: 'Google Gemini SDK security',
    apiExample: 'model.generateContent'
  }
];

PLUGINS_CONFIG.forEach(plugin => {
  const pkgDir = path.join(__dirname, '..', 'packages', plugin.fullName);
  
  console.log(`\nCreating source files for ${plugin.fullName}...`);
  
  // Create index.ts
  const indexTs = `/**
 * ${plugin.fullName}
 * 
 * ${plugin.sdkName} SDK-specific security ESLint plugin with verifiable rules
 * for detecting and preventing vulnerabilities in ${plugin.sdkName} API usage.
 * 
 * @see https://github.com/ofri-peretz/eslint#readme
 */

import type { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of ${plugin.sdkName} SDK security rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // TODO: Add ${plugin.sdkName}-specific security rules
  // Example:
  // 'require-max-tokens': requireMaxTokens,
  // 'no-unvalidated-tool-calls': noUnvalidatedToolCalls,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: '${plugin.fullName}',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended ${plugin.sdkName} security configuration
   */
  recommended: {
    plugins: {
      '${plugin.name}-security': plugin,
    },
    rules: {
      // TODO: Add recommended rules
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict ${plugin.sdkName} security configuration
   */
  strict: {
    plugins: {
      '${plugin.name}-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [\`${plugin.name}-security/\${ruleName}\`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;
`;
  
  fs.writeFileSync(path.join(pkgDir, 'src', 'index.ts'), indexTs);
  console.log(`✓ Created src/index.ts`);
  
  // Create types/index.ts
  const typesTs = `/**
 * Type definitions for ${plugin.fullName}
 */

/**
 * Placeholder for ${plugin.sdkName} SDK security rule options
 */
export interface ${plugin.sdkName.replace(/[^a-zA-Z]/g, '')}SecurityRuleOptions {
  // TODO: Define specific rule options as rules are implemented
}
`;
  
  fs.writeFileSync(path.join(pkgDir, 'src', 'types', 'index.ts'), typesTs);
  console.log(`✓ Created src/types/index.ts`);
  
  // Create README.md
  const readme = `# ${plugin.fullName}

> ${plugin.sdkName} SDK security-focused ESLint plugin with verifiable rules

[![npm version](https://img.shields.io/npm/v/${plugin.fullName}.svg)](https://www.npmjs.com/package/${plugin.fullName})
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

\`${plugin.fullName}\` provides ESLint rules specifically designed for the **${plugin.sdkName} SDK**. Unlike generic security plugins, these rules understand the ${plugin.sdkName} API structure and can verify actual security configurations.

## Features

- 🎯 **SDK-Specific**: Rules designed exclusively for ${plugin.sdkName} API patterns
- ✅ **Verifiable**: Only checks patterns that can be statically verified
- 🤖 **LLM-Optimized**: Error messages designed for AI coding assistants
- 🔧 **Auto-fix**: Safe automatic fixes where applicable
- 📚 **Well-Documented**: Clear examples and security rationale

## Installation

\`\`\`bash
# Using npm
npm install --save-dev ${plugin.fullName}

# Using pnpm
pnpm add -D ${plugin.fullName}

# Using yarn
yarn add -D ${plugin.fullName}
\`\`\`

## Usage

### Flat Config (ESLint 9+)

\`\`\`javascript
import ${plugin.name.replace(/-/g, '')}Security from '${plugin.fullName}';

export default [
  {
    plugins: {
      '${plugin.name}-security': ${plugin.name.replace(/-/g, '')}Security,
    },
    rules: {
      // Enable specific rules
      '${plugin.name}-security/require-max-tokens': 'error',
    },
  },
  // Or use a preset configuration
  ${plugin.name.replace(/-/g, '')}Security.configs.recommended,
];
\`\`\`

## Example Rules

### \`require-max-tokens\`

Ensures all ${plugin.sdkName} API calls include token limits:

\`\`\`typescript
// ❌ Bad - No token limit
await ${plugin.apiExample}({
  messages: [...]
});

// ✅ Good - Token limit specified
await ${plugin.apiExample}({
  messages: [...],
  max_tokens: 1000
});
\`\`\`

## Configurations

### \`recommended\`

Sensible defaults for ${plugin.sdkName} security:

\`\`\`javascript
import ${plugin.name.replace(/-/g, '')}Security from '${plugin.fullName}';

export default [${plugin.name.replace(/-/g, '')}Security.configs.recommended];
\`\`\`

### \`strict\`

All rules as errors:

\`\`\`javascript
import ${plugin.name.replace(/-/g, '')}Security from '${plugin.fullName}';

export default [${plugin.name.replace(/-/g, '')}Security.configs.strict];
\`\`\`

## Development Status

🚧 This plugin is in early development. Rules are being implemented based on ${plugin.sdkName} SDK security best practices.

## License

MIT © Ofri Peretz

## Links

- [GitHub Repository](https://github.com/ofri-peretz/eslint)
- [Issue Tracker](https://github.com/ofri-peretz/eslint/issues)
`;
  
  fs.writeFileSync(path.join(pkgDir, 'README.md'), readme);
  console.log(`✓ Created README.md`);
  
  // Create CHANGELOG.md
  const changelog = `# Changelog

All notable changes to \`${plugin.fullName}\` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial package structure
- Plugin configuration presets: \`recommended\`, \`strict\`
- TypeScript type definitions

## [0.0.1] - 2025-12-13

### Added
- Initial release
- Project scaffolding
- ${plugin.sdkName} SDK-specific security focus
`;
  
  fs.writeFileSync(path.join(pkgDir, 'CHANGELOG.md'), changelog);
  console.log(`✓ Created CHANGELOG.md`);
  
  console.log(`✅ Completed ${plugin.fullName}`);
});

console.log('\n🎉 All source files created successfully!\n');
