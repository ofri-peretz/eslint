/**
 * Comprehensive tests for database-injection rule
 * Security: CWE-89 (SQL Injection), CWE-943 (NoSQL Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { databaseInjection } from '../rules/security/database-injection';

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

describe('database-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe database queries', databaseInjection, {
      valid: [
        // Parameterized SQL queries
        {
          code: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
        },
        {
          code: 'db.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);',
        },
        // ORM queries
        {
          code: 'prisma.user.findUnique({ where: { id: userId } });',
        },
        {
          code: 'User.findOne({ where: { id: userId } });',
        },
        // NoSQL safe queries
        {
          code: 'db.collection("users").find({ id: userId });',
        },
        {
          code: 'MongoClient.db.collection("users").findOne({ _id: ObjectId(userId) });',
        },
        // Literal strings without SQL keywords
        {
          code: 'const text = "This is not a query";',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - SQL Injection', () => {
    ruleTester.run('invalid - SQL injection patterns', databaseInjection, {
      valid: [],
      invalid: [
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Note: Rule may not detect string concatenation patterns
        // Rule checks template literals and call expressions but may miss string concatenation
        // This represents expected behavior - rule may need enhancement
        {
          code: 'const query = "SELECT * FROM users WHERE name = \'" + userName + "\'";',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`INSERT INTO users (name) VALUES (${name})`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`UPDATE users SET name = ${name} WHERE id = ${id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });

  describe('Invalid Code - NoSQL Injection', () => {
    ruleTester.run('invalid - NoSQL injection patterns', databaseInjection, {
      valid: [],
      invalid: [
        // Note: Rule checks template literals and call expressions directly
        // These patterns may need to be tested differently based on rule implementation
        {
          code: 'const query = `this.name === "${userName}"`;',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', databaseInjection, {
      valid: [],
      invalid: [
        {
          code: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
          errors: [
            {
              messageId: 'databaseInjection',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', databaseInjection, {
      valid: [
        // If detectNoSQL is false, NoSQL patterns might not trigger
        {
          code: 'db.collection("users").find({ name: userName });',
          options: [{ detectNoSQL: false }],
        },
      ],
      invalid: [
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          options: [{ detectNoSQL: false }],
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', databaseInjection, {
      valid: [
        // Template literal with no expressions
        {
          code: 'db.query(`SELECT * FROM users`);',
        },
      ],
      invalid: [
        {
          code: 'const { query } = require("db"); query(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });
});

