import { RuleTester } from '@typescript-eslint/rule-tester';
import { sortComp } from '../../rules/react/sort-comp';

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

ruleTester.run('sort-comp', sortComp, {
  valid: [
    {
      name: 'a Component from another library is not React',
      code: `import { Component } from 'lit';
      class El extends Component { render() { return null; } static styles = []; }`,
    },
    {
      name: 'a group the order leaves out falls to everything-else',
      code: `class C extends React.Component { handle() {} static make() {} render() { return null; } }`,
      options: [{ order: ['everything-else', 'render'] }],
    },
    {
      name: 'members of groups placed nowhere are unconstrained',
      code: `class C extends React.Component { render() { return null; } static make() {} }`,
      options: [{ order: ['render', 'lifecycle'] }],
    },
    {
      name: 'a static block is not a member to place',
      code: `class C extends React.Component { static label = 'x'; static { init(); } render() { return null; } }`,
    },
    {
      name: 'a private field has no name to place',
      code: `class C extends React.Component { render() { return null; } #count = 0; }`,
    },
    // Valid - correct order
    {
      name: 'correct default order - static, lifecycle, custom, render',
      code: `
        class MyComponent extends Component {
          static propTypes = {};
          static defaultProps = {};
          constructor(props) {
            super(props);
          }
          componentDidMount() {}
          componentWillUnmount() {}
          handleClick() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    {
      name: 'correct order with React.Component',
      code: `
        class MyComponent extends React.Component {
          static propTypes = {};
          constructor(props) {
            super(props);
          }
          componentDidMount() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    {
      name: 'correct order with PureComponent',
      code: `
        class MyComponent extends PureComponent {
          static propTypes = {};
          componentDidMount() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    {
      name: 'correct order with React.PureComponent',
      code: `
        class MyComponent extends React.PureComponent {
          static propTypes = {};
          componentDidMount() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - lifecycle methods in correct order
    {
      name: 'lifecycle methods before render',
      code: `
        class MyComponent extends Component {
          componentWillMount() {}
          UNSAFE_componentWillMount() {}
          componentDidMount() {}
          componentWillReceiveProps() {}
          UNSAFE_componentWillReceiveProps() {}
          shouldComponentUpdate() {}
          componentWillUpdate() {}
          UNSAFE_componentWillUpdate() {}
          getSnapshotBeforeUpdate() {}
          componentDidUpdate() {}
          componentDidCatch() {}
          componentWillUnmount() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - static variables before static methods
    {
      name: 'static variables before static methods',
      code: `
        class MyComponent extends Component {
          static propTypes = {};
          static defaultProps = {};
          static getDerivedStateFromProps() { return null; }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - instance variables before lifecycle
    {
      name: 'instance variables before lifecycle',
      code: `
        class MyComponent extends Component {
          state = { count: 0 };
          componentDidMount() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - non-React class (no check)
    {
      name: 'non-React class',
      code: `
        class Helper {
          render() {}
          constructor() {}
        }
      `,
    },
    {
      name: 'class without superClass',
      code: `
        class Utility {
          handleClick() {}
          render() {}
        }
      `,
    },
    // Valid - class with non-identifier superClass
    {
      name: 'class with function call superClass',
      code: `
        class MyComponent extends getBaseClass() {
          render() {}
          constructor() {}
        }
      `,
    },
    // Valid - only render method
    {
      name: 'only render method',
      code: `
        class MyComponent extends Component {
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - custom methods between lifecycle and render
    {
      name: 'custom methods in correct position',
      code: `
        class MyComponent extends Component {
          componentDidMount() {}
          handleClick() {}
          handleChange() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - computed method name (ignored)
    {
      name: 'computed method name',
      code: `
        class MyComponent extends Component {
          [methodName]() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'a renamed Component import',
      code: `import { Component as Base } from 'react';
      class C extends Base { render() { return null; } componentDidMount() {} }`,
      errors: [{ messageId: 'sortComp' }],
    },
    {
      name: 'a class expression, with a computed render key',
      code: `const C = class extends React.Component { ['render']() { return null; } static label = 'x'; };`,
      errors: [{ messageId: 'sortComp' }],
    },
    // Invalid - render before lifecycle
    {
      name: 'render before lifecycle method',
      code: `
        class MyComponent extends Component {
          render() {
            return <div>Hello</div>;
          }
          componentDidMount() {}
        }
      `,
      errors: [{ messageId: 'sortComp' }],
    },
    // Invalid - custom method before lifecycle
    {
      name: 'custom method before lifecycle',
      code: `
        class MyComponent extends Component {
          handleClick() {}
          componentDidMount() {}
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'sortComp' }],
    },
    // Invalid - render before custom method (when custom should come first)
    {
      name: 'lifecycle after render',
      code: `
        class MyComponent extends Component {
          static propTypes = {};
          render() {
            return <div>Hello</div>;
          }
          constructor(props) {
            super(props);
          }
        }
      `,
      errors: [{ messageId: 'sortComp' }],
    },
    // Invalid - instance variable after lifecycle
    {
      name: 'instance variable after lifecycle',
      code: `
        class MyComponent extends Component {
          componentDidMount() {}
          state = { count: 0 };
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'sortComp' }],
    },
    // Invalid - static method after instance variable
    {
      name: 'static method after instance variable',
      code: `
        class MyComponent extends Component {
          state = { count: 0 };
          static propTypes = {};
          render() {
            return <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'sortComp' }],
    },
  ],
});

