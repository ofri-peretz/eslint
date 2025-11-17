/**
 * Comprehensive tests for no-external-api-calls-in-utils rule
 * Architecture: Detects network calls in utility functions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noExternalApiCallsInUtils } from '../rules/architecture/no-external-api-calls-in-utils';

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
  describe('Valid Code', () => {
    ruleTester.run('valid - no network calls in utils', noExternalApiCallsInUtils, {
      valid: [
        // Not in utils directory
        {
          code: 'fetch(url);',
          filename: 'src/services/api.ts',
        },
        // Not a network call
        {
          code: 'const result = processData(data);',
          filename: 'src/utils/helpers.ts',
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'fetch(url);',
          filename: 'src/utils/helpers.test.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Network Calls in Utils', () => {
    ruleTester.run('invalid - network calls in utils', noExternalApiCallsInUtils, {
      valid: [],
      invalid: [
        {
          code: 'fetch(url);',
          filename: 'src/utils/helpers.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        {
          code: 'axios.get(url);',
          filename: 'src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        {
          code: 'http.get(url, callback);',
          filename: 'src/helpers/utils.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noExternalApiCallsInUtils, {
      valid: [
        {
          code: 'fetch(url);',
          filename: 'src/utils/helpers.test.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'fetch(url);',
          filename: 'src/utils/helpers.test.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
      ],
    });

    ruleTester.run('options - utilityPatterns', noExternalApiCallsInUtils, {
      valid: [
        {
          code: 'fetch(url);',
          filename: 'src/services/api.ts',
          options: [{ utilityPatterns: ['**/utils/**'] }], // Not matching pattern
        },
      ],
      invalid: [
        {
          code: 'fetch(url);',
          filename: 'src/utils/api.ts',
          options: [{ utilityPatterns: ['**/utils/**'] }],
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
      ],
    });
  });
});

