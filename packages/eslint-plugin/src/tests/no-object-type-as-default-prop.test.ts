import { RuleTester } from '@typescript-eslint/rule-tester';
import { noObjectTypeAsDefaultProp } from '../rules/react/no-object-type-as-default-prop';

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

ruleTester.run('no-object-type-as-default-prop', noObjectTypeAsDefaultProp, {
  valid: [
    // Valid - primitive defaults
    {
      name: 'string default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            name: 'Default'
          };
        }
      `,
    },
    {
      name: 'number default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            count: 0
          };
        }
      `,
    },
    {
      name: 'boolean default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            active: false
          };
        }
      `,
    },
    {
      name: 'null default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            data: null
          };
        }
      `,
    },
    // Valid - array literals (not object literals)
    {
      name: 'array default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            items: []
          };
        }
      `,
    },
    // Valid - function expressions
    {
      name: 'function default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            onClick: () => {}
          };
        }
      `,
    },
    // Valid - variable reference
    {
      name: 'variable reference default prop',
      code: `
        const defaultConfig = { foo: 'bar' };
        class MyComponent extends Component {
          static defaultProps = {
            config: defaultConfig
          };
        }
      `,
    },
    // Valid - no defaultProps
    {
      name: 'no defaultProps',
      code: `
        class MyComponent extends Component {
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - defaultProps not an object expression
    {
      name: 'defaultProps as variable',
      code: `
        class MyComponent extends Component {
          static defaultProps = sharedDefaults;
        }
      `,
    },
    // Valid - functional component with primitive defaults
    {
      name: 'functional component with primitive default',
      code: `
        const MyComponent = ({ name = 'Default' }) => <div>{name}</div>;
      `,
    },
    // Note: computed property keys with object values are still reported
    // because the rule checks the value type, not the key type
    // Valid - spread property
    {
      name: 'spread property',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            ...otherDefaults
          };
        }
      `,
    },
    // Valid - method property
    {
      name: 'method property',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            getData() { return {}; }
          };
        }
      `,
    },
  ],
  invalid: [
    // Invalid - object literal in defaultProps
    {
      name: 'object literal as default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            config: {}
          };
        }
      `,
      errors: [{ messageId: 'noObjectTypeAsDefaultProp' }],
    },
    {
      name: 'object with properties as default prop',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            style: { color: 'red' }
          };
        }
      `,
      errors: [{ messageId: 'noObjectTypeAsDefaultProp' }],
    },
    {
      name: 'multiple object defaults',
      code: `
        class MyComponent extends Component {
          static defaultProps = {
            config: {},
            style: {}
          };
        }
      `,
      errors: [
        { messageId: 'noObjectTypeAsDefaultProp' },
        { messageId: 'noObjectTypeAsDefaultProp' },
      ],
    },
    // Invalid - object in function parameter default
    {
      name: 'object default in destructured parameter',
      code: `
        const MyComponent = ({ config = {} }) => <div>{JSON.stringify(config)}</div>;
      `,
      errors: [{ messageId: 'noObjectTypeAsDefaultProp' }],
    },
    {
      name: 'object with properties in destructured parameter',
      code: `
        const MyComponent = ({ style = { color: 'red' } }) => <div style={style}>Hello</div>;
      `,
      errors: [{ messageId: 'noObjectTypeAsDefaultProp' }],
    },
  ],
});

