/**
 * Tests for no-this-in-sfc rule
 * Disallow this from being used in stateless functional components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noThisInSfc } from '../rules/react/no-this-in-sfc';

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

describe('no-this-in-sfc', () => {
  describe('Basic Functionality', () => {
    ruleTester.run('no-this-in-sfc validation', noThisInSfc, {
      valid: [
        // Class components - this is allowed
        {
          code: `
            class MyComponent extends React.Component {
              render() {
                return <div>{this.props.value}</div>;
              }
            }
          `,
        },
        {
          code: `
            class Component {
              method() {
                return this.value;
              }
            }
          `,
        },
        // Class expressions
        {
          code: `
            const MyComponent = class extends React.Component {
              render() {
                return this.props.value;
              }
            };
          `,
        },
      ],
      invalid: [
        // this in regular functions (not in classes)
        {
          code: 'function notAComponent() { return this.value; }',
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
        // this in arrow functions
        {
          code: 'const myFunc = () => this.value;',
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
        // this in object methods (not classes)
        {
          code: `
            const obj = {
              method: function() {
                return this.value;
              }
            };
          `,
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
        // Multiple this usages
        {
          code: `
            function helper() {
              const value = this.something;
              return this.other;
            }
          `,
          errors: [
            {
              messageId: 'noThisInSfc',
            },
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
        // this in functional components (should use hooks instead)
        {
          code: `
            function MyComponent() {
              return <div>{this.props.value}</div>;
            }
          `,
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
        {
          code: `
            const MyComponent = () => {
              return <div>{this.state.value}</div>;
            };
          `,
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noThisInSfc, {
      valid: [
        // Empty classes
        {
          code: 'class Empty {}',
        },
        // Class with only static methods
        {
          code: `
            class Utils {
              static helper() {
                return 'no this used';
              }
            }
          `,
        },
      ],
      invalid: [
        // Mixed class and non-class code
        {
          code: `
            class MyComponent extends React.Component {
              render() {
                return this.props.value; // OK
              }
            }

            function helper() {
              return this.value; // NOT OK
            }
          `,
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
      ],
    });
  });
});
