/**
 * Comprehensive tests for no-lonely-if rule
 * Prevent lone if statements inside else blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLonelyIf } from '../../rules/maintainability/no-lonely-if';

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
          name: 'an if with no else',
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

        // burgee sweep 2026-09-10, from packages/burgee/src/yargs/usage.ts:86-103,
        // where a four-statement `else` had three of its `if`s reported. An `if`
        // that shares its else block with sibling statements is not lonely: it
        // cannot become `else if` without stranding the siblings, so the rule's
        // own advice ("Replace with else if") is unfollowable there. ESLint core
        // and unicorn both gate on the else block holding exactly one statement.
        {
          name: 'an if that is the last of two statements in the else block is not lonely',
          code: 'if (p) { g(); } else { g(); if (q) { h(); } }',
        },
        {
          name: 'an if that is the first of two statements in the else block is not lonely',
          code: 'if (p) { g(); } else { if (q) { h(); } g(); }',
        },
      ],
      invalid: [
        // Lonely if in else block
        {
          name: 'an else whose only content is an if',
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

  describe('allow option', () => {
    ruleTester.run('allow option suppresses in matching context', noLonelyIf, {
      valid: [
        // Lonely if is allowed when code matches allow pattern
        {
          code: 'if (condition1) { doSomething(); } else { if (condition2) { doSomethingElse(); } }',
          options: [{ allow: ['doSomething'] }],
        },
      ],
      invalid: [
        // Lonely if is NOT allowed when code doesn't match allow pattern
        {
          code: 'if (a) { x(); } else { if (b) { y(); } }',
          options: [{ allow: ['notInCode'] }],
          errors: [{ messageId: 'noLonelyIf' }],
        },
      ],
    });
  });

  // Note: The 'allow' option has a bug in isInAllowedContext where 'context' variable
  // shadows the outer context - not testing this feature
});
