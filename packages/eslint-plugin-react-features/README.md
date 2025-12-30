# @eslint/eslint-plugin-react-features
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=react_features)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=react_features)

ESLint plugin for React features, hooks, and migration helpers.

## Installation

```bash
npm install --save-dev @eslint/eslint-plugin-react-features
```

## Usage

### Flat Config (eslint.config.js)

```javascript
import reactFeatures from '@eslint/eslint-plugin-react-features';

export default [
  {
    plugins: {
      '@eslint/react-features': reactFeatures,
    },
    rules: {
      '@eslint/react-features/jsx-key': 'error',
      '@eslint/react-features/hooks-exhaustive-deps': 'warn',
      // ...
    },
  },
];
```

## Rules

See [docs/rules](docs/rules) for detailed documentation.
