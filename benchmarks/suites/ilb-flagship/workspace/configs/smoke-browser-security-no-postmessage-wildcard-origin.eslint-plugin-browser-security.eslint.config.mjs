import plugin from 'eslint-plugin-browser-security';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'browser-security': plugin.default ?? plugin },
  rules: { 'browser-security/no-postmessage-wildcard-origin': ['error'] },
}];
