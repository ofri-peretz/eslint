/**
 * Comprehensive tests for database-injection rule
 * Security: CWE-89 (SQL Injection), CWE-943 (NoSQL Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { databaseInjection } from '../../rules/security/database-injection';

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
        // Lines 226-235: SQL injection in template literals with tainted expressions
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${req.body.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
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
        // Lines 296-321, 336: Binary expression (string concatenation) SQL injection
        // Note: Binary expressions with multiple concatenations may report multiple errors
        {
          code: 'const query = "SELECT * FROM users WHERE name = \'" + req.body.name + "\'";',
          errors: [
            { messageId: 'databaseInjection' },
            { messageId: 'databaseInjection' },
          ],
        },
        {
          code: 'const query = "SELECT * FROM users WHERE name = \'" + userName + "\'";',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query("SELECT * FROM users WHERE id = " + req.params.id);',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });

  describe('Invalid Code - NoSQL Injection', () => {
    ruleTester.run('invalid - NoSQL injection patterns', databaseInjection, {
      valid: [],
      invalid: [
        // Lines 250-262: NoSQL injection in template literals
        // NoSQL patterns match: this.name === "value", this.name != "value", $where === "value"
        {
          code: 'const query = `this.name === "${req.body.name}"`;',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'const query = `this.name === "${userName}"`;',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'const query = `this.email != "${req.query.email}"`;',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'const query = `$where === "${req.params.filter}"`;',
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

  describe('Uncovered Lines', () => {
    // Lines 175, 181: High and medium confidence taint sources
    ruleTester.run('line 175 - high confidence taint sources', databaseInjection, {
      valid: [],
      invalid: [
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${req.body.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE email = ${req.query.email}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${request.body.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${params.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE email = ${query.email}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${body.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${input.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${userInput}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });

    // Line 181: Medium confidence taint sources
    ruleTester.run('line 181 - medium confidence taint sources', databaseInjection, {
      valid: [],
      invalid: [
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${props.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${state.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE email = ${context.email}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${event.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${data.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });

    // Lines 287-289: NoSQL operation detection
    ruleTester.run('line 287-289 - NoSQL operation with tainted args', databaseInjection, {
      valid: [],
      invalid: [
        {
          code: 'db.collection("users").find({ name: req.body.name });',
          errors: [{ messageId: 'databaseInjection' }],
        },
        {
          code: 'MongoClient.db.collection("users").findOne({ _id: req.params.id });',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Note: update() with tainted args in first argument should trigger
        // But the rule may need the tainted value to be directly in the object
        {
          code: 'db.collection("users").updateOne({ name: req.query.name }, { $set: { status: "active" } });',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });
});

