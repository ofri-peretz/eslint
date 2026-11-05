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
          name: 'reading state',
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

  describe('A flag or variable named isMounted is not the API', () => {
    ruleTester.run('isMounted flags are valid', noIsMounted, {
      valid: [
        {
          name: 'reading a this.isMounted flag',
          code: `if (this.isMounted) { this.setState({}); }`,
        },
        {
          name: 'a flag read in a logical expression',
          code: `this.isMounted && this.setState({ count: 1 });`,
        },
        {
          name: 'a flag read in a ternary',
          code: `this.isMounted ? this.setState({}) : null;`,
        },
        {
          name: 'a flag copied to a variable',
          code: `const mounted = this.isMounted;`,
        },
        {
          name: 'a flag read in a callback',
          code: `
            fetchData().then(() => {
              if (this.isMounted) {
                this.setState({ data });
              }
            });
          `,
        },
        {
          name: 'a let variable named isMounted',
          code: `let isMounted = false;`,
        },
        {
          name: 'a const variable named isMounted',
          code: `const isMounted = true;`,
        },
        {
          name: 'a var variable named isMounted',
          code: `var isMounted = false;`,
        },
        {
          name: 'a local isMounted variable in a class component',
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                let isMounted = true;
                this.setState({ ready: isMounted });
              }
            }
          `,
        },
        {
          name: 'the isMounted ref pattern in a function component',
          code: `
            function MyComponent() {
              let isMounted = false;
              useEffect(() => {
                isMounted = true;
              }, []);
            }
          `,
        },
        {
          name: 'a component tracking its own mounted flag',
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
        },
        {
          name: 'a class field named isMounted',
          code: `
            class MyComponent extends Component {
              isMounted = false;
              componentDidMount() {
                this.isMounted = true;
              }
            }
          `,
        },
        {
          name: 'module-level this.isMounted() is not a component',
          code: `if (this.isMounted()) { this.setState({}); }`,
        },
        {
          name: 'another object isMounted() is not the component API',
          code: `class A extends Component { m() { return store.isMounted(); } }`,
        },
        {
          name: 'a class that is not a React component may define isMounted',
          code: `class Pool { isMounted() { return true; } m() { return this.isMounted(); } }`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - isMounted method call', () => {
    ruleTester.run('isMounted method call triggers error', noIsMounted, {
      valid: [],
      invalid: [
        {
          name: 'isMounted(), an anti-pattern React removed',
          code: `class A extends Component { m() { if (this.isMounted()) { this.setState({}); } } }`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        {
          name: 'isMounted() in a logical expression',
          code: `class A extends React.Component { m() { this.isMounted() && this.setState({ count: 1 }); } }`,
          errors: [{ messageId: 'noIsMounted' }],
        },
        {
          name: 'isMounted() result stored, on a renamed import',
          code: `import { Component as Base } from 'react'; class A extends Base { m = () => { const mounted = this['isMounted'](); }; }`,
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
});
