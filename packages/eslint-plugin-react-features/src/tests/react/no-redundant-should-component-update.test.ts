/**
 * Tests for no-redundant-should-component-update rule
 * Prevent redundant shouldComponentUpdate
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRedundantShouldComponentUpdate } from '../../rules/react/no-redundant-should-component-update';

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

describe('no-redundant-should-component-update', () => {
  describe('Valid cases - useful shouldComponentUpdate', () => {
    ruleTester.run('useful shouldComponentUpdate is valid', noRedundantShouldComponentUpdate, {
      valid: [
        // Comparison logic
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate(nextProps) {
                return nextProps.value !== this.props.value;
              }
            }
          `,
        },
        // Multiple conditions
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate(nextProps, nextState) {
                return nextProps.id !== this.props.id || nextState.count !== this.state.count;
              }
            }
          `,
        },
        // Complex logic
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate(nextProps) {
                if (this.props.disabled) {
                  return false;
                }
                return nextProps.items.length !== this.props.items.length;
              }
            }
          `,
        },
        // Returns false
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate() {
                return false;
              }
            }
          `,
        },
        // Returns variable
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate(nextProps) {
                const shouldUpdate = nextProps.value !== this.props.value;
                return shouldUpdate;
              }
            }
          `,
        },
        // Multiple statements before return true
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate(nextProps) {
                console.log('checking update');
                return true;
              }
            }
          `,
        },
        // Empty method
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate() {}
            }
          `,
        },
        // No shouldComponentUpdate
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Different method name
        {
          code: `
            class MyComponent extends Component {
              customShouldUpdate() {
                return true;
              }
            }
          `,
        },
        // Not a class method
        {
          code: `
            function shouldComponentUpdate() {
              return true;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - redundant shouldComponentUpdate', () => {
    ruleTester.run('redundant shouldComponentUpdate triggers error', noRedundantShouldComponentUpdate, {
      valid: [],
      invalid: [
        // Just returns true
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate() {
                return true;
              }
            }
          `,
          errors: [{ messageId: 'noRedundantShouldComponentUpdate' }],
        },
        // Returns true with params
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate(nextProps, nextState) {
                return true;
              }
            }
          `,
          errors: [{ messageId: 'noRedundantShouldComponentUpdate' }],
        },
        // In PureComponent (even more redundant)
        {
          code: `
            class MyComponent extends PureComponent {
              shouldComponentUpdate() {
                return true;
              }
            }
          `,
          errors: [{ messageId: 'noRedundantShouldComponentUpdate' }],
        },
        // In React.PureComponent
        {
          code: `
            class MyComponent extends React.PureComponent {
              shouldComponentUpdate() {
                return true;
              }
            }
          `,
          errors: [{ messageId: 'noRedundantShouldComponentUpdate' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', noRedundantShouldComponentUpdate, {
      valid: [
        // Arrow function body (not FunctionExpression)
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate = () => true;
            }
          `,
        },
        // Getter
        {
          code: `
            class MyComponent extends Component {
              get shouldComponentUpdate() {
                return () => true;
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});

