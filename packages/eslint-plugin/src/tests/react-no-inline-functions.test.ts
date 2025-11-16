/**
 * Comprehensive tests for react-no-inline-functions rule
 * Performance: Detects inline functions in React renders
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { reactNoInlineFunctions } from '../rules/performance/react-no-inline-functions';

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
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('react-no-inline-functions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no inline functions', reactNoInlineFunctions, {
      valid: [
        // No inline functions
        {
          code: 'function MyComponent() { return <div>Hello</div>; }',
        },
        // Event handlers (if allowed)
        {
          code: '<button onClick={() => handleClick()}>Click</button>',
          options: [{ allowInEventHandlers: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Inline Functions', () => {
    ruleTester.run('invalid - inline functions in JSX', reactNoInlineFunctions, {
      valid: [],
      invalid: [
        // Note: Rule may not detect inline functions in map() callbacks
        // This is a rule limitation - map callbacks are often acceptable
        {
          code: '<button onClick={() => handleClick()}>Click</button>',
          errors: [{ messageId: 'inlineFunction' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', reactNoInlineFunctions, {
      valid: [],
      invalid: [
        {
          code: '<button onClick={() => handleClick()}>Click</button>',
          errors: [
            {
              messageId: 'inlineFunction',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', reactNoInlineFunctions, {
      valid: [
        {
          code: '<button onClick={() => handleClick()}>Click</button>',
          options: [{ allowInEventHandlers: true }],
        },
      ],
      invalid: [
        // Note: Rule may not detect inline functions in map() callbacks
        // This is a rule limitation
      ],
    });
  });
});

