/**
 * Tests for no-external-api-calls-in-utils rule
 * Detects network calls in utility functions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noExternalApiCallsInUtils } from '../rules/no-external-api-calls-in-utils';

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

describe('no-external-api-calls-in-utils', () => {
  describe('allow non-utility files', () => {
    ruleTester.run('allow network calls in services', noExternalApiCallsInUtils, {
      valid: [
        // Network calls in non-utility files are fine
        {
          code: 'fetch("/api/users");',
          filename: '/src/services/userService.ts',
        },
        {
          code: 'axios.get("/api/data");',
          filename: '/src/components/Dashboard.tsx',
        },
        // Test files are ignored by default
        {
          code: 'fetch("/api/test");',
          filename: '/src/utils/helper.test.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('flag utility files with network calls', () => {
    ruleTester.run('detect network calls in utils', noExternalApiCallsInUtils, {
      valid: [
        // Pure utility functions (no network)
        {
          code: 'function formatDate(date) { return date.toISOString(); }',
          filename: '/src/utils/dateUtils.ts',
        },
        {
          code: 'const sum = (a, b) => a + b;',
          filename: '/src/helpers/math.ts',
        },
      ],
      invalid: [
        // fetch in utils
        {
          code: 'fetch("/api/users");',
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // axios in helpers
        {
          code: 'axios.get("/api/data");',
          filename: '/src/helpers/dataHelper.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // Multiple calls
        {
          code: `
            async function getData() {
              const users = await fetch("/api/users");
              const orders = await fetch("/api/orders");
              return { users, orders };
            }
          `,
          filename: '/src/lib/dataFetcher.ts',
          errors: [
            { messageId: 'externalApiCallInUtils' },
            { messageId: 'externalApiCallInUtils' },
          ],
        },
      ],
    });
  });
});
