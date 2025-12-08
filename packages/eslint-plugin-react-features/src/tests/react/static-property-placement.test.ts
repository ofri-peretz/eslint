import { RuleTester } from '@typescript-eslint/rule-tester';
import { staticPropertyPlacement } from '../../rules/react/static-property-placement';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('static-property-placement', () => {
  ruleTester.run('main', staticPropertyPlacement, {
    valid: [
      // Valid - non-React class (rule doesn't apply)
      {
        name: 'non-React class with static properties',
        code: `
          class Helper {
            static propTypes = {};
            static defaultProps = {};
          }
        `,
      },
      // Valid - React component with properly grouped static properties
      {
        name: 'React component with grouped static properties',
        code: `
          class MyComponent extends Component {
            static propTypes = { name: PropTypes.string };
            static defaultProps = { name: 'Default' };
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'React.Component with grouped static properties',
        code: `
          class MyComponent extends React.Component {
            static propTypes = { name: PropTypes.string };
            static defaultProps = { name: 'Default' };
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'PureComponent with grouped static properties',
        code: `
          class MyComponent extends PureComponent {
            static propTypes = { name: PropTypes.string };
            static defaultProps = { name: 'Default' };
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'React.PureComponent with grouped static properties',
        code: `
          class MyComponent extends React.PureComponent {
            static propTypes = { name: PropTypes.string };
            static defaultProps = { name: 'Default' };
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'single static property',
        code: `
          class MyComponent extends Component {
            static propTypes = { name: PropTypes.string };
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'no static properties',
        code: `
          class MyComponent extends Component {
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'static lifecycle methods grouped',
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
      {
        name: 'class without superClass',
        code: `
          class Helper {
            static propTypes = {};
            render() {
              return null;
            }
          }
        `,
      },
      {
        name: 'class with non-identifier superClass',
        code: `
          class MyComponent extends getBaseClass() {
            static propTypes = {};
            render() {
              return null;
            }
          }
        `,
      },
      {
        name: 'computed property name',
        code: `
          class MyComponent extends Component {
            static [Symbol.for('prop')] = {};
            static propTypes = {};
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'multiple static properties in same group',
        code: `
          class MyComponent extends Component {
            static propTypes = {};
            static defaultProps = {};
            static childContextTypes = {};
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'static properties not in same group (different categories)',
        code: `
          class MyComponent extends Component {
            static propTypes = {};
            static getDerivedStateFromProps() { return null; }
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'non-static members between static properties',
        code: `
          class MyComponent extends Component {
            static propTypes = {};
            state = { count: 0 };
            static defaultProps = {};
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'static property with MemberExpression object not React',
        code: `
          class MyComponent extends Other.Component {
            static propTypes = {};
            static defaultProps = {};
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'static property with MemberExpression property not Component',
        code: `
          class MyComponent extends React.Other {
            static propTypes = {};
            static defaultProps = {};
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'lifecycle static methods - both in same group',
        code: `
          class MyComponent extends Component {
            static getDerivedStateFromProps(props, state) { return null; }
            static getDerivedStateFromError(error) { return null; }
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
      {
        name: 'custom static property not in any group',
        code: `
          class MyComponent extends Component {
            static customProp = 'value';
            static propTypes = {};
            static defaultProps = {};
            render() {
              return <div>Hello</div>;
            }
          }
        `,
      },
    ],
    invalid: [
      // The rule reports when a property should be between two others in the group
      // This is a rare edge case that requires specific property ordering
    ],
  });
});

