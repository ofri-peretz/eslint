/**
 * Tests for no-access-state-in-setstate rule
 * Disallow accessing this.state inside setState calls
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAccessStateInSetState } from '../rules/react/no-access-state-in-setstate';

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

describe('no-access-state-in-setstate', () => {
  describe('Basic Functionality', () => {
    ruleTester.run('no-access-state-in-setstate validation', noAccessStateInSetState, {
      valid: [
        // setState without accessing this.state
        {
          code: 'this.setState({ count: 1 })',
        },
        {
          code: 'this.setState({ loaded: true })',
        },
        // setState with function (callback pattern)
        {
          code: 'this.setState(prevState => ({ count: prevState.count + 1 }))',
        },
        {
          code: 'this.setState((prevState, props) => ({ count: prevState.count + props.step }))',
        },
        // Not setState calls
        {
          code: 'this.setTimeout()',
        },
        {
          code: 'this.setData()',
        },
        // Functional components (no this.state)
        {
          code: `
            import { useState } from 'react';
            function MyComponent() {
              const [count, setCount] = useState(0);
              return <div>{count}</div>;
            }
          `,
        },
      ],
      invalid: [
        // Accessing this.state directly in setState
        {
          code: 'this.setState({ count: this.state.count + 1 })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // Accessing nested state properties
        {
          code: 'this.setState({ user: { ...this.state.user, name: "John" } })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // Accessing state in complex expressions
        {
          code: 'this.setState({ total: this.state.count * 2 })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // Multiple accesses in one setState
        {
          code: 'this.setState({ count: this.state.count + 1, name: this.state.user.name })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // Accessing state in template literals
        {
          code: 'this.setState({ message: `Count: ${this.state.count}` })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // Accessing state in function calls within setState
        {
          code: 'this.setState({ doubled: Math.max(this.state.count, 0) * 2 })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
      ],
    });
  });

  describe('Complex State Access Patterns', () => {
    ruleTester.run('complex state access patterns', noAccessStateInSetState, {
      valid: [
        // Function form accessing previous state (correct pattern)
        {
          code: 'this.setState(prevState => ({ count: prevState.count + 1 }))',
        },
        // Accessing props instead of state
        {
          code: 'this.setState({ count: this.props.initialCount })',
        },
        // Local variables
        {
          code: `
            const newCount = 5;
            this.setState({ count: newCount });
          `,
        },
      ],
      invalid: [
        // State access in computed property names
        {
          code: 'this.setState({ [this.state.key]: "value" })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // State access in spread operator
        {
          code: 'this.setState({ ...this.state, updated: true })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // State access in array methods
        {
          code: 'this.setState({ filtered: this.state.items.filter(item => item.active) })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // Deep state access
        {
          code: 'this.setState({ name: this.state.user.profile.name })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noAccessStateInSetState, {
      valid: [
        // setState with just props
        {
          code: 'this.setState({ theme: this.props.theme })',
        },
        // setState with external data
        {
          code: 'this.setState({ data: apiResponse })',
        },
      ],
      invalid: [
        // State access in conditional expressions
        {
          code: 'this.setState({ count: this.state.count > 0 ? this.state.count : 1 })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // State access in logical expressions
        {
          code: 'this.setState({ valid: this.state.count && this.state.count > 0 })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // State access in arithmetic operations
        {
          code: 'this.setState({ sum: this.state.a + this.state.b })',
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
      ],
    });
  });

  describe('Real World Examples', () => {
    ruleTester.run('real world examples', noAccessStateInSetState, {
      valid: [
        // Correct functional setState
        {
          code: `
            class Counter extends React.Component {
              handleIncrement = () => {
                this.setState(prevState => ({
                  count: prevState.count + 1
                }));
              }
            }
          `,
        },
      ],
      invalid: [
        // Common anti-pattern in lifecycle methods
        {
          code: `
            class MyComponent extends React.Component {
              componentDidMount() {
                this.setState({
                  isLoaded: !this.state.isLoading
                });
              }
            }
          `,
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // Multiple state dependencies (incorrect)
        {
          code: `
            class Form extends React.Component {
              handleSubmit = () => {
                this.setState({
                  isSubmitting: true,
                  error: this.state.hasError ? 'Already has error' : null
                });
              }
            }
          `,
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
        // State calculation based on current state (incorrect)
        {
          code: `
            class Calculator extends React.Component {
              calculateTotal = () => {
                this.setState({
                  total: this.state.price * this.state.quantity
                });
              }
            }
          `,
          errors: [
            {
              messageId: 'noAccessStateInSetState',
            },
          ],
        },
      ],
    });
  });
});
