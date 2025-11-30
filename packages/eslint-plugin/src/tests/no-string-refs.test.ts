/**
 * Tests for no-string-refs rule
 * Disallow string refs (deprecated pattern)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noStringRefs } from '../rules/react/no-string-refs';

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

describe('no-string-refs', () => {
  describe('Basic Functionality', () => {
    ruleTester.run('no-string-refs validation', noStringRefs, {
      valid: [
        // No ref prop
        {
          code: '<div>Hello World</div>',
        },
        {
          code: '<Component prop="value" />',
        },
        // Callback refs (modern pattern)
        {
          code: '<input ref={(el) => this.inputRef = el} />',
        },
        {
          code: '<div ref={this.myRef} />',
        },
        // createRef usage
        {
          code: `
            class MyComponent extends React.Component {
              constructor(props) {
                super(props);
                this.myRef = React.createRef();
              }

              render() {
                return <div ref={this.myRef} />;
              }
            }
          `,
        },
        // useRef hook (functional components)
        {
          code: `
            import { useRef } from 'react';

            function MyComponent() {
              const myRef = useRef();
              return <div ref={myRef} />;
            }
          `,
        },
      ],
      invalid: [
        // String ref usage
        {
          code: '<input ref="myInput" />',
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // String ref with quotes
        {
          code: '<div ref="myDiv" />',
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // String ref in component
        {
          code: '<MyComponent ref="customRef" />',
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // Multiple string refs
        {
          code: `
            <div>
              <input ref="input1" />
              <button ref="button1">Click</button>
              <div ref="container" />
            </div>
          `,
          errors: [
            {
              messageId: 'noStringRefs',
            },
            {
              messageId: 'noStringRefs',
            },
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // String ref with complex JSX
        {
          code: `
            <Modal
              ref="modalRef"
              title="Confirm"
            >
              <p>Are you sure?</p>
            </Modal>
          `,
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
      ],
    });
  });

  describe('Modern Alternatives', () => {
    ruleTester.run('modern alternatives', noStringRefs, {
      valid: [
        // useRef with functional components
        {
          code: `
            import { useRef, useEffect } from 'react';

            function AutoFocusInput() {
              const inputRef = useRef(null);

              useEffect(() => {
                inputRef.current?.focus();
              }, []);

              return <input ref={inputRef} />;
            }
          `,
        },
        // Callback ref with cleanup
        {
          code: `
            class MyComponent extends React.Component {
              setRef = (element) => {
                this.myElement = element;
              }

              componentWillUnmount() {
                // cleanup
              }

              render() {
                return <div ref={this.setRef} />;
              }
            }
          `,
        },
        // createRef with class component
        {
          code: `
            class VideoPlayer extends React.Component {
              constructor(props) {
                super(props);
                this.videoRef = React.createRef();
              }

              play = () => {
                this.videoRef.current?.play();
              }

              render() {
                return <video ref={this.videoRef} src={this.props.src} />;
              }
            }
          `,
        },
      ],
      invalid: [
        // Anti-pattern: mixing string refs with modern patterns
        {
          code: `
            class MixedRefs extends React.Component {
              constructor(props) {
                super(props);
                this.callbackRef = React.createRef();
              }

              render() {
                return (
                  <div>
                    <input ref={this.callbackRef} />
                    <button ref="stringRef">Bad</button>
                  </div>
                );
              }
            }
          `,
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
      ],
    });
  });

  describe('Migration Patterns', () => {
    ruleTester.run('migration patterns', noStringRefs, {
      valid: [
        // Before: string ref (invalid)
        // After: callback ref (valid)
        {
          code: '<input ref={(el) => this.input = el} />',
        },
        // Before: string ref (invalid)
        // After: createRef (valid)
        {
          code: `
            class MyComponent extends React.Component {
              constructor(props) {
                super(props);
                this.inputRef = React.createRef();
              }

              render() {
                return <input ref={this.inputRef} />;
              }
            }
          `,
        },
      ],
      invalid: [
        // String refs that need migration
        {
          code: `
            class OldComponent extends React.Component {
              componentDidMount() {
                // Accessing via string ref
                const element = this.refs.myElement;
              }

              render() {
                return <div ref="myElement">Old pattern</div>;
              }
            }
          `,
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // Library components with string refs
        {
          code: `
            import { SomeLibrary } from 'some-lib';

            function App() {
              return <SomeLibrary ref="libRef" />;
            }
          `,
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noStringRefs, {
      valid: [
        // ref as variable name (not JSX prop)
        {
          code: `
            const ref = 'not a prop';
            console.log(ref);
          `,
        },
        // ref in destructuring (not JSX)
        {
          code: `
            function process({ ref }) {
              return ref;
            }
          `,
        },
        // ref prop with non-string value
        {
          code: '<div ref={null} />',
        },
        {
          code: '<div ref={undefined} />',
        },
      ],
      invalid: [
        // Empty string ref
        {
          code: '<div ref="" />',
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // ref prop with string in quotes
        {
          code: '<div ref={"myRef"} />',
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // ref prop with template literal
        {
          code: '<div ref={`ref-${id}`} />',
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
        // TypeScript with string ref
        {
          code: '<div ref="myRef" />',
          filename: '/src/component.tsx',
          errors: [
            {
              messageId: 'noStringRefs',
            },
          ],
        },
      ],
    });
  });
});
