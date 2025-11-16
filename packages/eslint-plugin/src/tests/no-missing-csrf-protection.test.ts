/**
 * Comprehensive tests for no-missing-csrf-protection rule
 * CWE-352: Cross-Site Request Forgery (CSRF)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingCsrfProtection } from '../rules/security/no-missing-csrf-protection';

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
});

