import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unsafe-query', () => {
  describe('Valid - Parameterized Queries', () => {
    ruleTester.run('valid - safe queries', noUnsafeQuery, {
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
        // pg-format usage (assumed safe)
        "client.query(format('SELECT * FROM %I', table))",
        // Variable with safe init (no concat/template)
        `const query = 'SELECT * FROM users'; db.query(query);`,
      ],
      invalid: [],
    });
  });

  describe('Invalid - Direct Concatenation/Interpolation', () => {
    ruleTester.run('invalid - direct', noUnsafeQuery, {
      valid: [],
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
  });

  describe('Invalid - Variable Taint Tracking', () => {
    ruleTester.run('invalid - tainted variables', noUnsafeQuery, {
      valid: [],
      invalid: [
        // vuln_sql_string_concat — concat assigned to variable, then passed to .query()
        {
          code: `
            const query = "SELECT * FROM users WHERE id = '" + userId + "'";
            db.query(query);
          `,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        // vuln_sql_template_literal — template literal assigned to variable
        {
          code: `
            const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
            db.query(query);
          `,
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        // vuln_sql_dynamic_column — template literal for ORDER BY
        {
          code: `
            const query = \`SELECT * FROM users ORDER BY \${sortColumn}\`;
            db.query(query);
          `,
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        // vuln_sql_conditional — += augmented assignment with template
        {
          code: `
            let query = "SELECT * FROM products WHERE 1=1";
            query += \` AND name = '\${name}'\`;
            db.query(query);
          `,
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
