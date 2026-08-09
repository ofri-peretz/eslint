import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noTransactionOnPool } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-transaction-on-pool', noTransactionOnPool, {
  valid: [
    // Ignored cases (coverage)
    "pool.otherMethod('BEGIN')",
    "pool.query(dynamicVar)", // Not literal
    "client.query()", // Empty args
    "pool.query()", // Empty args (on pool)
    "client.query('COMMIT')",
    "pool.query('SELECT 1')",
    "customClient.query('BEGIN')",
  ],
  invalid: [
    {
      code: "pool.query('BEGIN')",
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
    {
      code: "myPool.query('COMMIT')",
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
    {
      code: "pool.query('ROLLBACK')",
      errors: [{ messageId: 'noTransactionOnPool' }],
    },
  ],
});
