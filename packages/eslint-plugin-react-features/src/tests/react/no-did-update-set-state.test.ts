/**
 * Tests for no-did-update-set-state rule
 * Prevent setState in componentDidUpdate
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDidUpdateSetState } from '../../rules/react/no-did-update-set-state';

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

describe('no-did-update-set-state', () => {
  describe('Valid cases - setState with condition', () => {
    ruleTester.run('setState with condition is valid', noDidUpdateSetState, {
      valid: [
        // setState with if condition
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate(prevProps) {
                if (prevProps.id !== this.props.id) {
                  this.setState({ data: null });
                }
              }
            }
          `,
        },
        // setState in ternary (has conditional)
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate(prevProps) {
                if (prevProps.value !== this.props.value) {
                  this.setState({ changed: true });
                }
              }
            }
          `,
        },
        // No componentDidUpdate
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.setState({ mounted: true });
              }
            }
          `,
        },
        // Empty componentDidUpdate
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {}
            }
          `,
        },
        // setState in other methods
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                console.log('updated');
              }
              handleClick() {
                this.setState({ clicked: true });
              }
            }
          `,
        },
        // With allowInCallback option
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                fetchData().then(data => this.setState({ data }));
              }
            }
          `,
          options: [{ allowInCallback: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - setState without condition', () => {
    ruleTester.run('setState without condition triggers error', noDidUpdateSetState, {
      valid: [],
      invalid: [
        // Direct setState without condition
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                this.setState({ updated: true });
              }
            }
          `,
          errors: [{ messageId: 'noDidUpdateSetState' }],
        },
        // Multiple setStates without condition
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                this.setState({ a: 1 });
                this.setState({ b: 2 });
              }
            }
          `,
          errors: [
            { messageId: 'noDidUpdateSetState' },
            { messageId: 'noDidUpdateSetState' },
          ],
        },
        // setState with callback but no condition
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                this.setState({ count: this.state.count + 1 }, () => {
                  console.log('incremented');
                });
              }
            }
          `,
          errors: [{ messageId: 'noDidUpdateSetState' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', noDidUpdateSetState, {
      valid: [
        // Different method with similar name
        {
          code: `
            class MyComponent extends Component {
              customComponentDidUpdate() {
                this.setState({ custom: true });
              }
            }
          `,
        },
        // setState outside componentDidUpdate
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                this.logUpdate();
              }
              someMethod() {
                this.setState({ value: 1 });
              }
            }
          `,
        },
      ],
      invalid: [
        // setState before condition is evaluated
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                this.setState({ updating: true });
              }
            }
          `,
          errors: [{ messageId: 'noDidUpdateSetState' }],
        },
      ],
    });
  });

  describe('allowInCallback option', () => {
    ruleTester.run('allowInCallback option', noDidUpdateSetState, {
      valid: [
        // setState in callback with option enabled
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                setTimeout(() => this.setState({ delayed: true }), 100);
              }
            }
          `,
          options: [{ allowInCallback: true }],
        },
      ],
      invalid: [
        // setState in callback without option
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {
                this.setState({ immediate: true });
              }
            }
          `,
          options: [{ allowInCallback: false }],
          errors: [{ messageId: 'noDidUpdateSetState' }],
        },
      ],
    });
  });

  describe('Conditional patterns', () => {
    ruleTester.run('conditional patterns', noDidUpdateSetState, {
      valid: [
        // Simple if condition
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate(prevProps) {
                if (this.props.id !== prevProps.id) {
                  this.setState({ needsRefresh: true });
                }
              }
            }
          `,
        },
        // Nested conditions
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate(prevProps) {
                if (this.props.enabled) {
                  if (this.props.value !== prevProps.value) {
                    this.setState({ changed: true });
                  }
                }
              }
            }
          `,
        },
        // Complex condition
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate(prevProps, prevState) {
                if (this.props.a !== prevProps.a || this.state.b !== prevState.b) {
                  this.setState({ synced: false });
                }
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});

