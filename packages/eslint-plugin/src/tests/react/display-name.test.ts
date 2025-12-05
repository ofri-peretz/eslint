/**
 * Tests for display-name rule
 * Enforce component display names
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { displayName } from '../../rules/react/display-name';

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

describe('display-name', () => {
  describe('Class Components with displayName', () => {
    ruleTester.run('class components with displayName are valid', displayName, {
      valid: [
        // Class component with static displayName
        {
          code: `
            class MyComponent extends Component {
              static displayName = 'MyComponent';
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // React.Component with displayName
        {
          code: `
            class MyComponent extends React.Component {
              static displayName = 'MyComponent';
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // PureComponent with displayName
        {
          code: `
            class MyComponent extends PureComponent {
              static displayName = 'MyComponent';
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // React.PureComponent with displayName
        {
          code: `
            class MyComponent extends React.PureComponent {
              static displayName = 'MyComponent';
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Non-React class (no superClass)
        {
          code: `
            class Helper {
              doSomething() {
                return 'hello';
              }
            }
          `,
        },
        // Non-React class (different superClass)
        {
          code: `
            class Service extends BaseService {
              fetch() {
                return 'data';
              }
            }
          `,
        },
        // Empty file
        {
          code: ``,
        },
      ],
      invalid: [],
    });
  });

  describe('Class Components without displayName', () => {
    ruleTester.run('class components without displayName trigger errors', displayName, {
      valid: [],
      invalid: [
        // Class component without displayName
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // React.Component without displayName
        {
          code: `
            class MyComponent extends React.Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // PureComponent without displayName
        {
          code: `
            class MyComponent extends PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // React.PureComponent without displayName
        {
          code: `
            class MyComponent extends React.PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });

  describe('Function Components', () => {
    ruleTester.run('function components handling', displayName, {
      valid: [
        // Non-component function (no JSX)
        {
          code: `
            function helper() {
              return 'hello';
            }
          `,
        },
        // Arrow function without JSX
        {
          code: `
            const helper = () => 'hello';
          `,
        },
        // Function expression without JSX
        {
          code: `
            const helper = function() {
              return 42;
            };
          `,
        },
      ],
      invalid: [
        // Function component without displayName
        {
          code: `
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // Arrow function component without displayName
        {
          code: `
            const MyComponent = () => {
              return <div>Hello</div>;
            };
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // Function expression component without displayName
        {
          code: `
            const MyComponent = function() {
              return <div>Hello</div>;
            };
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // Arrow function with implicit return (JSX)
        {
          code: `
            const MyComponent = () => <div>Hello</div>;
          `,
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });

  describe('Component Detection', () => {
    ruleTester.run('component detection variations', displayName, {
      valid: [
        // Variable declarator with non-function value
        {
          code: `
            const config = { key: 'value' };
          `,
        },
        // Variable without init
        {
          code: `
            let myVar;
          `,
        },
        // Non-React MemberExpression superClass
        {
          code: `
            class MyService extends Utils.BaseService {
              fetch() { return 'data'; }
            }
          `,
        },
        // Wrong object in MemberExpression
        {
          code: `
            class MyClass extends Other.Component {
              render() { return 'string'; }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('JSX Detection', () => {
    ruleTester.run('JSX detection in components', displayName, {
      valid: [],
      invalid: [
        // Component with nested JSX
        {
          code: `
            function MyComponent() {
              return (
                <div>
                  <header>
                    <h1>Title</h1>
                  </header>
                  <main>
                    <p>Content</p>
                  </main>
                </div>
              );
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // Component with JSX fragment
        {
          code: `
            function MyComponent() {
              return (
                <>
                  <div>A</div>
                  <div>B</div>
                </>
              );
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // Component with conditional JSX
        {
          code: `
            function MyComponent({ show }) {
              return show ? <div>Visible</div> : null;
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });

  describe('Multiple Components', () => {
    ruleTester.run('multiple components handling', displayName, {
      valid: [
        // All components have displayName
        {
          code: `
            class ComponentA extends Component {
              static displayName = 'ComponentA';
              render() { return <div>A</div>; }
            }
            class ComponentB extends Component {
              static displayName = 'ComponentB';
              render() { return <div>B</div>; }
            }
          `,
        },
      ],
      invalid: [
        // One component missing displayName
        {
          code: `
            class ComponentA extends Component {
              static displayName = 'ComponentA';
              render() { return <div>A</div>; }
            }
            class ComponentB extends Component {
              render() { return <div>B</div>; }
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
        // Both components missing displayName
        {
          code: `
            class ComponentA extends Component {
              render() { return <div>A</div>; }
            }
            class ComponentB extends Component {
              render() { return <div>B</div>; }
            }
          `,
          errors: [{ messageId: 'displayName' }, { messageId: 'displayName' }],
        },
        // Mix of class and function components
        {
          code: `
            class ComponentA extends Component {
              render() { return <div>A</div>; }
            }
            function ComponentB() {
              return <div>B</div>;
            }
          `,
          errors: [{ messageId: 'displayName' }, { messageId: 'displayName' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', displayName, {
      valid: [
        // Class without superClass
        {
          code: `
            class Helper {
              static displayName = 'Helper';
              doSomething() { return 'value'; }
            }
          `,
        },
        // displayName at any position in class body
        {
          code: `
            class MyComponent extends Component {
              state = { count: 0 };
              static displayName = 'MyComponent';
              render() {
                return <div>{this.state.count}</div>;
              }
            }
          `,
        },
      ],
      invalid: [
        // Non-static displayName doesn't count
        {
          code: `
            class MyComponent extends Component {
              displayName = 'MyComponent';
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });

  describe('Anonymous Components', () => {
    ruleTester.run('anonymous component handling', displayName, {
      valid: [],
      invalid: [
        // Anonymous class component (exports without id)
        {
          code: `
            export default class extends Component {
              render() { return <div>Hello</div>; }
            }
          `,
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });
});


