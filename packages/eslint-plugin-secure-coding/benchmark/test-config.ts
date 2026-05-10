// Simple test config to validate false positive fixes
import secureCoding from '../dist/packages/eslint-plugin-secure-coding/src/index.js';

export default [
  {
    files: ['**/*.js'],
    plugins: {
      'secure-coding': secureCoding,
    },
    rules: secureCoding.configs.recommended.rules,
  },
];
