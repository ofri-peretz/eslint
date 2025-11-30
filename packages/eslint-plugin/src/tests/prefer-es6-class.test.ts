import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferEs6Class } from '../rules/react/prefer-es6-class';

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

ruleTester.run('prefer-es6-class', preferEs6Class, {
  valid: [
    // Valid - ES6 class component
    {
      name: 'ES6 class extending Component',
      code: `
        class MyComponent extends React.Component {
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    {
      name: 'ES6 class extending PureComponent',
      code: `
        class MyComponent extends React.PureComponent {
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - functional component
    {
      name: 'functional component',
      code: `
        const MyComponent = () => <div>Hello</div>;
      `,
    },
    {
      name: 'function declaration component',
      code: `
        function MyComponent() {
          return <div>Hello</div>;
        }
      `,
    },
    // Valid - other React methods
    {
      name: 'React.createElement',
      code: `
        const element = React.createElement('div', null, 'Hello');
      `,
    },
    {
      name: 'React.cloneElement',
      code: `
        const cloned = React.cloneElement(element, { key: 'new' });
      `,
    },
    {
      name: 'React.memo',
      code: `
        const MemoizedComponent = React.memo(MyComponent);
      `,
    },
    {
      name: 'React.forwardRef',
      code: `
        const ForwardedComponent = React.forwardRef((props, ref) => <div ref={ref} />);
      `,
    },
    // Valid - similar method names on other objects
    {
      name: 'createClass on other object',
      code: `
        const component = MyLib.createClass({ render() { return <div />; } });
      `,
    },
    // Valid - createClass as property
    {
      name: 'createClass as property access',
      code: `
        const method = React.createClass;
      `,
    },
    // Valid - non-React code
    {
      name: 'plain JavaScript class',
      code: `
        class Helper {
          constructor() {}
          doSomething() {}
        }
      `,
    },
  ],
  invalid: [
    // Invalid - React.createClass
    {
      name: 'React.createClass',
      code: `
        const MyComponent = React.createClass({
          render() {
            return <div>Hello</div>;
          }
        });
      `,
      errors: [{ messageId: 'preferEs6Class' }],
    },
    {
      name: 'React.createClass with displayName',
      code: `
        const MyComponent = React.createClass({
          displayName: 'MyComponent',
          render() {
            return <div>Hello</div>;
          }
        });
      `,
      errors: [{ messageId: 'preferEs6Class' }],
    },
    {
      name: 'React.createClass with lifecycle methods',
      code: `
        const MyComponent = React.createClass({
          getInitialState() {
            return { count: 0 };
          },
          componentDidMount() {
            console.log('mounted');
          },
          render() {
            return <div>{this.state.count}</div>;
          }
        });
      `,
      errors: [{ messageId: 'preferEs6Class' }],
    },
    // Invalid - imported createClass
    {
      name: 'createClass imported from create-react-class',
      code: `
        const MyComponent = createClass({
          render() {
            return <div>Hello</div>;
          }
        });
      `,
      errors: [{ messageId: 'preferEs6Class' }],
    },
    {
      name: 'createClass with mixins',
      code: `
        const MyComponent = createClass({
          mixins: [SomeMixin],
          render() {
            return <div>Hello</div>;
          }
        });
      `,
      errors: [{ messageId: 'preferEs6Class' }],
    },
    // Invalid - createClass with complex component
    {
      name: 'createClass with propTypes and defaultProps',
      code: `
        const MyComponent = createClass({
          propTypes: {
            name: PropTypes.string
          },
          getDefaultProps() {
            return { name: 'Default' };
          },
          render() {
            return <div>{this.props.name}</div>;
          }
        });
      `,
      errors: [{ messageId: 'preferEs6Class' }],
    },
    // Invalid - multiple createClass calls
    {
      name: 'multiple createClass calls',
      code: `
        const ComponentA = React.createClass({ render() { return <div>A</div>; } });
        const ComponentB = React.createClass({ render() { return <div>B</div>; } });
      `,
      errors: [
        { messageId: 'preferEs6Class' },
        { messageId: 'preferEs6Class' },
      ],
    },
  ],
});

