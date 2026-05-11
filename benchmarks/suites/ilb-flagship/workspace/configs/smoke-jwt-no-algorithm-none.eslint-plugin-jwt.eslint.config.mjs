import plugin from 'eslint-plugin-jwt';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'jwt': plugin.default ?? plugin },
  rules: { 'jwt/no-algorithm-none': ['error'] },
}];
