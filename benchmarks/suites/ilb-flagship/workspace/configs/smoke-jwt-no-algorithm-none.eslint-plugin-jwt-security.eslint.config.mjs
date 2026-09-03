import plugin from 'eslint-plugin-jwt-security';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'jwt-security': plugin.default ?? plugin },
  rules: { 'jwt-security/no-algorithm-none': ['error'] },
}];
