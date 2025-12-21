import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-unsafe-query', noUnsafeQuery, {
  valid: [
    // Ignored cases (coverage)
    "client.query()", // Empty args
    "client.other('SELECT ' + 1)", // Not query method
    // Standard parameterized query
    "client.query('SELECT * FROM users WHERE id = $1', [1])",
    // Simple string literal
    "client.query('SELECT * FROM users')",
    // Template literal without expressions
    "pool.query(`SELECT * FROM users`)",
    // Parameterized with template literal (safe if no expressions used for values)
    "client.query(`SELECT * FROM users WHERE id = $1`, [id])",
    // pg-format usage (assumed safe if another rule encourages it, or just not raw concat)
    "client.query(format('SELECT * FROM %I', table))", 
  ],
  invalid: [
    {
      code: "client.query('SELECT * FROM users WHERE id = ' + id)",
      errors: [{ messageId: 'noUnsafeQuery' }],
    },
    {
      code: "pool.query(`SELECT * FROM users WHERE id = ${id}`)",
      errors: [{ messageId: 'unsafeTemplateLiteral' }],
    },
    {
      code: "client.query('INSERT INTO users VALUES (' + val + ')')",
      errors: [{ messageId: 'noUnsafeQuery' }],
    },
  ],
});
