# @eslint/eslint-plugin-architecture

ESLint architecture rules enforcing DDD, API boundaries, and project structure.

## Installation

```bash
npm install --save-dev @eslint/eslint-plugin-architecture
```

## Usage

### Flat Config (eslint.config.js)

```javascript
import architecture from '@eslint/eslint-plugin-architecture';

export default [
  {
    plugins: {
      '@eslint/architecture': architecture,
    },
    rules: {
      '@eslint/architecture/enforce-naming': 'error',
      '@eslint/architecture/ddd-anemic-domain-model': 'warn',
      // ...
    },
  },
];
```

## Rules

See [docs/rules](docs/rules) for detailed documentation.
