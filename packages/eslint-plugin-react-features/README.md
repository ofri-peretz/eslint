# @eslint/eslint-plugin-react-features

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
