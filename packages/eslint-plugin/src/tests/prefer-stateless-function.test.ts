/**
 * Tests for prefer-stateless-function rule
 * Prefer stateless functions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferStatelessFunction } from '../rules/react/prefer-stateless-function';

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

describe('prefer-stateless-function', () => {
  describe('Valid cases - classes with state or lifecycle', () => {
    ruleTester.run('classes with state or lifecycle are valid', preferStatelessFunction, {
      valid: [
        // Class with state property
        {
          code: `
            class MyComponent extends Component {
              state = { count: 0 };
              render() {
                return <div>{this.state.count}</div>;
              }
            }
          `,
        },
        // Class with state in constructor
        {
          code: `
            class MyComponent extends Component {
              constructor(props) {
                super(props);
                this.state = { count: 0 };
              }
              render() {
                return <div>{this.state.count}</div>;
              }
            }
          `,
        },
        // Class with componentDidMount
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                console.log('mounted');
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Class with componentDidUpdate
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate(prevProps) {
                console.log('updated');
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Class with componentWillUnmount
        {
          code: `
            class MyComponent extends Component {
              componentWillUnmount() {
                console.log('unmounting');
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Class with shouldComponentUpdate
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate(nextProps) {
                return nextProps.value !== this.props.value;
              }
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
        // PureComponent when ignorePureComponents is true
        {
          code: `
            class MyComponent extends PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          options: [{ ignorePureComponents: true }],
        },
        // React.PureComponent when ignorePureComponents is true
        {
          code: `
            class MyComponent extends React.PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          options: [{ ignorePureComponents: true }],
        },
        // UNSAFE_componentWillMount lifecycle
        {
          code: `
            class MyComponent extends Component {
              UNSAFE_componentWillMount() {
                console.log('will mount');
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // UNSAFE_componentWillReceiveProps lifecycle
        {
          code: `
            class MyComponent extends Component {
              UNSAFE_componentWillReceiveProps(nextProps) {
                console.log('will receive props');
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // UNSAFE_componentWillUpdate lifecycle
        {
          code: `
            class MyComponent extends Component {
              UNSAFE_componentWillUpdate(nextProps, nextState) {
                console.log('will update');
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // getSnapshotBeforeUpdate lifecycle
        {
          code: `
            class MyComponent extends Component {
              getSnapshotBeforeUpdate(prevProps, prevState) {
                return null;
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - stateless classes', () => {
    ruleTester.run('stateless classes trigger errors', preferStatelessFunction, {
      valid: [],
      invalid: [
        // Simple class without state or lifecycle
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        // React.Component without state or lifecycle
        {
          code: `
            class MyComponent extends React.Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        // PureComponent without state or lifecycle (when not ignoring)
        {
          code: `
            class MyComponent extends PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        // React.PureComponent without state or lifecycle (when not ignoring)
        {
          code: `
            class MyComponent extends React.PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        // Class with only helper methods (no state or lifecycle)
        {
          code: `
            class MyComponent extends Component {
              handleClick() {
                console.log('clicked');
              }
              render() {
                return <div onClick={this.handleClick}>Click me</div>;
              }
            }
          `,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        // Class with constructor but no state
        {
          code: `
            class MyComponent extends Component {
              constructor(props) {
                super(props);
                this.value = 'test';
              }
              render() {
                return <div>{this.value}</div>;
              }
            }
          `,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', preferStatelessFunction, {
      valid: [
        // Anonymous class with state
        {
          code: `
            export default class extends Component {
              state = { active: true };
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Class with getDerivedStateFromProps (static)
        {
          code: `
            class MyComponent extends Component {
              static getDerivedStateFromProps(props, state) {
                return null;
              }
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
      ],
      invalid: [
        // Anonymous class without state or lifecycle
        {
          code: `
            export default class extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
      ],
    });
  });
});

