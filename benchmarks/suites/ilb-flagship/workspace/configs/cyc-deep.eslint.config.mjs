import plugin from 'eslint-plugin-import-next';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'import-next': plugin.default ?? plugin },
  rules: { 'import-next/no-cycle': ['error', { maxDepth: 100 }] },
}];
