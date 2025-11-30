/**
 * Tests for no-did-mount-set-state rule
 * Prevent setState in componentDidMount
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDidMountSetState } from '../rules/react/no-did-mount-set-state';

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

describe('no-did-mount-set-state', () => {
  describe('Valid cases - no setState in componentDidMount', () => {
    ruleTester.run('no setState in componentDidMount is valid', noDidMountSetState, {
      valid: [
        // setState in other methods
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                console.log('mounted');
              }
              handleClick() {
                this.setState({ clicked: true });
              }
            }
          `,
        },
        // setState in componentDidUpdate
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                fetchData();
              }
              componentDidUpdate() {
                this.setState({ updated: true });
              }
            }
          `,
        },
        // No componentDidMount
        {
          code: `
            class MyComponent extends Component {
              handleClick() {
                this.setState({ clicked: true });
              }
            }
          `,
        },
        // Empty componentDidMount
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {}
            }
          `,
        },
        // componentDidMount with other calls
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.fetchData();
                this.setupListeners();
              }
            }
          `,
        },
        // setState outside class
        {
          code: `this.setState({ count: 1 })`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - setState in componentDidMount', () => {
    ruleTester.run('setState in componentDidMount triggers error', noDidMountSetState, {
      valid: [],
      invalid: [
        // Direct setState
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.setState({ mounted: true });
              }
            }
          `,
          errors: [{ messageId: 'noDidMountSetState' }],
        },
        // setState with callback
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.setState({ data: [] }, () => {
                  console.log('state updated');
                });
              }
            }
          `,
          errors: [{ messageId: 'noDidMountSetState' }],
        },
        // Multiple setStates
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.setState({ loading: true });
                fetchData().then(data => {
                  this.setState({ data, loading: false });
                });
              }
            }
          `,
          errors: [
            { messageId: 'noDidMountSetState' },
            { messageId: 'noDidMountSetState' },
          ],
        },
        // setState after condition
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                if (this.props.autoLoad) {
                  this.setState({ loading: true });
                }
              }
            }
          `,
          errors: [{ messageId: 'noDidMountSetState' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', noDidMountSetState, {
      valid: [
        // Different method with similar name
        {
          code: `
            class MyComponent extends Component {
              customComponentDidMount() {
                this.setState({ custom: true });
              }
            }
          `,
        },
        // Arrow function in componentDidMount (setState reference)
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                const callback = () => {
                  // this.setState would be flagged, but this is just a comment
                };
              }
            }
          `,
        },
      ],
      invalid: [
        // setState in async callback within componentDidMount
        {
          code: `
            class MyComponent extends Component {
              async componentDidMount() {
                const data = await fetchData();
                this.setState({ data });
              }
            }
          `,
          errors: [{ messageId: 'noDidMountSetState' }],
        },
        // setState in promise callback within componentDidMount
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                fetchData().then(data => this.setState({ data }));
              }
            }
          `,
          errors: [{ messageId: 'noDidMountSetState' }],
        },
      ],
    });
  });

  describe('Complex scenarios', () => {
    ruleTester.run('complex scenarios', noDidMountSetState, {
      valid: [],
      invalid: [
        // setState in try-catch
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                try {
                  this.setState({ loading: true });
                } catch (e) {
                  this.setState({ error: e });
                }
              }
            }
          `,
          errors: [
            { messageId: 'noDidMountSetState' },
            { messageId: 'noDidMountSetState' },
          ],
        },
        // setState with object spread
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.setState({ ...initialState, mounted: true });
              }
            }
          `,
          errors: [{ messageId: 'noDidMountSetState' }],
        },
      ],
    });
  });
});

