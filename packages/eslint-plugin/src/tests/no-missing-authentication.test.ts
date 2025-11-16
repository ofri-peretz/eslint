/**
 * Comprehensive tests for no-missing-authentication rule
 * CWE-287: Improper Authentication
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingAuthentication } from '../rules/security/no-missing-authentication';

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
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-missing-authentication', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - routes with authentication', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", authenticate(), (req, res) => {});',
        },
        {
          code: 'app.post("/api/users", auth, (req, res) => {});',
        },
        {
          code: 'app.put("/api/users", requireAuth, isAuthenticated, (req, res) => {});',
        },
        {
          code: 'router.get("/api/users", verifyToken(), (req, res) => {});',
        },
        {
          code: 'app.use("/api", authenticate());',
        },
        // Test files (when allowInTests is true)
        {
          code: 'app.get("/api/users", (req, res) => {});',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ ignorePatterns: ['/api/users'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Authentication', () => {
    ruleTester.run('invalid - routes without authentication', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'app.post("/api/users", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'router.put("/api/users/:id", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'app.delete("/api/users/:id", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - authMiddlewarePatterns', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", myCustomAuth(), (req, res) => {});',
          options: [{ authMiddlewarePatterns: ['myCustomAuth'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - routeHandlerPatterns', noMissingAuthentication, {
      valid: [
        {
          code: 'app.custom("/api/users", (req, res) => {});',
          options: [{ routeHandlerPatterns: ['get', 'post'] }],
        },
      ],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ routeHandlerPatterns: ['get', 'post'] }],
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - ignorePatterns', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ ignorePatterns: ['/api/users'] }],
        },
      ],
      invalid: [
        {
          code: 'app.get("/api/posts", (req, res) => {});',
          options: [{ ignorePatterns: ['/api/users'] }],
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - invalid regex in ignorePatterns', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ ignorePatterns: ['['] }], // Invalid regex - should not match
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - Identifier auth middleware', noMissingAuthentication, {
      valid: [
        {
          code: 'const handler = (req, res) => {}; app.get("/api/users", authenticate(), handler);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - app.all with auth', noMissingAuthentication, {
      valid: [
        {
          code: 'app.all("/api", authenticate(), (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - CallExpression auth middleware', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", authenticate(), (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - handler inside auth context', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'const handler = (req, res) => {}; app.use("/api", authenticate()); app.get("/api/users", handler);',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - route path extraction', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'const path = "/api/users"; app.get(path, (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - continue break logic', noMissingAuthentication, {
      valid: [
        {
          code: 'const handler = authenticate(); app.get("/api/users", handler, (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - Identifier auth variable', noMissingAuthentication, {
      valid: [
        {
          code: 'const auth = authenticate(); app.get("/api/users", auth, (req, res) => {});',
        },
      ],
      invalid: [],
    });
  });
});

