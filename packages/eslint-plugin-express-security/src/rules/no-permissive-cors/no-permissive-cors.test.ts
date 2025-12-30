/**
 * Tests for no-permissive-cors rule
 * Security: CWE-942 (Permissive Cross-domain Policy)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { noPermissiveCors } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-permissive-cors', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - restricted origins', noPermissiveCors, {
      valid: [
        // CORS with specific origin whitelist
        {
          code: `
            import cors from 'cors';
            app.use(cors({
              origin: ['https://example.com', 'https://app.example.com']
            }));
          `,
        },
        // CORS with single origin string
        {
          code: `
            import cors from 'cors';
            app.use(cors({
              origin: 'https://example.com'
            }));
          `,
        },
        // CORS with callback function (dynamic validation)
        {
          code: `
            import cors from 'cors';
            app.use(cors({
              origin: (origin, callback) => {
                if (allowlist.includes(origin)) {
                  callback(null, true);
                } else {
                  callback(new Error('Not allowed'));
                }
              }
            }));
          `,
        },
        // Allow origin: true with option
        {
          code: `
            import cors from 'cors';
            app.use(cors({ origin: true }));
          `,
          options: [{ allowOriginTrue: true }],
        },
        // Test file with allowInTests
        {
          code: `
            import cors from 'cors';
            app.use(cors({ origin: '*' }));
          `,
          options: [{ allowInTests: true }],
          filename: 'app.test.ts',
        },
        // Not a cors call
        {
          code: `
            import notCors from 'not-cors';
            app.use(notCors({ origin: '*' }));
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - permissive origins', noPermissiveCors, {
      valid: [],
      invalid: [
        // Wildcard origin
        {
          code: `
            import cors from 'cors';
            app.use(cors({ origin: '*' }));
          `,
          errors: [{ messageId: 'permissiveCors' }],
        },
        // origin: true (reflects request)
        {
          code: `
            import cors from 'cors';
            app.use(cors({ origin: true }));
          `,
          errors: [{ messageId: 'permissiveCors' }],
        },
        // cors() with no options
        {
          code: `
            import cors from 'cors';
            app.use(cors());
          `,
          errors: [{ messageId: 'permissiveCors' }],
        },
        // origin: true with credentials
        {
          code: `
            import cors from 'cors';
            app.use(cors({
              origin: true,
              credentials: true
            }));
          `,
          errors: [{ messageId: 'permissiveCors' }],
        },
        // Direct cors() call (not wrapped in app.use)
        {
          code: `const corsMiddleware = cors({ origin: '*' });`,
          errors: [{ messageId: 'permissiveCors' }],
        },
      ],
    });
  });
});
