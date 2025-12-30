# eslint-plugin-google-ai-security

> Google AI SDK security-focused ESLint plugin with verifiable rules

[![npm version](https://img.shields.io/npm/v/eslint-plugin-google-ai-security.svg)](https://www.npmjs.com/package/eslint-plugin-google-ai-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?flag=eslint-plugin-google-ai-security)](https://codecov.io/gh/ofri-peretz/eslint)

## Overview

`eslint-plugin-google-ai-security` provides ESLint rules specifically designed for the **Google AI SDK**. Unlike generic security plugins, these rules understand the Google AI API structure and can verify actual security configurations.

## Features

- 🎯 **SDK-Specific**: Rules designed exclusively for Google AI API patterns
- ✅ **Verifiable**: Only checks patterns that can be statically verified
- 🤖 **LLM-Optimized**: Error messages designed for AI coding assistants
- 🔧 **Auto-fix**: Safe automatic fixes where applicable
- 📚 **Well-Documented**: Clear examples and security rationale

## Installation

```bash
# Using npm
npm install --save-dev eslint-plugin-google-ai-security

# Using pnpm
pnpm add -D eslint-plugin-google-ai-security

# Using yarn
yarn add -D eslint-plugin-google-ai-security
```

## Usage

### Flat Config (ESLint 9+)

```javascript
import googleaiSecurity from 'eslint-plugin-google-ai-security';

export default [
  {
    plugins: {
      'google-ai-security': googleaiSecurity,
    },
    rules: {
      // Enable specific rules
      'google-ai-security/require-max-tokens': 'error',
    },
  },
  // Or use a preset configuration
  googleaiSecurity.configs.recommended,
];
```

## Example Rules

### `require-max-tokens`

Ensures all Google AI API calls include token limits:

```typescript
// ❌ Bad - No token limit
await model.generateContent({
  messages: [...]
});

// ✅ Good - Token limit specified
await model.generateContent({
  messages: [...],
  max_tokens: 1000
});
```

## Configurations

### `recommended`

Sensible defaults for Google AI security:

```javascript
import googleaiSecurity from 'eslint-plugin-google-ai-security';

export default [googleaiSecurity.configs.recommended];
```

### `strict`

All rules as errors:

```javascript
import googleaiSecurity from 'eslint-plugin-google-ai-security';

export default [googleaiSecurity.configs.strict];
```

## Development Status

🚧 This plugin is in early development. Rules are being implemented based on Google AI SDK security best practices.

## License

MIT © Ofri Peretz

## Links

- [GitHub Repository](https://github.com/ofri-peretz/eslint)
- [Issue Tracker](https://github.com/ofri-peretz/eslint/issues)
