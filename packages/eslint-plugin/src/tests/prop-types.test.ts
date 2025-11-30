/**
 * Tests for prop-types rule
 * Enforce prop types usage
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { propTypes } from '../rules/react/prop-types';

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

describe('prop-types', () => {
  describe('Valid Cases - Components with propTypes', () => {
    ruleTester.run('components with propTypes are valid', propTypes, {
      valid: [
        // Class component with propTypes
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
        },
        // Class component with React.Component and propTypes
        {
          code: `
            class MyComponent extends React.Component {
              static propTypes = {
                title: PropTypes.string.isRequired
              };
              render() {
                return <h1>{this.props.title}</h1>;
              }
            }
          `,
        },
        // PureComponent with propTypes
        {
          code: `
            class MyComponent extends PureComponent {
              static propTypes = {
                count: PropTypes.number
              };
              render() {
                return <span>{this.props.count}</span>;
              }
            }
          `,
        },
        // React.PureComponent with propTypes
        {
          code: `
            class MyComponent extends React.PureComponent {
              static propTypes = {
                items: PropTypes.array
              };
              render() {
                return <ul>{this.props.items.map(i => <li key={i}>{i}</li>)}</ul>;
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
        // Function component (not covered by this rule)
        {
          code: `
            function MyComponent({ name }) {
              return <div>{name}</div>;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Cases - Components without propTypes', () => {
    ruleTester.run('components without propTypes trigger errors', propTypes, {
      valid: [],
      invalid: [
        // Class component without propTypes
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // React.Component without propTypes
        {
          code: `
            class MyComponent extends React.Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // PureComponent without propTypes
        {
          code: `
            class MyComponent extends PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // React.PureComponent without propTypes
        {
          code: `
            class MyComponent extends React.PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // Component using this.props without propTypes
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
      ],
    });
  });

  describe('ignore Option', () => {
    ruleTester.run('ignore option behavior', propTypes, {
      valid: [
        // Ignored component
        {
          code: `
            class IgnoredComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          options: [{ ignore: ['IgnoredComponent'] }],
        },
        // Multiple ignored components
        {
          code: `
            class ComponentA extends Component {
              render() {
                return <div>A</div>;
              }
            }
            class ComponentB extends Component {
              render() {
                return <div>B</div>;
              }
            }
          `,
          options: [{ ignore: ['ComponentA', 'ComponentB'] }],
        },
      ],
      invalid: [
        // Non-ignored component still triggers error
        {
          code: `
            class NotIgnored extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          options: [{ ignore: ['OtherComponent'] }],
          errors: [{ messageId: 'propTypes' }],
        },
      ],
    });
  });

  describe('skipUndeclared Option', () => {
    ruleTester.run('skipUndeclared option behavior', propTypes, {
      valid: [
        // Component without props usage - should be skipped
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello Static Content</div>;
              }
            }
          `,
          options: [{ skipUndeclared: true }],
        },
      ],
      invalid: [
        // Component with props usage - should trigger error even with skipUndeclared
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
          options: [{ skipUndeclared: true }],
          errors: [{ messageId: 'propTypes' }],
        },
      ],
    });
  });

  describe('Multiple Components', () => {
    ruleTester.run('multiple components handling', propTypes, {
      valid: [
        // All components have propTypes
        {
          code: `
            class ComponentA extends Component {
              static propTypes = { a: PropTypes.string };
              render() { return <div>A</div>; }
            }
            class ComponentB extends Component {
              static propTypes = { b: PropTypes.number };
              render() { return <div>B</div>; }
            }
          `,
        },
      ],
      invalid: [
        // One component missing propTypes
        {
          code: `
            class ComponentA extends Component {
              static propTypes = { a: PropTypes.string };
              render() { return <div>A</div>; }
            }
            class ComponentB extends Component {
              render() { return <div>B</div>; }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // Both components missing propTypes
        {
          code: `
            class ComponentA extends Component {
              render() { return <div>A</div>; }
            }
            class ComponentB extends Component {
              render() { return <div>B</div>; }
            }
          `,
          errors: [{ messageId: 'propTypes' }, { messageId: 'propTypes' }],
        },
      ],
    });
  });

  describe('Props Usage Detection', () => {
    ruleTester.run('props usage detection', propTypes, {
      valid: [],
      invalid: [
        // this.props in render
        {
          code: `
            class MyComponent extends Component {
              render() {
                const { name } = this.props;
                return <div>{name}</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // this.props in method
        {
          code: `
            class MyComponent extends Component {
              handleClick() {
                console.log(this.props.onClick);
              }
              render() {
                return <button onClick={this.handleClick}>Click</button>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // Nested this.props access
        {
          code: `
            class MyComponent extends Component {
              render() {
                return (
                  <div>
                    {this.props.items.map(item => (
                      <span key={item.id}>{item.name}</span>
                    ))}
                  </div>
                );
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
      ],
    });
  });

  describe('MemberExpression SuperClass Detection', () => {
    ruleTester.run('MemberExpression superClass detection', propTypes, {
      valid: [
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
      invalid: [
        // React.Component
        {
          code: `
            class MyComponent extends React.Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
        // React.PureComponent
        {
          code: `
            class MyComponent extends React.PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'propTypes' }],
        },
      ],
    });
  });

  describe('Anonymous Class Components', () => {
    ruleTester.run('anonymous class handling', propTypes, {
      valid: [
        // Anonymous class - no id to report on, typically not an issue
        {
          code: `
            export default class extends Component {
              render() { return <div>Hello</div>; }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', propTypes, {
      valid: [
        // Class without superClass
        {
          code: `
            class Helper {
              static propTypes = {};
              doSomething() { return 'value'; }
            }
          `,
        },
        // propTypes defined on class body
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string,
                age: PropTypes.number,
                data: PropTypes.object.isRequired,
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});

