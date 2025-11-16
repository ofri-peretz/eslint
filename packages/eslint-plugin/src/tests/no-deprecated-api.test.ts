/**
 * Comprehensive tests for no-deprecated-api rule
 * Deprecation: Detects deprecated API usage
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedApi } from '../rules/deprecation/no-deprecated-api';

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

describe('no-deprecated-api', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - non-deprecated APIs', noDeprecatedApi, {
      valid: [
        // Non-deprecated APIs
        {
          code: 'const result = fetch(url);',
        },
        {
          code: 'const data = JSON.parse(text);',
        },
        // No deprecated APIs configured
        {
          code: 'const result = oldFunction();',
          options: [{ apis: [] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Deprecated APIs', () => {
    ruleTester.run('invalid - deprecated API usage', noDeprecatedApi, {
      valid: [],
      invalid: [
        {
          code: 'const result = oldFunction();',
          options: [{ 
            apis: [{ 
              name: 'oldFunction',
              replacement: 'newFunction',
              deprecatedSince: '2024-01-01',
              reason: 'Use newFunction instead'
            }] 
          }],
          errors: [
            {
              messageId: 'deprecatedAPI',
              suggestions: [
                {
                  messageId: 'useReplacement',
                  output: 'const result = newFunction();',
                },
              ],
            },
          ],
        },
        {
          code: 'obj.deprecatedMethod();',
          options: [{ 
            apis: [{ 
              name: 'deprecatedMethod',
              replacement: 'newMethod',
              deprecatedSince: '2024-01-01',
              reason: 'Use newMethod instead'
            }] 
          }],
          errors: [
            {
              messageId: 'deprecatedAPI',
              suggestions: [
                {
                  messageId: 'useReplacement',
                  output: 'obj.newMethod();',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', noDeprecatedApi, {
      valid: [],
      invalid: [
        {
          code: 'const result = oldFunction();',
          options: [{ 
            apis: [{ 
              name: 'oldFunction',
              replacement: 'newFunction',
              deprecatedSince: '2024-01-01',
              reason: 'Use newFunction instead'
            }] 
          }],
          errors: [
            {
              messageId: 'deprecatedAPI',
              suggestions: [
                {
                  messageId: 'useReplacement',
                  output: 'const result = newFunction();',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

