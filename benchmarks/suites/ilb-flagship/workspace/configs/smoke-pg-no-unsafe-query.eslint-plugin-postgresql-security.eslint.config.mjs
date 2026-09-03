import plugin from 'eslint-plugin-postgresql-security';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'postgresql-security': plugin.default ?? plugin },
  rules: { 'postgresql-security/no-unsafe-query': ['error'] },
}];
