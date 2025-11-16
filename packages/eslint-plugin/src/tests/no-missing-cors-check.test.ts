/**
 * Comprehensive tests for no-missing-cors-check rule
 * CWE-346: Origin Validation Error
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingCorsCheck } from '../rules/security/no-missing-cors-check';

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

describe('no-missing-cors-check', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - proper CORS validation', noMissingCorsCheck, {
      valid: [
        // CORS with origin validation
        {
          code: `
            app.use(cors({
              origin: (origin, callback) => {
                if (allowedOrigins.includes(origin)) {
                  callback(null, true);
                } else {
                  callback(new Error('Not allowed'));
                }
              }
            }));
          `,
        },
        // CORS with allowed origins array
        {
          code: 'app.use(cors({ origin: allowedOrigins }));',
        },
        // CORS with trusted library
        {
          code: 'app.use(cors({ origin: "https://example.com" }));',
        },
        // Test files (when allowInTests is true)
        {
          code: 'app.use(cors({ origin: "*" }));',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'app.use(cors({ origin: safeOrigin }));',
          options: [{ ignorePatterns: ['safeOrigin'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Wildcard Origin', () => {
    ruleTester.run('invalid - wildcard CORS origin', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'app.use(cors({ origin: "*" }));',
          errors: [
            {
              messageId: 'missingCorsCheck',
              // Note: Suggestions are provided by the rule but not recognized by test framework
              // because fix returns null (suggestions are not auto-fixable)
            },
          ],
        },
        {
          code: 'app.use(cors({ origin: "*", credentials: true }));',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - CORS Headers', () => {
    ruleTester.run('invalid - wildcard CORS header', noMissingCorsCheck, {
      valid: [],
      invalid: [
        {
          code: 'res.setHeader("Access-Control-Allow-Origin", "*");',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
        {
          code: 'res.header("Access-Control-Allow-Origin", "*");',
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: "*" }));',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'app.use(cors({ origin: "*" }));',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'missingCorsCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - ignorePatterns with invalid regex', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: testOrigin }));',
          options: [{ ignorePatterns: ['['] }], // Invalid regex should be caught
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - trustedLibraries', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(myCors({ origin: "*" }));',
          options: [{ trustedLibraries: ['myCors'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - non-wildcard literal', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: "https://example.com" }));',
        },
        {
          code: 'app.use(cors({ origin: 123 }));',
        },
        {
          code: 'app.use(cors({ origin: true }));',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - non-CORS context', noMissingCorsCheck, {
      valid: [
        {
          code: 'const config = { origin: "*" };',
        },
        {
          code: 'const data = { allowedOrigins: "*" };',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - CORS config object validation', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.use(cors({ origin: allowedOrigins, credentials: true }));',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - setHeader with non-wildcard', noMissingCorsCheck, {
      valid: [
        {
          code: 'res.setHeader("Access-Control-Allow-Origin", origin);',
        },
        {
          code: 'res.setHeader("Content-Type", "*");',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - header with non-Access-Control', noMissingCorsCheck, {
      valid: [
        {
          code: 'res.setHeader("Content-Type", "*");',
        },
        {
          code: 'res.header("Content-Type", "*");',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - callExpression without use method', noMissingCorsCheck, {
      valid: [
        {
          code: 'app.get("/api", handler);',
        },
        {
          code: 'router.post("/users", controller);',
        },
      ],
      invalid: [],
    });
  });
});

