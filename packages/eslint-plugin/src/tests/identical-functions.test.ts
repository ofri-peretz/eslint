/**
 * Comprehensive tests for identical-functions rule
 * Duplication: Detects duplicate function implementations
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { identicalFunctions } from '../rules/duplication/identical-functions';

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

describe('identical-functions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - unique functions', identicalFunctions, {
      valid: [
        // Unique functions
        {
          code: `
            function add(a, b) { return a + b; }
            function subtract(a, b) { return a - b; }
          `,
        },
        // Functions below minimum lines
        {
          code: `
            function one() { return 1; }
            function two() { return 2; }
          `,
          options: [{ minLines: 3 }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Duplicate Functions', () => {
    ruleTester.run('invalid - identical function implementations', identicalFunctions, {
      valid: [],
      invalid: [
        {
          code: `
            function processUser(user) {
              if (!user) return null;
              return user.name.toUpperCase();
            }
            
            function processCustomer(customer) {
              if (!customer) return null;
              return customer.name.toUpperCase();
            }
          `,
          options: [{ minLines: 3, similarityThreshold: 0.8 }],
          errors: [{ messageId: 'identicalFunctions' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', identicalFunctions, {
      valid: [],
      invalid: [
        {
          code: `
            function formatA(data) {
              return data.toUpperCase();
            }
            
            function formatB(data) {
              return data.toUpperCase();
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
          errors: [
            {
              messageId: 'identicalFunctions',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', identicalFunctions, {
      valid: [
        {
          code: `
            function one() { return 1; }
            function two() { return 2; }
          `,
          options: [{ minLines: 3 }],
        },
      ],
      invalid: [
        {
          code: `
            function processA(data) {
              if (!data) return null;
              return data.value;
            }
            
            function processB(data) {
              if (!data) return null;
              return data.value;
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
          errors: [{ messageId: 'identicalFunctions' }],
        },
      ],
    });
  });
});

