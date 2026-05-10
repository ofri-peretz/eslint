import plugin from 'eslint-plugin-import-next';
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
    plugins: { 'import-next': plugin.default ?? plugin },
    rules: {
      'import-next/no-cycle': ['error'],
    },
  },
];
