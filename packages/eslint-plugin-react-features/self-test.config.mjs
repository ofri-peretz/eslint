// Self-test flat config: runs the componentApi preset against any glob.
// Used to validate that the reference primitives pass our own rules.
import plugin from './dist/src/index.js';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@eslint/react-features': plugin,
    },
    rules: {
      '@eslint/react-features/component-api/no-default-test-id': 'error',
      '@eslint/react-features/component-api/require-data-slot': 'warn',
      '@eslint/react-features/component-api/no-is-prefix-prop': 'warn',
      '@eslint/react-features/component-api/no-inline-style': 'warn',
      '@eslint/react-features/component-api/no-raw-color-literal': 'warn',
      '@eslint/react-features/component-api/no-arbitrary-token-class': 'warn',
      '@eslint/react-features/component-api/no-kind-prop-discriminator': 'warn',
      '@eslint/react-features/component-api/no-wrapper-sub-component': 'warn',
    },
  },
];
