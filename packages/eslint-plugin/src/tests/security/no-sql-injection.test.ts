/**
 * Comprehensive tests for no-sql-injection rule
 * Security: CWE-89 (SQL Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSqlInjection } from '../../rules/security/no-sql-injection';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-sql-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe SQL queries', noSqlInjection, {
      valid: [
        // Parameterized queries
        {
          code: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
        },
        {
          code: 'db.query("SELECT * FROM users WHERE name = ? AND age = ?", [name, age]);',
        },
        // ORM queries
        {
          code: 'db.user.findWhere({ id: userId });',
        },
        {
          code: 'User.findOne({ where: { id: userId } });',
        },
        // Literal strings without SQL keywords
        {
          code: 'const query = "This is not SQL";',
        },
        {
          code: 'const text = `Hello ${name}`;',
        },
        // Template literals without SQL keywords
        {
          code: 'const message = `User ${name} logged in`;',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Template Literals', () => {
    ruleTester.run('invalid - SQL injection in template literals', noSqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  // Now produces valid JavaScript with db.query() wrapper
                  output: 'const query = db.query(`SELECT * FROM users WHERE id = $1`, [userId])',
                },
              ],
            },
          ],
        },
        {
          code: 'const query = `SELECT * FROM users WHERE name = "${userName}"`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: 'const query = db.query(`SELECT * FROM users WHERE name = "$1"`, [userName])',
                },
              ],
            },
          ],
        },
        {
          code: `
            const query = \`SELECT * FROM users WHERE id = \${userId} AND name = \${userName}\`;
          `,
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: `
            const query = db.query(\`SELECT * FROM users WHERE id = $1 AND name = $2\`, [userId, userName])
          `,
                },
              ],
            },
          ],
        },
        {
          code: 'const query = `INSERT INTO users (name, email) VALUES (${name}, ${email})`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: 'const query = db.query(`INSERT INTO users (name, email) VALUES ($1, $2)`, [name, email])',
                },
              ],
            },
          ],
        },
        {
          code: 'const query = `UPDATE users SET name = ${name} WHERE id = ${id}`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: 'const query = db.query(`UPDATE users SET name = $1 WHERE id = $2`, [name, id])',
                },
              ],
            },
          ],
        },
        {
          code: 'const query = `DELETE FROM users WHERE id = ${userId}`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: 'const query = db.query(`DELETE FROM users WHERE id = $1`, [userId])',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - String Concatenation', () => {
    ruleTester.run('invalid - SQL injection in string concatenation', noSqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const query = "SELECT * FROM users WHERE id = " + userId;',
          errors: [{ messageId: 'sqlInjection' }],
        },
        {
          code: 'const query = "SELECT * FROM users WHERE name = \'" + userName + "\'";',
          // Note: This creates multiple BinaryExpression nodes, so reports multiple errors
          errors: [
            { messageId: 'sqlInjection' },
            { messageId: 'sqlInjection' },
          ],
        },
        {
          code: 'const query = "SELECT * FROM users WHERE id = " + userId + " AND active = 1";',
          // Note: Multiple concatenations create multiple errors
          errors: [
            { messageId: 'sqlInjection' },
            { messageId: 'sqlInjection' },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', noSqlInjection, {
      valid: [],
      invalid: [
        {
          code: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: 'const query = db.query(`SELECT * FROM users WHERE id = $1`, [userId])',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noSqlInjection, {
      valid: [
        // Template literal with no expressions
        {
          code: 'const query = `SELECT * FROM users`;',
        },
        // String without SQL keywords
        {
          code: 'const text = "Hello " + name;',
        },
      ],
      invalid: [
        {
          code: 'const query = `SELECT * FROM ${tableName}`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: 'const query = db.query(`SELECT * FROM $1`, [tableName])',
                },
              ],
            },
          ],
        },
        {
          code: 'const query = `EXEC sp_getuser ${userId}`;',
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  output: 'const query = db.query(`EXEC sp_getuser $1`, [userId])',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options - allowDynamicTableNames', () => {
    ruleTester.run('allowDynamicTableNames option', noSqlInjection, {
      valid: [
        // When allowDynamicTableNames is true, only table name is allowed
        {
          code: 'const query = `SELECT * FROM ${tableName}`;',
          options: [{ allowDynamicTableNames: true }],
        },
      ],
      invalid: [
        // Even with allowDynamicTableNames, WHERE clauses with expressions are still unsafe
        {
          code: 'const query = `SELECT * FROM ${tableName} WHERE id = ${userId}`;',
          options: [{ allowDynamicTableNames: true }],
          errors: [
            {
              messageId: 'sqlInjection',
              suggestions: [
                {
                  messageId: 'useParameterized',
                  // Note: Rule replaces ALL expressions, not just WHERE clause ones
                  output: 'const query = db.query(`SELECT * FROM $1 WHERE id = $2`, [tableName, userId])',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Line 114: Return false when isUnsafeSQLExpression returns false
    // This is the fallback case when the expression doesn't match unsafe patterns
    ruleTester.run('line 114 - safe expression fallback', noSqlInjection, {
      valid: [
        // Expression that doesn't match SQL patterns
        {
          code: 'const text = `Hello ${name}`;',
        },
        {
          code: 'const message = `User ${userId} logged in at ${timestamp}`;',
        },
        // BinaryExpression with literals on both sides (safe)
        {
          code: 'const result = "SELECT" + " * FROM users";',
        },
      ],
      invalid: [],
    });
  });
});

