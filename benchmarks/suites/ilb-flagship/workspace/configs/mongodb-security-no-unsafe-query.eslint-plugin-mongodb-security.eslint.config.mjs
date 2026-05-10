import plugin from 'eslint-plugin-mongodb-security';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/coverage/**', '**/*.min.js', '**/test/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { 'mongodb-security': plugin.default ?? plugin },
    rules: {
      'mongodb-security/no-unsafe-query': ['error'],
    },
  },
];
