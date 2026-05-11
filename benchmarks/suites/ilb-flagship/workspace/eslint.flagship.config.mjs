import tsParser from '@typescript-eslint/parser';
import importNext from 'eslint-plugin-import-next';
import pg from 'eslint-plugin-pg';
import secureCoding from 'eslint-plugin-secure-coding';
import mongodbSecurity from 'eslint-plugin-mongodb-security';
import jwt from 'eslint-plugin-jwt';
import browserSecurity from 'eslint-plugin-browser-security';
import reactFeatures from 'eslint-plugin-react-features';
import reactA11y from 'eslint-plugin-react-a11y';
import vercelAiSecurity from 'eslint-plugin-vercel-ai-security';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**', '**/*.min.js', '**/*.test.ts', '**/*.spec.ts', '**/test-results/**', '**/.turbo/**'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'interlace-import-next': importNext,
      'interlace-pg': pg,
      'interlace-secure-coding': secureCoding,
      'interlace-mongodb-security': mongodbSecurity,
      'interlace-jwt': jwt,
      'interlace-browser-security': browserSecurity,
      'interlace-react-features': reactFeatures,
      'interlace-react-a11y': reactA11y,
      'interlace-vercel-ai-security': vercelAiSecurity,
    },
    rules: {
      'interlace-import-next/no-cycle': 'error',
      'interlace-pg/no-unsafe-query': 'error',
      'interlace-secure-coding/no-hardcoded-credentials': 'error',
      'interlace-secure-coding/no-redos-vulnerable-regex': 'error',
      'interlace-mongodb-security/no-unsafe-query': 'error',
      'interlace-jwt/no-algorithm-none': 'error',
      'interlace-browser-security/no-postmessage-wildcard-origin': 'error',
      'interlace-react-features/hooks-exhaustive-deps': 'error',
      'interlace-react-a11y/alt-text': 'error',
      'interlace-vercel-ai-security/no-unsafe-output-handling': 'error',
    },
  },
];
