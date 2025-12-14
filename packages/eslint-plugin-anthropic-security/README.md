# eslint-plugin-anthropic-security

> Anthropic SDK security-focused ESLint plugin with verifiable rules

[![npm version](https://img.shields.io/npm/v/eslint-plugin-anthropic-security.svg)](https://www.npmjs.com/package/eslint-plugin-anthropic-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`eslint-plugin-anthropic-security` provides ESLint rules specifically designed for the **Anthropic SDK**. Unlike generic security plugins, these rules understand the Anthropic API structure and can verify actual security configurations.

## Features

- 🎯 **SDK-Specific**: Rules designed exclusively for Anthropic API patterns
- ✅ **Verifiable**: Only checks patterns that can be statically verified
- 🤖 **LLM-Optimized**: Error messages designed for AI coding assistants
- 🔧 **Auto-fix**: Safe automatic fixes where applicable
- 📚 **Well-Documented**: Clear examples and security rationale

## Installation

```bash
# Using npm
npm install --save-dev eslint-plugin-anthropic-security

# Using pnpm
pnpm add -D eslint-plugin-anthropic-security

# Using yarn
yarn add -D eslint-plugin-anthropic-security
```

## Usage

### Flat Config (ESLint 9+)

```javascript
import anthropicSecurity from 'eslint-plugin-anthropic-security';

export default [
  {
    plugins: {
      'anthropic-security': anthropicSecurity,
    },
    rules: {
      // Enable specific rules
      'anthropic-security/require-max-tokens': 'error',
    },
  },
  // Or use a preset configuration
  anthropicSecurity.configs.recommended,
];
```

## Example Rules

### `require-max-tokens`

Ensures all Anthropic API calls include token limits:

```typescript
// ❌ Bad - No token limit
await anthropic.messages.create({
  messages: [...]
});

// ✅ Good - Token limit specified
await anthropic.messages.create({
  messages: [...],
  max_tokens: 1000
});
```

## Configurations

### `recommended`

Sensible defaults for Anthropic security:

```javascript
import anthropicSecurity from 'eslint-plugin-anthropic-security';

export default [anthropicSecurity.configs.recommended];
```

### `strict`

All rules as errors:

```javascript
import anthropicSecurity from 'eslint-plugin-anthropic-security';

export default [anthropicSecurity.configs.strict];
```

## Development Status

🚧 This plugin is in early development. Rules are being implemented based on Anthropic SDK security best practices.

## License

MIT © Ofri Peretz

## Links

- [GitHub Repository](https://github.com/ofri-peretz/eslint)
- [Issue Tracker](https://github.com/ofri-peretz/eslint/issues)
