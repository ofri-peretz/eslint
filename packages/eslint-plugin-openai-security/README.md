# eslint-plugin-openai-security

> OpenAI SDK security-focused ESLint plugin with verifiable rules

[![npm version](https://img.shields.io/npm/v/eslint-plugin-openai-security.svg)](https://www.npmjs.com/package/eslint-plugin-openai-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=openai_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=openai_security)

## Overview

`eslint-plugin-openai-security` provides ESLint rules specifically designed for the **OpenAI SDK**. Unlike generic security plugins, these rules understand the OpenAI API structure and can verify actual security configurations.

## Features

- 🎯 **SDK-Specific**: Rules designed exclusively for OpenAI API patterns
- ✅ **Verifiable**: Only checks patterns that can be statically verified
- 🤖 **LLM-Optimized**: Error messages designed for AI coding assistants
- 🔧 **Auto-fix**: Safe automatic fixes where applicable
- 📚 **Well-Documented**: Clear examples and security rationale

## Installation

```bash
# Using npm
npm install --save-dev eslint-plugin-openai-security

# Using pnpm
pnpm add -D eslint-plugin-openai-security

# Using yarn
yarn add -D eslint-plugin-openai-security
```

## Usage

### Flat Config (ESLint 9+)

```javascript
import openaiSecurity from 'eslint-plugin-openai-security';

export default [
  {
    plugins: {
      'openai-security': openaiSecurity,
    },
    rules: {
      // Enable specific rules
      'openai-security/require-max-tokens': 'error',
    },
  },
  // Or use a preset configuration
  openaiSecurity.configs.recommended,
];
```

## Example Rules

### `require-max-tokens`

Ensures all OpenAI API calls include token limits:

```typescript
// ❌ Bad - No token limit
await openai.chat.completions.create({
  messages: [...]
});

// ✅ Good - Token limit specified
await openai.chat.completions.create({
  messages: [...],
  max_tokens: 1000
});
```

## Configurations

### `recommended`

Sensible defaults for OpenAI security:

```javascript
import openaiSecurity from 'eslint-plugin-openai-security';

export default [openaiSecurity.configs.recommended];
```

### `strict`

All rules as errors:

```javascript
import openaiSecurity from 'eslint-plugin-openai-security';

export default [openaiSecurity.configs.strict];
```

## Development Status

🚧 This plugin is in early development. Rules are being implemented based on OpenAI SDK security best practices.

## License

MIT © Ofri Peretz

## Links

- [GitHub Repository](https://github.com/ofri-peretz/eslint)
- [Issue Tracker](https://github.com/ofri-peretz/eslint/issues)
