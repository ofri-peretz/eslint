/**
 * ESLint configuration for AI Security Benchmark
 *
 * Uses the full Interlace security suite to detect vulnerabilities
 * in AI-generated code.
 */

import secureCoding from 'eslint-plugin-secure-coding';
import pg from 'eslint-plugin-pg';
import nodeSecurity from 'eslint-plugin-node-security';
import jwt from 'eslint-plugin-jwt';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
  },
  secureCoding.configs.recommended,
  pg.configs.recommended,
  nodeSecurity.configs.recommended,
  jwt.configs.recommended,
];
