/**
 * Tests for jsx-no-literals rule
 * Prevent string literals in JSX
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxNoLiterals } from '../rules/react/jsx-no-literals';

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

describe('jsx-no-literals', () => {
  describe('Valid cases - no string literals', () => {
    ruleTester.run('no string literals is valid', jsxNoLiterals, {
      valid: [
        // Variable reference
        {
          code: `<div>{message}</div>`,
        },
        // Translation function
        {
          code: `<div>{t('greeting')}</div>`,
        },
        // Empty element
        {
          code: `<div />`,
        },
        // Only whitespace
        {
          code: `<div>   </div>`,
        },
        // Number
        {
          code: `<div>{42}</div>`,
        },
        // Boolean
        {
          code: `<div>{isActive}</div>`,
        },
        // Expression
        {
          code: `<div>{count + 1}</div>`,
        },
        // Template literal
        {
          code: '<div>{`Hello ${name}`}</div>',
        },
        // Allowed strings
        {
          code: `<div>Hello</div>`,
          options: [{ allowedStrings: ['Hello'] }],
        },
        // noStrings disabled
        {
          code: `<div>Hello World</div>`,
          options: [{ noStrings: false }],
        },
        // Props are ignored by default
        {
          code: `<div className="container">Test</div>`,
          options: [{ noStrings: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - string literals in JSX', () => {
    ruleTester.run('string literals trigger error', jsxNoLiterals, {
      valid: [],
      invalid: [
        // Simple string
        {
          code: `<div>Hello World</div>`,
          errors: [{ messageId: 'jsxNoLiterals' }],
        },
        // Multiple strings
        {
          code: `
            <div>
              <span>First</span>
              <span>Second</span>
            </div>
          `,
          errors: [
            { messageId: 'jsxNoLiterals' },
            { messageId: 'jsxNoLiterals' },
          ],
        },
        // Nested string
        {
          code: `
            <div>
              <section>
                <p>Nested content</p>
              </section>
            </div>
          `,
          errors: [{ messageId: 'jsxNoLiterals' }],
        },
        // String not in allowed list
        {
          code: `<div>Not allowed</div>`,
          options: [{ allowedStrings: ['Hello'] }],
          errors: [{ messageId: 'jsxNoLiterals' }],
        },
      ],
    });
  });

  describe('Props with ignoreProps option', () => {
    ruleTester.run('props with ignoreProps', jsxNoLiterals, {
      valid: [
        // ignoreProps true (default)
        {
          code: `<div className="container">{content}</div>`,
        },
        // ignoreProps true explicit
        {
          code: `<input placeholder="Enter text" />`,
          options: [{ ignoreProps: true }],
        },
      ],
      invalid: [
        // ignoreProps false
        {
          code: `<div className="container">{content}</div>`,
          options: [{ ignoreProps: false }],
          errors: [{ messageId: 'jsxNoLiterals' }],
        },
        // Multiple props with ignoreProps false
        {
          code: `<input className="input" placeholder="Enter text" />`,
          options: [{ ignoreProps: false }],
          errors: [
            { messageId: 'jsxNoLiterals' },
            { messageId: 'jsxNoLiterals' },
          ],
        },
      ],
    });
  });

  describe('Allowed strings option', () => {
    ruleTester.run('allowed strings', jsxNoLiterals, {
      valid: [
        // Single allowed string
        {
          code: `<div>OK</div>`,
          options: [{ allowedStrings: ['OK'] }],
        },
        // Multiple allowed strings
        {
          code: `
            <div>
              <span>Yes</span>
              <span>No</span>
            </div>
          `,
          options: [{ allowedStrings: ['Yes', 'No'] }],
        },
      ],
      invalid: [
        // Mix of allowed and not allowed
        {
          code: `
            <div>
              <span>OK</span>
              <span>Cancel</span>
            </div>
          `,
          options: [{ allowedStrings: ['OK'] }],
          errors: [{ messageId: 'jsxNoLiterals' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', jsxNoLiterals, {
      valid: [
        // Empty string
        {
          code: `<div></div>`,
        },
        // Expression only
        {
          code: `<div>{variable}</div>`,
        },
        // Component
        {
          code: `<CustomComponent />`,
        },
        // Fragment
        {
          code: `<>{content}</>`,
        },
      ],
      invalid: [
        // String in component
        {
          code: `<CustomButton>Click me</CustomButton>`,
          errors: [{ messageId: 'jsxNoLiterals' }],
        },
        // String in fragment
        {
          code: `<>Hello</>`,
          errors: [{ messageId: 'jsxNoLiterals' }],
        },
      ],
    });
  });
});

