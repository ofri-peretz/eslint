# @eslint/eslint-plugin-quality
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=quality)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=quality)

ESLint plugin for code quality, error handling, and complexity metrics.

## Installation

```bash
npm install --save-dev @eslint/eslint-plugin-quality
```

## Usage

### Flat Config (eslint.config.js)

```javascript
import quality from '@eslint/eslint-plugin-quality';

export default [
  {
    plugins: {
      '@eslint/quality': quality,
    },
    rules: {
      '@eslint/quality/no-console-log': 'warn',
      '@eslint/quality/cognitive-complexity': 'warn',
      // ...
    },
  },
];
```

## Rules

See [docs/rules](docs/rules) for detailed documentation.
