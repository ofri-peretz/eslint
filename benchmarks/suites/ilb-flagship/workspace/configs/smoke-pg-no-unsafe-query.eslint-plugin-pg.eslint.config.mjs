import plugin from 'eslint-plugin-pg';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'pg': plugin.default ?? plugin },
  rules: { 'pg/no-unsafe-query': ['error'] },
}];
