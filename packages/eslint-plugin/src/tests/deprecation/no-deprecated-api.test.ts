/**
 * Comprehensive tests for no-deprecated-api rule
 * Deprecation: Detects deprecated API usage
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedApi } from '../../rules/deprecation/no-deprecated-api';

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

  describe('Edge Cases - Removal Dates and Urgency', () => {
    ruleTester.run('edge cases - removal dates', noDeprecatedApi, {
      valid: [],
      invalid: [
        // Test with removalDate to cover calculateDaysRemaining (lines 101-104)
        {
          code: 'const result = oldFunction();',
          options: [{ 
            apis: [{ 
              name: 'oldFunction',
              replacement: 'newFunction',
              deprecatedSince: '2024-01-01',
              removalDate: '2025-12-31',
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
        // Test with past removal date (critical urgency - line 112)
        {
          code: 'const result = expiredFunction();',
          options: [{ 
            apis: [{ 
              name: 'expiredFunction',
              replacement: 'newFunction',
              deprecatedSince: '2020-01-01',
              removalDate: '2020-12-31', // Past date
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
        // Test with removal date < 30 days (critical urgency - line 113)
        {
          code: 'const result = soonToBeRemoved();',
          options: [{ 
            apis: [{ 
              name: 'soonToBeRemoved',
              replacement: 'newFunction',
              deprecatedSince: '2024-01-01',
              removalDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
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
        // Test with removal date < warnDaysBeforeRemoval (high urgency - line 114)
        {
          code: 'const result = warningFunction();',
          options: [{ 
            warnDaysBeforeRemoval: 60,
            apis: [{ 
              name: 'warningFunction',
              replacement: 'newFunction',
              deprecatedSince: '2024-01-01',
              removalDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
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
        // Test with removal date > warnDaysBeforeRemoval (medium urgency - line 115)
        {
          code: 'const result = mediumUrgencyFunction();',
          options: [{ 
            warnDaysBeforeRemoval: 60,
            apis: [{ 
              name: 'mediumUrgencyFunction',
              replacement: 'newFunction',
              deprecatedSince: '2024-01-01',
              removalDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
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
        // Test MemberExpression with removalDate (to cover MemberExpression visitor)
        {
          code: 'obj.oldMethod();',
          options: [{ 
            apis: [{ 
              name: 'oldMethod',
              replacement: 'newMethod',
              deprecatedSince: '2024-01-01',
              removalDate: '2025-12-31',
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

  describe('Edge Cases - MemberExpression', () => {
    ruleTester.run('edge cases - non-identifier property (line 121)', noDeprecatedApi, {
      valid: [
        // Test with computed property (not Identifier) to cover line 121
        {
          code: 'obj["oldMethod"]();',
          options: [{ 
            apis: [{ 
              name: 'oldMethod',
              replacement: 'newMethod',
              deprecatedSince: '2024-01-01',
              reason: 'Use newMethod instead'
            }] 
          }],
        },
        {
          code: 'obj[propName]();',
          options: [{ 
            apis: [{ 
              name: 'oldMethod',
              replacement: 'newMethod',
              deprecatedSince: '2024-01-01',
              reason: 'Use newMethod instead'
            }] 
          }],
        },
      ],
      invalid: [],
    });
  });
});

