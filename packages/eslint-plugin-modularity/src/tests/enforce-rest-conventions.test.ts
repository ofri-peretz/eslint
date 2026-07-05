/**
 * Tests for enforce-rest-conventions rule
 * Validates REST endpoint design against best practices
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceRestConventions } from '../rules/enforce-rest-conventions';

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

describe('enforce-rest-conventions', () => {
  describe('valid REST patterns', () => {
    ruleTester.run('allow proper REST patterns', enforceRestConventions, {
      valid: [
        // Proper plural resource naming
        { code: 'app.get("/users", handler);' },
        { code: 'app.post("/orders", handler);' },
        { code: 'app.put("/products/:id", handler);' },
        { code: 'router.delete("/items/:id", handler);' },
        // With ID parameter
        { code: 'app.get("/users/:id", handler);' },
        // Short resource names are allowed
        { code: 'app.get("/api", handler);' },
        // Non-route calls
        { code: 'console.log("hello");' },
        { code: 'Math.get();' },
      ],
      invalid: [
        // Singular resource naming
        {
          code: 'app.get("/user", handler);',
          errors: [{ messageId: 'restConventionViolation' }],
        },
        {
          code: 'app.post("/order", handler);',
          errors: [{ messageId: 'restConventionViolation' }],
        },
        {
          code: 'router.get("/product", handler);',
          errors: [{ messageId: 'restConventionViolation' }],
        },
      ],
    });
  });

  describe('configuration options', () => {
    ruleTester.run('respect option flags', enforceRestConventions, {
      valid: [
        // When resource naming check is disabled, singular is allowed
        {
          code: 'app.get("/user", handler);',
          options: [{ checkResourceNaming: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('callee and argument shapes (coverage edges)', () => {
    ruleTester.run('non-member callees, computed properties, non-path args', enforceRestConventions, {
      valid: [
        // Plain identifier call: callee is not a MemberExpression at all
        { code: 'doWork();' },
        // Computed member access: property is not an Identifier
        { code: "app['get']('/user', handler);" },
        // First argument is not a string literal
        { code: 'app.get(handler);' },
        // Path does not start with a slash
        { code: "app.get('user', handler);" },
        // Root path with length 1
        { code: "app.get('/', handler);" },
        // res.status(...) enters the status-code branch (currently informational only)
        { code: 'res.status(200);' },
        // checkStatusCodes disabled short-circuits the status branch
        {
          code: 'res.status(999);',
          options: [{ checkStatusCodes: false }],
        },
      ],
      invalid: [],
    });
  });
});
