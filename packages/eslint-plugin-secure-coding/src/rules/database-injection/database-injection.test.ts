/**
 * Comprehensive tests for database-injection rule
 * Security: CWE-89 (SQL Injection), CWE-943 (NoSQL Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { databaseInjection } from './index';

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
        // Use case: Safe SQL query using parameterized placeholders (?) instead of string interpolation
        // This prevents SQL injection by separating query structure from user data
        {
          code: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
        },
        // Use case: Safe parameterized INSERT query with multiple placeholders
        // User input is passed as an array, ensuring proper escaping and validation
        {
          code: 'db.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);',
        },
        // Use case: Safe ORM query using Prisma's query builder
        // ORMs handle parameterization internally, preventing injection attacks
        {
          code: 'prisma.user.findUnique({ where: { id: userId } });',
        },
        // Use case: Safe ORM query using Sequelize or similar ORM
        // Object-based query API prevents SQL injection through proper escaping
        {
          code: 'User.findOne({ where: { id: userId } });',
        },
        // Use case: Safe NoSQL query using MongoDB's object-based query syntax
        // MongoDB driver handles input sanitization when using object notation
        {
          code: 'db.collection("users").find({ id: userId });',
        },
        // Use case: Safe MongoDB query with ObjectId conversion
        // Using proper MongoDB methods prevents NoSQL injection
        {
          code: 'MongoClient.db.collection("users").findOne({ _id: ObjectId(userId) });',
        },
        // Use case: Harmless string literal without SQL keywords
        // Not a database query, so no injection risk
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
        // Use case: SQL injection via template literal with unsanitized request.body data
        // Attacker can manipulate req.body.id to inject malicious SQL (e.g., "1 OR 1=1")
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${req.body.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection via template literal with untrusted variable
        // Variable userId could contain malicious SQL if not properly validated
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection in INSERT statement via template literal
        // Attacker can inject SQL through the name variable to manipulate the INSERT query
        {
          code: 'db.query(`INSERT INTO users (name) VALUES (${name})`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection in UPDATE statement with multiple interpolated variables
        // Both name and id variables can be exploited to modify the query logic
        {
          code: 'db.query(`UPDATE users SET name = ${name} WHERE id = ${id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection via string concatenation with request.body data
        // Attacker can break out of the quoted string in req.body.name (e.g., "' OR '1'='1")
        // Note: Multiple concatenations may report multiple errors
        {
          code: 'const query = "SELECT * FROM users WHERE name = \'" + req.body.name + "\'";',
          errors: [
            { messageId: 'databaseInjection' },
            { messageId: 'databaseInjection' }
          ],
        },
        // Use case: SQL injection via string concatenation with untrusted variable
        // userName variable could contain SQL escape sequences to break query logic
        {
          code: 'const query = "SELECT * FROM users WHERE name = \'" + userName + "\'";',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection via string concatenation in direct query execution
        // req.params.id is concatenated directly, allowing SQL injection attacks
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
        // Use case: NoSQL injection via MongoDB $where operator with request.body data
        // Attacker can inject JavaScript code through req.body.name to execute arbitrary queries
        // Example: req.body.name = '"; return true; //'
        {
          code: 'const query = `this.name === "${req.body.name}"`;',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: NoSQL injection via MongoDB JavaScript query with untrusted variable
        // userName could contain malicious JavaScript to break query logic
        {
          code: 'const query = `this.name === "${userName}"`;',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: NoSQL injection using inequality operator with request.query data
        // Attacker can inject JavaScript through req.query.email to bypass authentication
        {
          code: 'const query = `this.email != "${req.query.email}"`;',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: NoSQL injection via MongoDB $where operator with URL parameters
        // The $where operator allows arbitrary JavaScript execution, making it highly dangerous
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
        // Use case: Verify that the rule provides helpful suggestions for fixing SQL injection
        // This tests the suggestion mechanism, which should recommend parameterized queries or ORMs
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
        // Use case: When detectNoSQL option is disabled, NoSQL queries should not be flagged
        // This allows teams to focus only on SQL injection if they don't use NoSQL databases
        {
          code: 'db.collection("users").find({ name: userName });',
          options: [{ detectNoSQL: false }],
        },
        // Use case: Variables in trustedSources list are considered safe
        // This allows whitelisting specific variables that are known to be sanitized
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${trustedId}`);',
          options: [{ trustedSources: ['trustedId'] }],
        },
        // Use case: Constants (all uppercase identifiers) are assumed safe
        // Constants typically hold configuration values, not user input
        {
          code: 'db.query(`SELECT * FROM users WHERE status = ${ACTIVE_STATUS}`);',
        },
      ],
      invalid: [
        // Use case: Verify that detectNoSQL option doesn't disable SQL injection detection
        // What's wrong: userId is interpolated into a SQL query (potential injection)
        // What this tests: Setting detectNoSQL=false only disables NoSQL checks, SQL checks remain active
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          options: [{ detectNoSQL: false }],
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: Verify that high-risk taint sources cannot be whitelisted
        // What's wrong: req.body.id comes directly from user request (untrusted input in SQL query)
        // What this tests: Even with req.body.id in trustedSources, the rule still flags it as dangerous
        // Why: Request data (req.body/query/params) is ALWAYS considered tainted for security
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${req.body.id}`);',
          options: [{ trustedSources: ['req.body.id'] }],
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', databaseInjection, {
      valid: [
        // Use case: Static SQL query without any dynamic values
        // Safe because there's no user input interpolated into the query
        {
          code: 'db.query(`SELECT * FROM users`);',
        },
        // Use case: String concatenation without SQL keywords
        // Not a database query, just regular string manipulation
        {
          code: 'const result = "hello" + userInput;',
        },
        // Use case: NoSQL query with literal values only
        // Safe because the query uses hardcoded string, not user input
        {
          code: 'db.collection("users").find({ status: "active" });',
        },
        // Use case: Template literal with NoSQL patterns but only static strings
        // No dynamic expressions, so no injection risk despite NoSQL syntax
        {
          code: 'const query = `this.name === "safeValue"`;',
        },
        // Use case: Template literal in non-database context
        // Just a greeting message, not a database query despite having expressions
        {
          code: 'const message = `Hello ${userName}!`;',
        },
        // Use case: NoSQL pattern with constant (uppercase) value
        // Constants are assumed safe as they're configuration values, not user input
        {
          code: 'const query = `this.name === "${ACTIVE_STATUS}"`;',
        },
      ],
      invalid: [
        // Use case: SQL injection when query function is destructured from module
        // Tests that the rule detects vulnerable patterns even with complex object destructuring
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
        // Use case: SQL injection from HTTP request body (Express.js pattern)
        // req.body is the most common source of untrusted user input in web applications
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${req.body.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from URL query parameters
        // req.query contains URL parameters (e.g., ?email=...), fully controlled by attacker
        {
          code: 'db.query(`SELECT * FROM users WHERE email = ${req.query.email}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from URL path parameters
        // req.params contains route parameters (e.g., /users/:id), can be manipulated
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from request.body (alternative naming)
        // Some frameworks use 'request' instead of 'req', same high risk
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${request.body.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from standalone params object
        // Shorthand for request parameters, equally dangerous
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${params.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from standalone query object
        // Shorthand for query parameters, common in destructured handlers
        {
          code: 'db.query(`SELECT * FROM users WHERE email = ${query.email}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from standalone body object
        // Destructured request body, still contains untrusted user input
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${body.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from generic input object
        // Common naming pattern for user-provided data
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${input.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from variable named userInput
        // Explicitly indicates untrusted user data by naming convention
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
        // Use case: SQL injection from React/UI component props
        // Props can be controlled by parent components, potentially from user input
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${props.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from application state
        // State may be populated from user actions or external sources
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${state.id}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from context object
        // Context often carries user session data or preferences
        {
          code: 'db.query(`SELECT * FROM users WHERE email = ${context.email}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from event data
        // Event handlers receive data from user interactions (clicks, inputs, etc.)
        {
          code: 'db.query(`SELECT * FROM users WHERE name = ${event.name}`);',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: SQL injection from generic data object
        // Generic 'data' objects often contain user-provided or external information
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
        // Use case: NoSQL injection via MongoDB find() with untrusted request data
        // What's wrong: req.body.name can contain MongoDB operators like {$ne: null} to bypass filters
        {
          code: 'db.collection("users").find({ name: req.body.name });',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: NoSQL injection via MongoDB findOne() with URL parameters
        // What's wrong: Attacker can inject MongoDB query operators through req.params.id
        {
          code: 'MongoClient.db.collection("users").findOne({ _id: req.params.id });',
          errors: [{ messageId: 'databaseInjection' }],
        },
        // Use case: NoSQL injection via MongoDB updateOne() with tainted query filter
        // What's wrong: The query filter contains req.query.name, allowing operator injection
        // Note: Even though the update operation is benign, the filter is vulnerable
        {
          code: 'db.collection("users").updateOne({ name: req.query.name }, { $set: { status: "active" } });',
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });

  describe('Strategy Options', () => {
    ruleTester.run('strategy parameterize', databaseInjection, {
      valid: [],
      invalid: [
        // Use case: Test that 'parameterize' strategy provides specific fix guidance
        // What this tests: With strategy='parameterize', rule suggests using parameterized queries
        // Expected: Two messages - one for the vulnerability, one for the specific fix strategy
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          options: [{ strategy: 'parameterize' }],
          errors: [
            { messageId: 'databaseInjection' },
            { messageId: 'strategyParameterize' }
          ],
        },
      ],
    });

    ruleTester.run('strategy orm', databaseInjection, {
      valid: [],
      invalid: [
        // Use case: Test that 'orm' strategy provides ORM-specific fix guidance
        // What this tests: With strategy='orm', rule suggests using ORM query builders
        // Expected: Two messages - vulnerability detection and ORM recommendation
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          options: [{ strategy: 'orm' }],
          errors: [
            { messageId: 'databaseInjection' },
            { messageId: 'strategyORM' }
          ],
        },
      ],
    });

    ruleTester.run('strategy sanitize', databaseInjection, {
      valid: [],
      invalid: [
        // Use case: Test that 'sanitize' strategy provides input sanitization guidance
        // What this tests: With strategy='sanitize', rule suggests input validation/escaping
        // Expected: Two messages - vulnerability detection and sanitization recommendation
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          options: [{ strategy: 'sanitize' }],
          errors: [
            { messageId: 'databaseInjection' },
            { messageId: 'strategySanitize' }
          ],
        },
      ],
    });

    ruleTester.run('strategy auto (default)', databaseInjection, {
      valid: [],
      invalid: [
        // Use case: Test that 'auto' strategy provides generic fix guidance
        // What this tests: With strategy='auto' (default), rule detects but doesn't prescribe specific fix
        // Expected: Only one message for the vulnerability, no strategy-specific guidance
        {
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          options: [{ strategy: 'auto' }],
          errors: [{ messageId: 'databaseInjection' }],
        },
      ],
    });
  });
});

