import plugin from 'eslint-plugin-secure-coding';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'secure-coding': plugin.default ?? plugin },
  rules: { 'secure-coding/no-hardcoded-credentials': ['error'] },
}];
