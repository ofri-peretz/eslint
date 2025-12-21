/**
 * ESLint configuration for eslint-plugin-pg benchmark
 */

import pg from '../../../dist/packages/eslint-plugin-pg/src/index.js';

export default [
  {
    files: ['**/*.js', '**/test-files/**/*.js'],
    plugins: {
      pg,
    },
    rules: {
      // Security rules (errors)
      'pg/no-unsafe-query': 'error',
      'pg/no-insecure-ssl': 'error',
      'pg/no-hardcoded-credentials': 'error',
      'pg/no-unsafe-search-path': 'error',
      'pg/no-unsafe-copy-from': 'error',
      'pg/no-transaction-on-pool': 'error',
      
      // Resource management (errors)
      'pg/no-missing-client-release': 'error',
      'pg/prevent-double-release': 'error',
      'pg/no-floating-query': 'error',
      
      // Quality (warnings)
      'pg/check-query-params': 'warn',
      'pg/no-select-all': 'warn',
      'pg/prefer-pool-query': 'warn',
      'pg/no-batch-insert-loop': 'warn',
    },
  },
];
