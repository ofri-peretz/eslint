import plugin from 'eslint-plugin-secure-coding';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    // Do NOT use plain '**/dist/**' or '**/build/**' — those false-positive
    // match next.js's `packages/next/src/build/` source dir (real files,
    // not build output) and silently ignore the 6 webpack-config cycle
    // cluster. Anchor the ignores to known build-output paths instead.
    ignores: ['**/node_modules/**', '**/.next/**', '**/coverage/**', '**/*.min.js', '**/test/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { 'secure-coding': plugin.default ?? plugin },
    rules: {
      'secure-coding/no-hardcoded-credentials': ['error'],
    },
  },
];
