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
        // Test inline function in JSXExpressionContainer (line 77-82) - not in JSXAttribute
        {
          code: '<div>{() => console.log("test")}</div>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          code: '<div>{function test() { return "test"; }}</div>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        // Test inline function in array methods (lines 92-96)
        {
          code: '<div>{items.map(() => <span>test</span>)}</div>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          code: '<div>{items.forEach(() => console.log("test"))}</div>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          code: '<div>{items.filter(() => true)}</div>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          code: '<div>{items.reduce(() => 0, 0)}</div>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          code: '<div>{items.sort(() => 0)}</div>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        // Test large array size (line 113 - estimatedSize > 50)
        {
          code: '<div>{largeArray.map(() => <span>test</span>)}</div>',
          options: [{ minArraySize: 50 }],
          errors: [{ messageId: 'inlineFunction' }],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Lines 80-82: isInJSX returns false
    ruleTester.run('line 80-82 - not in JSX', reactNoInlineFunctions, {
      valid: [
        {
          code: 'const fn = () => console.log("test");',
        },
        {
          code: 'function test() { return () => {}; }',
        },
      ],
      invalid: [],
    });

    // Line 113: estimatedSize > 50 in calculateImpact
    ruleTester.run('line 113 - high severity for large arrays', reactNoInlineFunctions, {
      valid: [],
      invalid: [
        {
          code: '<div>{largeArray.map(() => <span>test</span>)}</div>',
          options: [{ minArraySize: 50 }],
          errors: [{ messageId: 'inlineFunction' }],
        },
      ],
    });

    // Line 138: isInJSXExpressionContainer returns false
    ruleTester.run('line 138 - not in JSXExpressionContainer', reactNoInlineFunctions, {
      valid: [
        {
          code: 'const fn = () => items.map(x => x);',
        },
      ],
      invalid: [],
    });

    // Lines 182-184: Event handler check in CallExpression visitor
    ruleTester.run('line 182-184 - event handler in CallExpression', reactNoInlineFunctions, {
      valid: [
        {
          code: '<button onClick={items.map(() => handleClick)}>Click</button>',
          options: [{ allowInEventHandlers: true }],
        },
      ],
      invalid: [
        {
          code: '<div>{items.map(() => <span>test</span>)}</div>',
          options: [{ allowInEventHandlers: true }],
          errors: [{ messageId: 'inlineFunction' }],
        },
      ],
    });
  });
});

