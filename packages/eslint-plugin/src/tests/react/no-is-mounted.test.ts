/**
 * Tests for no-is-mounted rule
 * Prevent isMounted anti-pattern
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noIsMounted } from '../../rules/react/no-is-mounted';

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

describe('no-is-mounted', () => {
  describe('Valid cases - no isMounted usage', () => {
    ruleTester.run('no isMounted usage is valid', noIsMounted, {
      valid: [
        // Normal property access
        {
          code: `this.state.count`,
        },
        // Normal method call
        {
          code: `this.setState({ count: 1 })`,
        },
        // Other mounted-like names
        {
          code: `this.mounted = true`,
        },
        // Proper cancellation pattern
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.cancelToken = axios.CancelToken.source();
              }
              componentWillUnmount() {
                this.cancelToken.cancel();
              }
            }
          `,
        },
        // Using useEffect cleanup
        {
          code: `
            function MyComponent() {
              useEffect(() => {
                return () => {
                  // cleanup
                };
              }, []);
            }
          `,
        },
        // Using AbortController
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.controller = new AbortController();
              }
              componentWillUnmount() {
                this.controller.abort();
              }
            }
          `,
        },
        // Different property name
        {
          code: `if (this.isComponentMounted) { this.setState({}); }`,
        },
        // Variable with mounted in name
        {
          code: `const isMountedFlag = true;`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - isMounted property access', () => {
    ruleTester.run('isMounted property access triggers error', noIsMounted, {
      valid: [],
      invalid: [
        // Basic property access
        {
          code: `if (this.isMounted) { this.setState({}); }`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // Conditional with isMounted
        {
          code: `this.isMounted && this.setState({ count: 1 });`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // In ternary
        {
          code: `this.isMounted ? this.setState({}) : null;`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // Assignment
        {
          code: `const mounted = this.isMounted;`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // In callback
        {
          code: `
            fetchData().then(() => {
              if (this.isMounted) {
                this.setState({ data });
              }
            });
          `,
          errors: [{ messageId: 'noIsMounted' }],
        },
      ],
    });
  });

  describe('Invalid cases - isMounted method call', () => {
    ruleTester.run('isMounted method call triggers error', noIsMounted, {
      valid: [],
      invalid: [
        // Method call
        {
          code: `if (this.isMounted()) { this.setState({}); }`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // In conditional
        {
          code: `this.isMounted() && this.setState({ count: 1 });`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // Stored result
        {
          code: `const mounted = this.isMounted();`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // In async callback - wrapped in class
        {
          code: `
            class MyComponent extends Component {
              async componentDidMount() {
                const data = await fetchData();
                if (this.isMounted()) {
                  this.setState({ data });
                }
              }
            }
          `,
          errors: [{ messageId: 'noIsMounted' }],
        },
      ],
    });
  });

  describe('Invalid cases - isMounted variable declaration', () => {
    ruleTester.run('isMounted variable declaration triggers error', noIsMounted, {
      valid: [],
      invalid: [
        // let declaration
        {
          code: `let isMounted = false;`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // const declaration
        {
          code: `const isMounted = true;`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // var declaration
        {
          code: `var isMounted = false;`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // In class component
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                let isMounted = true;
                this.setState({ ready: isMounted });
              }
            }
          `,
          errors: [{ messageId: 'noIsMounted' }],
        },
        // In function component
        {
          code: `
            function MyComponent() {
              let isMounted = false;
              useEffect(() => {
                isMounted = true;
              }, []);
            }
          `,
          errors: [{ messageId: 'noIsMounted' }],
        },
      ],
    });
  });

  describe('Complex scenarios', () => {
    ruleTester.run('complex scenarios', noIsMounted, {
      valid: [],
      invalid: [
        // Multiple isMounted usages
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                this.isMounted = true;
                fetchData().then(data => {
                  if (this.isMounted) {
                    this.setState({ data });
                  }
                });
              }
              componentWillUnmount() {
                this.isMounted = false;
              }
            }
          `,
          errors: [
            { messageId: 'noIsMounted' },
            { messageId: 'noIsMounted' },
            { messageId: 'noIsMounted' },
          ],
        },
        // isMounted assignment (class field 'isMounted = false' not detected by MemberExpression rule)
        {
          code: `
            class MyComponent extends Component {
              isMounted = false;
              componentDidMount() {
                this.isMounted = true;
              }
            }
          `,
          // Only this.isMounted is detected by MemberExpression rule
          errors: [{ messageId: 'noIsMounted' }],
        },
      ],
    });
  });
});

