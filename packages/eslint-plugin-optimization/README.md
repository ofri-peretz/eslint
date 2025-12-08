# @eslint/eslint-plugin-optimization

ESLint plugin for performance optimization and best practices.

## Installation

```bash
npm install --save-dev @eslint/eslint-plugin-optimization
```

## Usage

### Flat Config (eslint.config.js)

```javascript
import optimization from '@eslint/eslint-plugin-optimization';

export default [
  {
    plugins: {
      '@eslint/optimization': optimization,
    },
    rules: {
      '@eslint/optimization/detect-n-plus-one-queries': 'warn',
      '@eslint/optimization/no-unbounded-cache': 'error',
      // ...
    },
  },
];
```

## Rules

See [docs/rules](docs/rules) for detailed documentation.
