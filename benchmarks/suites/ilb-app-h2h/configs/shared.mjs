// Shared by every config in this suite: same ignores, same parser setup, both sides.
// No rule is added or disabled per app or after seeing a result (plan section 6.2 rule 5).
import tsParser from '@typescript-eslint/parser';

export const base = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.min.js',
      // vendored third-party code, same for both sides
      'app/assets/**',
      'public/**',
      'frontend/src/assets/**',
      // tests, artifacts: excluded for every app and both plugins
      '**/test/**',
      '**/tests/**',
      '**/*.spec.ts',
      '**/*.test.js',
      'artifacts/**',
      'cypress/**',
      // Juice Shop ground-truth fix snippets are not application code
      'data/static/codefixes/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { sourceType: 'commonjs', ecmaVersion: 'latest' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser, sourceType: 'module' },
  },
];
