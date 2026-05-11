import plugin from 'eslint-plugin-vercel-ai-security';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'vercel-ai-security': plugin.default ?? plugin },
  rules: { 'vercel-ai-security/no-unsafe-output-handling': ['error'] },
}];
