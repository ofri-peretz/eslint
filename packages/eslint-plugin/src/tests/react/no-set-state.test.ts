/**
 * Tests for no-set-state rule
 * Disallow usage of setState to encourage functional components with hooks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSetState } from '../../rules/react/no-set-state';

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

describe('no-set-state', () => {
  describe('Basic Functionality', () => {
    ruleTester.run('no-set-state validation', noSetState, {
      valid: [
        // Not setState calls
        {
          code: 'this.setTimeout()',
        },
        {
          code: 'component.setData()',
        },
        {
          code: 'this.setState = function() {}',
        },
        // Functional components with useState (allowed)
        {
          code: `
            import { useState } from 'react';
            function MyComponent() {
              const [state, setState] = useState();
              return <div>{state}</div>;
            }
          `,
        },
      ],
      invalid: [
        // Direct setState calls
        {
          code: 'this.setState({ count: 1 })',
          errors: [
            {
              messageId: 'noSetState',
              data: {
                methodName: 'setState',
                suggestion: 'Use useState hook in functional component',
              },
            },
          ],
        },
        {
          code: `
            class MyComponent extends React.Component {
              handleClick() {
                this.setState({ count: this.state.count + 1 });
              }
            }
          `,
          errors: [
            {
              messageId: 'noSetState',
            },
          ],
        },
        {
          code: `
            class Component {
              componentDidMount() {
                this.setState({ loaded: true });
              }
            }
          `,
          errors: [
            {
              messageId: 'noSetState',
            },
          ],
        },
        // setState with callback
        {
          code: 'this.setState({ data }, callback)',
          errors: [
            {
              messageId: 'noSetState',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noSetState, {
      valid: [
        // Shadowing setState is allowed (variable/function names)
        {
          code: 'const setState = () => {}; setState()',
        },
        {
          code: 'function setState() {}; setState()',
        },
      ],
      invalid: [
        // Even with different variable names, member access to setState is flagged
        {
          code: 'const component = this; component.setState({})',
          errors: [
            {
              messageId: 'noSetState',
            },
          ],
        },
      ],
    });
  });
});
