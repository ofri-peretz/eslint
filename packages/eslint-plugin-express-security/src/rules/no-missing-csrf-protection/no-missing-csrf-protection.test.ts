/**
 * Comprehensive tests for no-missing-csrf-protection rule
 * CWE-352: Cross-Site Request Forgery (CSRF)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingCsrfProtection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-missing-csrf-protection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - CSRF protection present', noMissingCsrfProtection, {
      valid: [
        // CSRF middleware in route chain
        {
          code: 'app.post("/api/users", csrf(), handler);',
        },
        {
          code: 'router.put("/api/users/:id", csrf(), handler);',
        },
        {
          code: 'app.delete("/api/users/:id", csrf(), handler);',
        },
        // CSRF middleware globally
        {
          code: 'app.use(csrf());',
        },
        {
          code: 'app.get("/api/users", handler);', // GET doesn't require CSRF
        },
        // Test files (when allowInTests is true)
        {
          code: 'app.post("/test", handler);',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing CSRF', () => {
    ruleTester.run('invalid - POST without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          code: 'app.post("/api/users", handler);',
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'POST route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.post("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: 'app.post("/api/users", csrf(), handler);',
                },
              ],
            },
          ],
        },
        {
          code: 'router.post("/api/users", (req, res) => {});',
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'POST route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.post("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: 'router.post("/api/users", csrf(), (req, res) => {});',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - PUT without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          code: 'app.put("/api/users/:id", handler);',
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'PUT route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.put("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: 'app.put("/api/users/:id", csrf(), handler);',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - DELETE without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          code: 'app.delete("/api/users/:id", handler);',
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'DELETE route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.delete("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: 'app.delete("/api/users/:id", csrf(), handler);',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - PATCH without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          code: 'app.patch("/api/users/:id", handler);',
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'PATCH route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.patch("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: 'app.patch("/api/users/:id", csrf(), handler);',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignorePatterns', noMissingCsrfProtection, {
      valid: [
        // Valid ignorePattern - pattern must match the call text
        {
          code: 'app.post("/api/internal", handler);',
          options: [{ ignorePatterns: ['api/internal'] }],
        },
        // Invalid regex pattern fallback to string includes - the text must contain the pattern
        {
          code: 'app.post("/api/internal", handler);',
          options: [{ ignorePatterns: ['internal'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - custom CSRF patterns', noMissingCsrfProtection, {
      valid: [
        {
          code: 'app.post("/api/users", customCsrf(), handler);',
          options: [{ csrfMiddlewarePatterns: ['customCsrf'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - custom protected methods', noMissingCsrfProtection, {
      valid: [
        {
          code: 'app.options("/api/users", handler);', // OPTIONS not protected by default
        },
      ],
      invalid: [
        {
          code: 'app.options("/api/users", handler);',
          options: [{ protectedMethods: ['options'] }],
          errors: [{ 
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: 'app.options("/api/users", csrf(), handler);' }],
          }],
        },
      ],
    });
  });
});


// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('no-missing-csrf-protection (coverage wave)', noMissingCsrfProtection, {
  valid: [
    // fewer than two arguments — not a route registration
    { code: `app.post('/incomplete');` },
    // invalid regex ignore pattern falls back to substring matching (matches '(')
    { code: `app.post('/a', handler);`, options: [{ ignorePatterns: ['('] }] },
    // custom csrfMiddlewarePatterns recognized in the chain
    {
      code: `app.post('/x', mycsrfCheck, handler);`,
      options: [{ csrfMiddlewarePatterns: ['mycsrf'] }],
    },
    // custom protectedMethods — GET not protected
    { code: `app.get('/read', handler);`, options: [{ protectedMethods: ['post'] }] },
  ],
  invalid: [
    // invalid regex ignore pattern that does not match as a substring either
    {
      code: `app.post('/b', handler);`,
      options: [{ ignorePatterns: ['[zz'] }],
      errors: [
        {
          messageId: 'missingCsrfProtection',
          suggestions: [
            {
              messageId: 'addCsrfValidation',
              output: `app.post('/b', csrf(), handler);`,
            },
          ],
        },
      ],
    },
    // suggestion inserts csrf() after the path argument
    {
      code: `app.post('/transfer', handler);`,
      errors: [
        {
          messageId: 'missingCsrfProtection',
          suggestions: [
            {
              messageId: 'addCsrfValidation',
              output: `app.post('/transfer', csrf(), handler);`,
            },
          ],
        },
      ],
    },
  ],
});
