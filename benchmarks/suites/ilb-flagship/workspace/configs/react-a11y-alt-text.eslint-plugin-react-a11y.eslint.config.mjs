import plugin from 'eslint-plugin-react-a11y';
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
    plugins: { 'react-a11y': plugin.default ?? plugin },
    rules: {
      'react-a11y/alt-text': ['error', {"img":["Image"]}],
    },
  },
];
