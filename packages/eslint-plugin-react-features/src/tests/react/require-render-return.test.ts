import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRenderReturn } from '../../rules/react/require-render-return';

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

ruleTester.run('require-render-return', requireRenderReturn, {
  valid: [
    // Valid - render with return statement
    {
      name: 'render with simple return',
      code: `
        class MyComponent extends Component {
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
    {
      name: 'render with return null',
      code: `
        class MyComponent extends Component {
          render() {
            return null;
          }
        }
      `,
    },
    {
      name: 'render with conditional return in if statement',
      code: `
        class MyComponent extends Component {
          render() {
            if (this.props.loading) {
              return <div>Loading...</div>;
            }
            return <div>Content</div>;
          }
        }
      `,
    },
    {
      name: 'render with return in else branch',
      code: `
        class MyComponent extends Component {
          render() {
            if (this.props.error) {
              return <div>Error</div>;
            } else {
              return <div>Success</div>;
            }
          }
        }
      `,
    },
    {
      name: 'render with return in switch statement',
      code: `
        class MyComponent extends Component {
          render() {
            switch (this.props.type) {
              case 'a':
                return <div>A</div>;
              case 'b':
                return <div>B</div>;
              default:
                return null;
            }
          }
        }
      `,
    },
    {
      name: 'render with early return and final return',
      code: `
        class MyComponent extends Component {
          render() {
            if (!this.props.data) {
              return null;
            }
            return <div>{this.props.data}</div>;
          }
        }
      `,
    },
    // Valid - non-render method without return
    {
      name: 'non-render method without return',
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
    // Note: The rule checks ALL render methods, not just React components
    // Non-React classes with render methods are still checked
    // Valid - arrow function property named render
    {
      name: 'arrow function property named render',
      code: `
        class MyComponent extends Component {
          render = () => <div>Hello</div>;
        }
      `,
    },
    // Valid - getter named render
    {
      name: 'getter named render',
      code: `
        class MyComponent extends Component {
          get render() {
            return () => <div>Hello</div>;
          }
        }
      `,
    },
    // Valid - computed method name
    {
      name: 'computed method name',
      code: `
        class MyComponent extends Component {
          [methodName]() {
            // no return
          }
          render() {
            return <div>Hello</div>;
          }
        }
      `,
    },
  ],
  invalid: [
    // Invalid - render without return
    {
      name: 'render without any return',
      code: `
        class MyComponent extends Component {
          render() {
            console.log('rendering');
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      name: 'render with only variable declarations',
      code: `
        class MyComponent extends Component {
          render() {
            const element = <div>Hello</div>;
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      name: 'render with function call but no return',
      code: `
        class MyComponent extends Component {
          render() {
            this.doSomething();
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      name: 'render with empty body',
      code: `
        class MyComponent extends Component {
          render() {
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      name: 'render with only comments',
      code: `
        class MyComponent extends Component {
          render() {
            // TODO: implement
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
  ],
});

