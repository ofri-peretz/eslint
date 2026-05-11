import plugin from 'eslint-plugin-react-features';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'react-features': plugin.default ?? plugin },
  rules: { 'react-features/hooks-exhaustive-deps': ['error'] },
}];
