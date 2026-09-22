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
    // A switch guarantees a return only when no path escapes it. Before the
    // path-sensitive rewrite these three were indistinguishable from the
    // invalid shapes below: the check asked only "does any clause return?".
    {
      name: 'a switch whose every clause returns, with a default, is complete',
      code: `class C extends React.Component {
      render() {
        switch (this.props.k) {
          case 1: return <A/>;
          default: return <B/>;
        }
      }
    }`,
    },
    // Fallthrough — an empty clause inherits the returning clause below it.
    // A clause is NOT required to carry a return of its own.
    {
      name: 'an empty clause falls through and inherits the clause below it',
      code: `class C extends React.Component {
      render() {
        switch (this.props.k) {
          case 1:
          case 2: return <A/>;
          default: return <B/>;
        }
      }
    }`,
    },
    // A clause may return through if/else rather than a bare ReturnStatement.
    {
      name: 'a clause may return through if/else, not only a bare return',
      code: `class C extends React.Component {
      render() {
        switch (this.props.k) {
          case 1:
            if (x) { return <A/>; } else { return <B/>; }
          default: return <C/>;
        }
      }
    }`,
    },
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
    // `render` is not a React word. Detection was the method NAME and nothing
    // else, so a terminal painter, a canvas, a template engine — anything with
    // a method called `render` — drew a CRITICAL "must return a value".
    // From burgee packages/caique/src/inquirer-screen.ts:206, a ScreenManager
    // that writes ANSI escapes to a readline stream and is declared `: void`.
    {
      name: 'a class with no superclass is not a React component',
      code: `
        class ScreenManager {
          render(content, bottom) {
            this.out.write(content + bottom);
          }
        }
      `,
    },
    {
      name: 'a class extending a non-React base is not a React component',
      code: `
        class Painter extends EventEmitter {
          render(frame) {
            this.stream.write(frame);
          }
        }
      `,
    },
    {
      name: 'a non-React class is not saved by a React component elsewhere in the file',
      code: `
        class ScreenManager {
          render(content) {
            this.out.write(content);
          }
        }
        class Ok extends React.Component {
          render() {
            return <div />;
          }
        }
      `,
    },
    // The gate accepts four spellings of a React base and nothing else. Each
    // rejection below is a class whose `render` is now unchecked; they are
    // recorded in docs/KNOWN-LIMITATIONS.md.
    {
      name: 'a base reached through a call is not resolvable in one file',
      code: `
        class Wrapped extends withRouter(React.Component) {
          render() {
            this.paint();
          }
        }
      `,
    },
    {
      name: 'a member base on something other than React is not a React base',
      code: `
        class Widget extends Toolkit.Component {
          render() {
            this.paint();
          }
        }
      `,
    },
    {
      name: 'a React member that is not Component or PureComponent is not a base',
      code: `
        class Widget extends React.Fragment {
          render() {
            this.paint();
          }
        }
      `,
    },
  ],
  invalid: [
    // PureComponent is a React base in both spellings, so a render that
    // returns nothing is still a defect.
    {
      name: 'a PureComponent render that returns nothing still reports',
      code: `
        class MyComponent extends PureComponent {
          render() {
            this.doSomething();
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      name: 'the React.PureComponent spelling reports too',
      code: `
        class MyComponent extends React.PureComponent {
          render() {
            this.doSomething();
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      name: 'a class expression is a class too',
      code: `
        const MyComponent = class extends React.Component {
          render() {
            this.doSomething();
          }
        };
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      // No `default` — an unmatched selector falls straight out and render()
      // returns undefined.
      name: 'a switch with no default lets an unmatched selector escape',
      code: `class C extends React.Component {
        render() {
          switch (this.props.k) {
            case 1: return <A/>;
          }
        }
      }`,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      // A clause exits via `break` without returning.
      name: 'a clause that breaks without returning leaves render() empty',
      code: `class C extends React.Component {
        render() {
          switch (this.props.k) {
            case 1: break;
            default: return <A/>;
          }
        }
      }`,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      // The `default` itself breaks out.
      name: 'a default that breaks without returning leaves render() empty',
      code: `class C extends React.Component {
        render() {
          switch (this.props.k) {
            case 1: return <A/>;
            default: break;
          }
        }
      }`,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
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
    // The rule's own docs print this shape under "### ❌ Incorrect"
    // (docs/rules/require-render-return.md:53-60), paired with a "### ✅ Correct"
    // block of the same class that differs only by a trailing `return null;`.
    // An `if` with no `else` falls through and renders nothing.
    {
      name: 'render returning only inside an if with no else falls through and must report',
      code: `
        class AnotherComponent extends React.Component {
          render() {
            if (this.props.show) {
              return <div>Content</div>;
            }
            // Missing return for else case
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
    {
      name: 'render with an if/else where only the consequent returns must report',
      code: `
        class MyComponent extends Component {
          render() {
            if (this.props.ok) {
              return <div>OK</div>;
            } else {
              this.log();
            }
          }
        }
      `,
      errors: [{ messageId: 'requireRenderReturn' }],
    },
  ],
});
