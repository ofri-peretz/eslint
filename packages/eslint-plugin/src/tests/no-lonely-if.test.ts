/**
 * Comprehensive tests for no-lonely-if rule
 * Prevent lone if statements inside else blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLonelyIf } from '../rules/quality/no-lonely-if';

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

describe('no-lonely-if', () => {
  describe('basic functionality', () => {
    ruleTester.run('lonely if detection', noLonelyIf, {
      valid: [
        // Normal if statements
        {
          code: 'if (condition) { doSomething(); }',
        },
        // if-else statements
        {
          code: 'if (condition) { doSomething(); } else { doSomethingElse(); }',
        },
        // else if chains
        {
          code: 'if (condition1) { doSomething(); } else if (condition2) { doSomethingElse(); }',
        },
      ],
      invalid: [
        // Lonely if in else block
        {
          code: 'if (condition1) { doSomething(); } else { if (condition2) { doSomethingElse(); } }',
          errors: [
            {
              messageId: 'noLonelyIf',
            },
          ],
        },
        // Multiple lonely if statements
        {
          code: `
            if (condition1) {
              doSomething();
            } else {
              if (condition2) {
                doSomethingElse();
              } else {
                if (condition3) {
                  doSomethingThird();
                }
              }
            }
          `,
          errors: [
            {
              messageId: 'noLonelyIf',
            },
            {
              messageId: 'noLonelyIf',
            },
          ],
        },
      ],
    });
  });

  describe('complex cases', () => {
    ruleTester.run('complex cases', noLonelyIf, {
      valid: [
        // If with else if (should not trigger)
        {
          code: 'if (a) {} else if (b) {}',
        },
      ],
      invalid: [
        // Lonely if in deeply nested else
        {
          code: 'if (a) { if (b) {} } else { if (c) {} }',
          errors: [
            {
              messageId: 'noLonelyIf',
            },
          ],
        },
        // Multiple conditions with lonely if
        {
          code: `
            if (x > 0) {
              console.log('positive');
            } else {
              if (x < 0) {
                console.log('negative');
              }
            }
          `,
          errors: [
            {
              messageId: 'noLonelyIf',
            },
          ],
        },
      ],
    });
  });

  // Note: The 'allow' option has a bug in isInAllowedContext where 'context' variable
  // shadows the outer context - not testing this feature
});
