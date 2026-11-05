/**
 * Tests for prefer-stateless-function rule
 * Prefer stateless functions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferStatelessFunction } from '../../rules/react/prefer-stateless-function';

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
          name: 'a class that holds state',
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
      valid: [
        {
          name: 'a class with its own methods is not only a render function',
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
        },
        {
          name: 'a constructor that sets an instance field',
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
        },
        {
          name: 'setState from render',
          code: `class C extends Component { render() { return <b onClick={() => this.setState({})} />; } }`,
        },
        {
          name: 'a lifecycle as an arrow field',
          code: `class C extends Component { componentDidMount = () => {}; render() { return null; } }`,
        },
        {
          name: 'an error boundary has no function form',
          code: `class C extends Component { static getDerivedStateFromError() { return null; } render() { return null; } }`,
        },
        {
          name: 'a Component from another library is not React',
          code: `import { Component } from 'lit';
          class C extends Component { render() { return null; } }`,
        },
        {
          name: 'a static block is not a function member',
          code: `class C extends Component { static { init(); } render() { return null; } }`,
        },
        {
          name: 'this outside any class is not read',
          code: `function f() { return this; } class C extends Component { state = {}; render() { return null; } }`,
        },
        {
          name: 'a bare this escapes the props',
          code: `class C extends Component { render() { return <Row owner={this} />; } }`,
        },
        {
          name: 'a computed this key',
          code: `class C extends Component { render() { return <b>{this[key]}</b>; } }`,
        },
      ],
      invalid: [
        {
          name: 'props read through a cast of this',
          code: `class C extends Component { render() { return <b>{(this as any).props.x}</b>; } }`,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        {
          name: 'a renamed Component import',
          code: `import { Component as Base } from 'react';
          class C extends Base { static propTypes = {}; render() { return <b>{this.props.x}</b>; } }`,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        {
          name: 'a class expression reading context, with a useless constructor',
          code: `import * as R from 'react';
          const C = class extends R.PureComponent {
            [k: string]: any;
            constructor(props) { super(props); }
            render() { return <b>{this.context.x}</b>; }
          };`,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        {
          name: 'a constructor overload signature declares nothing',
          code: `class C extends Component {
            constructor(props: any);
            constructor(props: any) { super(props); }
            render() { return null; }
          }`,
          errors: [{ messageId: 'preferStatelessFunction' }],
        },
        // Simple class without state or lifecycle
        {
          name: 'a class with only render and no state',
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

