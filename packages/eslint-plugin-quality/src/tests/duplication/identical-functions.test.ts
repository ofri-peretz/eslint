/**
 * Comprehensive tests for identical-functions rule
 * Duplication: Detects duplicate function implementations
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { identicalFunctions } from '../../rules/duplication/identical-functions';

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
        // Line 107: ignoreTestFiles option
        {
          code: `
            function testA() { return 1; }
            function testB() { return 1; }
          `,
          filename: '/path/to/file.test.ts',
          options: [{ ignoreTestFiles: true }],
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

  describe('Uncovered Lines', () => {
    // Lines 139, 144-176: Levenshtein distance algorithm
    // Test when str2 is longer than str1 (line 139)
    // Test different string comparisons to cover the algorithm
    ruleTester.run('line 139, 144-176 - Levenshtein distance', identicalFunctions, {
      valid: [],
      invalid: [
        {
          code: `
            function processLong(data) {
              if (!data) return null;
              return data.value.toUpperCase();
            }
            
            function processShort(x) {
              if (!x) return null;
              return x.value.toUpperCase();
            }
          `,
          options: [{ minLines: 3, similarityThreshold: 0.7 }],
          errors: [{ messageId: 'identicalFunctions' }],
        },
        {
          code: `
            function formatUser(user) {
              const name = user.name;
              const email = user.email;
              return { name, email };
            }
            
            function formatPerson(person) {
              const name = person.name;
              const email = person.email;
              return { name, email };
            }
          `,
          options: [{ minLines: 4, similarityThreshold: 0.8 }],
          errors: [{ messageId: 'identicalFunctions' }],
        },
      ],
    });

    // Line 279: Default return in suggestRefactoring
    ruleTester.run('line 279 - default refactoring suggestion', identicalFunctions, {
      valid: [],
      invalid: [
        {
          code: `
            function funcA() {
              return Math.random();
            }
            
            function funcB() {
              return Math.random();
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
          errors: [{ messageId: 'identicalFunctions' }],
        },
      ],
    });
  });
});

