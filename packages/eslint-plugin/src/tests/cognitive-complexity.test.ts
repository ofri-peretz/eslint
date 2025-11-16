/**
 * Comprehensive tests for cognitive-complexity rule
 * Complexity: Detects high cognitive complexity
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { cognitiveComplexity } from '../rules/complexity/cognitive-complexity';

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

describe('cognitive-complexity', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - low complexity functions', cognitiveComplexity, {
      valid: [
        // Simple function
        {
          code: 'function simple() { return true; }',
        },
        {
          code: 'function add(a, b) { return a + b; }',
        },
        // Function with complexity below threshold
        {
          code: `
            function process(data) {
              if (data) {
                return data.value;
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 15 }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - High Complexity', () => {
    ruleTester.run('invalid - high cognitive complexity', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function complex(data) {
              if (data) {
                if (data.value) {
                  if (data.value.length > 0) {
                    for (let i = 0; i < data.value.length; i++) {
                      if (data.value[i] > 10) {
                        if (data.value[i] < 100) {
                          return data.value[i];
                        }
                      }
                    }
                  }
                }
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 5 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', cognitiveComplexity, {
      valid: [],
      invalid: [
        {
          code: `
            function complex(data) {
              if (data && data.value && data.value.length > 0) {
                return data.value[0];
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [
            {
              messageId: 'highCognitiveComplexity',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', cognitiveComplexity, {
      valid: [
        {
          code: `
            function process(data) {
              if (data) {
                if (data.value) {
                  return data.value;
                }
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 10 }],
        },
      ],
      invalid: [
        {
          code: `
            function process(data) {
              if (data) {
                if (data.value) {
                  return data.value;
                }
              }
              return null;
            }
          `,
          options: [{ maxComplexity: 2 }],
          errors: [{ messageId: 'highCognitiveComplexity' }],
        },
      ],
    });
  });
});

