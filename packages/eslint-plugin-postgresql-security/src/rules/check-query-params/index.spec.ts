import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { checkQueryParams } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('check-query-params', checkQueryParams, {
  valid: [
    // Basic valid cases
    {
      code: "client.query('SELECT * FROM users WHERE id = $1', [1])",
      name: 'Basic parameterized query with 1 arg',
    },
    {
      code: "pool.query('INSERT INTO users(name, email) VALUES($1, $2)', ['name', 'email'])",
      name: 'Insert with 2 parameters',
    },
    // Ignored cases (coverage)
    {
      code: "client.otherMethod('SELECT 1', [])", // Not .query
      name: 'Ignored: Not a .query method call',
    },
    {
      code: "otherFunc('SELECT 1', [])", // Not MemberExpression
      name: 'Ignored: Not a member expression call',
    },
    {
      code: "client.query('SELECT 1', dynamicValues)", // Dynamic values array (can't check count)
      name: 'Ignored: Dynamic values array',
    },
    {
      code: "client.query('SELECT 1')",
      name: 'Query with no parameters and no args array',
    },
    {
      code: "client.query('SELECT 1', [])",
      name: 'Query with no parameters and empty args array',
    },
    // Gaps in parameters (PG requires array length to cover the max index)
    {
      code: "client.query('SELECT $1, $3', [1, 2, 3])",
      name: 'Gaps in parameter indices ($1, $3), array has 3 elements',
    },
    // Edge cases: Strings and Comments
    {
      code: "client.query(\"SELECT '$1'\", [])",
      name: 'String literal containing $1 should be ignored',
    },
    {
      code: "client.query('SELECT 1 -- $1', [])",
      name: 'Line comment containing $1 should be ignored',
    },
    {
      code: "client.query('SELECT 1 /* $1 */', [])",
      name: 'Block comment containing $1 should be ignored',
    },
    {
      code: "client.query('SELECT \"$1\"', [])", 
      name: 'Quoted identifier "$1" (unlikely but valid SQL identifier) - technically NOT a param',
      // Note: $1 inside double quotes is an identifier, not a parameter. 
      // Our regex might match it if we don't strip double quotes?
      // Postgres treats "$1" as a column name "1" or similar? No, "$1" is identifier.
      // Real param is unquoted $1.
      // Current rule strips single quotes. Does NOT strip double quotes.
      // If we strip double quotes, we avoid FP here.
      // Let's assume for now we might have FP on "$1" if we don't handle it.
      // But typically people don't name columns "$1".
      // Let's see if this fails.
    },
    // Multiline
    {
      code: `
        client.query('SELECT * FROM users WHERE id = $1', [1])
      `,
      name: 'Multiline code formatted query',
    },
    {
      code: "client.query(`SELECT * FROM users WHERE id = $1`, [1])", 
      name: 'Template literal (static) with $1',
    },
  ],
  invalid: [
    // Missing arguments
    {
      code: "client.query('SELECT * FROM users WHERE id = $1', [])",
      name: 'Missing argument (provided 0, needed 1)',
      errors: [{ messageId: 'parameterCountMismatch', data: { expected: '1', actual: '0' } }],
    },
    {
      code: "pool.query('INSERT INTO users VALUES($1, $2)', [1])",
      name: 'Missing argument (provided 1, needed 2)',
      errors: [{ messageId: 'parameterCountMismatch', data: { expected: '2', actual: '1' } }],
    },
    // Gaps handling
    {
      code: "client.query('SELECT $3', [1, 2])",
      name: 'Highest index is $3, but only 2 args provided',
      errors: [{ messageId: 'parameterCountMismatch', data: { expected: '3', actual: '2' } }],
    },
    // Double digits
    {
      code: "client.query('SELECT $10', [1,2,3,4,5,6,7,8,9])", 
      name: 'Highest index is $10, provided 9 args',
      errors: [{ messageId: 'parameterCountMismatch', data: { expected: '10', actual: '9' } }],
    },
    // Multiple occurrences
    {
      code: "client.query('SELECT $1, $1', [])",
      name: 'Repeated $1 still requires at least 1 arg',
      errors: [{ messageId: 'parameterCountMismatch', data: { expected: '1', actual: '0' } }],
    },
  ],
});
