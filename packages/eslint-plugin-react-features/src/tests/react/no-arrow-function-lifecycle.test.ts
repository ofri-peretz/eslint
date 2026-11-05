import { RuleTester } from '@typescript-eslint/rule-tester';
import { noArrowFunctionLifecycle } from '../../rules/react/no-arrow-function-lifecycle';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('no-arrow-function-lifecycle', noArrowFunctionLifecycle, {
  valid: [
    // Valid - regular method syntax for lifecycle methods
    {
      name: 'componentDidMount as method',
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
    {
      name: 'componentDidUpdate as method',
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
    {
      name: 'componentWillUnmount as method',
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
    {
      name: 'shouldComponentUpdate as method',
      code: `
        class MyComponent extends Component {
          shouldComponentUpdate(nextProps, nextState) {
            return nextProps.value !== this.props.value;
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    {
      name: 'getSnapshotBeforeUpdate as method',
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
    // Valid - arrow functions for non-lifecycle methods
    {
      name: 'arrow function for custom method',
      code: `
        class MyComponent extends Component {
          handleClick = () => {
            console.log('clicked');
          }
          render() {
            return <div onClick={this.handleClick}>Hello</div>;
          }
        }
      `,
    },
    {
      name: 'arrow function for event handler',
      code: `
        class MyComponent extends Component {
          onChange = (e) => {
            this.setState({ value: e.target.value });
          }
          render() {
            return <input onChange={this.onChange} />;
          }
        }
      `,
    },
    // Valid - deprecated/unsafe lifecycle methods as regular methods
    {
      name: 'UNSAFE_componentWillMount as method',
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
    {
      name: 'UNSAFE_componentWillReceiveProps as method',
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
    {
      name: 'UNSAFE_componentWillUpdate as method',
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
    // Valid - computed property name
    {
      name: 'computed property name',
      code: `
        class MyComponent extends Component {
          [methodName] = () => {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - render as arrow function (not in LIFECYCLE_METHODS set)
    {
      name: 'render as arrow function',
      code: `
        class MyComponent extends Component {
          render = () => <div>Hello</div>;
        }
      `,
    },
  ],
  invalid: [
    // Invalid - arrow function lifecycle methods as class properties
    {
      name: 'componentDidMount as arrow function',
      code: `
        class MyComponent extends Component {
          componentDidMount = () => {
            console.log('mounted');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'componentDidUpdate as arrow function',
      code: `
        class MyComponent extends Component {
          componentDidUpdate = (prevProps) => {
            console.log('updated');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'componentWillUnmount as arrow function',
      code: `
        class MyComponent extends Component {
          componentWillUnmount = () => {
            console.log('unmounting');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'shouldComponentUpdate as arrow function',
      code: `
        class MyComponent extends Component {
          shouldComponentUpdate = (nextProps, nextState) => {
            return nextProps.value !== this.props.value;
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'getSnapshotBeforeUpdate as arrow function',
      code: `
        class MyComponent extends Component {
          getSnapshotBeforeUpdate = (prevProps, prevState) => {
            return null;
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    // Invalid - deprecated lifecycle methods as arrow functions
    {
      name: 'componentWillMount as arrow function',
      code: `
        class MyComponent extends Component {
          componentWillMount = () => {
            console.log('will mount');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'componentWillReceiveProps as arrow function',
      code: `
        class MyComponent extends Component {
          componentWillReceiveProps = (nextProps) => {
            console.log('will receive props');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'componentWillUpdate as arrow function',
      code: `
        class MyComponent extends Component {
          componentWillUpdate = (nextProps, nextState) => {
            console.log('will update');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    // Invalid - unsafe lifecycle methods as arrow functions
    {
      name: 'UNSAFE_componentWillMount as arrow function',
      code: `
        class MyComponent extends Component {
          UNSAFE_componentWillMount = () => {
            console.log('unsafe will mount');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'UNSAFE_componentWillReceiveProps as arrow function',
      code: `
        class MyComponent extends Component {
          UNSAFE_componentWillReceiveProps = (nextProps) => {
            console.log('unsafe will receive props');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'UNSAFE_componentWillUpdate as arrow function',
      code: `
        class MyComponent extends Component {
          UNSAFE_componentWillUpdate = (nextProps, nextState) => {
            console.log('unsafe will update');
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    // Invalid - componentDidCatch as arrow function
    {
      name: 'componentDidCatch as arrow function',
      code: `
        class MyComponent extends Component {
          componentDidCatch = (error, info) => {
            console.error(error);
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    // Invalid - multiple arrow function lifecycle methods
    {
      name: 'multiple arrow function lifecycle methods',
      code: `
        class MyComponent extends Component {
          componentDidMount = () => {}
          componentWillUnmount = () => {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [
        { messageId: 'noArrowFunctionLifecycle' },
        { messageId: 'noArrowFunctionLifecycle' },
      ],
    },
  ],
});

ruleTester.run('no-arrow-function-lifecycle by binding and key spelling', noArrowFunctionLifecycle, {
  valid: [
    {
      name: 'a class that is not a React component',
      code: 'class Store { componentDidMount = () => {}; }',
    },
    {
      name: 'a Component class from another library',
      code: "import { Component } from 'lit'; class A extends Component { componentDidMount = () => {}; }",
    },
    {
      name: 'a lifecycle-named key that is not static text',
      code: 'class A extends React.Component { [hook] = () => {}; }',
    },
  ],
  invalid: [
    {
      name: 'a quoted lifecycle key on a renamed Component import',
      code: "import { Component as Base } from 'react'; class A extends Base { 'componentDidMount' = () => {}; }",
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
    {
      name: 'a computed lifecycle key on a namespace import',
      code: "import * as R from 'react'; const A = class extends R.PureComponent { ['componentWillUnmount'] = () => {}; };",
      errors: [{ messageId: 'noArrowFunctionLifecycle' }],
    },
  ],
});
