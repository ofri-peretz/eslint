import { RuleTester } from '@typescript-eslint/rule-tester';
import { defaultPropsMatchPropTypes } from '../rules/react/default-props-match-prop-types';

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

ruleTester.run('default-props-match-prop-types', defaultPropsMatchPropTypes, {
  valid: [
    // Valid - matching types
    {
      name: 'string prop with string default',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            name: PropTypes.string
          };
          static defaultProps = {
            name: 'Default'
          };
          render() {
            return <div>{this.props.name}</div>;
          }
        }
      `,
    },
    {
      name: 'number prop with number default',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            count: PropTypes.number
          };
          static defaultProps = {
            count: 0
          };
          render() {
            return <div>{this.props.count}</div>;
          }
        }
      `,
    },
    {
      name: 'boolean prop with boolean default',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            active: PropTypes.bool
          };
          static defaultProps = {
            active: false
          };
          render() {
            return <div>{this.props.active}</div>;
          }
        }
      `,
    },
    // Valid - complex types (allowed for now)
    {
      name: 'array prop with array default',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            items: PropTypes.array
          };
          static defaultProps = {
            items: []
          };
          render() {
            return <div>{this.props.items}</div>;
          }
        }
      `,
    },
    {
      name: 'object prop with object default',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            config: PropTypes.object
          };
          static defaultProps = {
            config: {}
          };
          render() {
            return <div>{this.props.config}</div>;
          }
        }
      `,
    },
    // Valid - no defaultProps
    {
      name: 'no defaultProps',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            name: PropTypes.string.isRequired
          };
          render() {
            return <div>{this.props.name}</div>;
          }
        }
      `,
    },
    // Valid - no propTypes
    {
      name: 'no propTypes',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            name: 'Default'
          };
          render() {
            return <div>{this.props.name}</div>;
          }
        }
      `,
    },
    // Valid - defaultProps for prop not in propTypes
    {
      name: 'defaultProps for prop not in propTypes',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            name: PropTypes.string
          };
          static defaultProps = {
            name: 'Default',
            extra: 'Extra value'
          };
          render() {
            return <div>{this.props.name}</div>;
          }
        }
      `,
    },
    // Valid - multiple components (each cleared)
    {
      name: 'multiple components',
      code: `
        class ComponentA extends Component {
          static propTypes = { a: PropTypes.string };
          static defaultProps = { a: 'a' };
          render() { return <div />; }
        }
        class ComponentB extends Component {
          static propTypes = { b: PropTypes.number };
          static defaultProps = { b: 0 };
          render() { return <div />; }
        }
      `,
    },
    // Valid - empty propTypes
    {
      name: 'empty propTypes',
      code: `
        class MyComponent extends Component {
          static propTypes = {};
          static defaultProps = {};
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - non-literal default value
    {
      name: 'non-literal default value',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            func: PropTypes.func
          };
          static defaultProps = {
            func: () => {}
          };
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - propTypes with spread element
    {
      name: 'propTypes with spread element',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            ...sharedPropTypes
          };
          static defaultProps = {
            name: 'Default'
          };
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - defaultProps with spread element
    {
      name: 'defaultProps with spread element',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            name: PropTypes.string
          };
          static defaultProps = {
            ...sharedDefaults
          };
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - non-class declaration
    {
      name: 'functional component',
      code: `
        const MyComponent = ({ name = 'Default' }) => <div>{name}</div>;
      `,
    },
    // Valid - propTypes not an object expression
    {
      name: 'propTypes as variable reference',
      code: `
        class MyComponent extends Component {
          static propTypes = sharedPropTypes;
          static defaultProps = { name: 'Default' };
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - defaultProps not an object expression
    {
      name: 'defaultProps as variable reference',
      code: `
        class MyComponent extends Component {
          static propTypes = { name: PropTypes.string };
          static defaultProps = sharedDefaults;
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - propTypes with computed property
    {
      name: 'propTypes with computed property',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            [computedProp]: PropTypes.string
          };
          static defaultProps = {
            name: 'Default'
          };
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - defaultProps with computed property
    {
      name: 'defaultProps with computed property',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            name: PropTypes.string
          };
          static defaultProps = {
            [computedProp]: 'Default'
          };
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
  ],
  invalid: [
    // Invalid - string default for number prop
    {
      name: 'string default for number prop',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            count: PropTypes.number
          };
          static defaultProps = {
            count: 'zero'
          };
          render() {
            return <div>{this.props.count}</div>;
          }
        }
      `,
      errors: [{ messageId: 'defaultPropsMatchPropTypes' }],
    },
    // Invalid - number default for string prop
    {
      name: 'number default for string prop',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            name: PropTypes.string
          };
          static defaultProps = {
            name: 123
          };
          render() {
            return <div>{this.props.name}</div>;
          }
        }
      `,
      errors: [{ messageId: 'defaultPropsMatchPropTypes' }],
    },
    // Invalid - string default for boolean prop
    {
      name: 'string default for boolean prop',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            active: PropTypes.bool
          };
          static defaultProps = {
            active: 'true'
          };
          render() {
            return <div>{this.props.active}</div>;
          }
        }
      `,
      errors: [{ messageId: 'defaultPropsMatchPropTypes' }],
    },
    // Invalid - multiple mismatches
    {
      name: 'multiple type mismatches',
      code: `
        class MyComponent extends Component {
          static propTypes = {
            count: PropTypes.number,
            name: PropTypes.string
          };
          static defaultProps = {
            count: 'zero',
            name: 123
          };
          render() {
            return <div>{this.props.count}</div>;
          }
        }
      `,
      errors: [
        { messageId: 'defaultPropsMatchPropTypes' },
        { messageId: 'defaultPropsMatchPropTypes' },
      ],
    },
  ],
});

