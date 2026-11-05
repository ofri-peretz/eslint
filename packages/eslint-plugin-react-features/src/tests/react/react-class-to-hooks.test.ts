/**
 * Comprehensive tests for react-class-to-hooks rule
 * Migration: Detects React class components that can be migrated to hooks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { reactClassToHooks } from '../../rules/migration/react-class-to-hooks';

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

describe('react-class-to-hooks', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - functional components', reactClassToHooks, {
      valid: [
        // Functional components
        {
          name: 'a function component',
          code: 'function MyComponent() { return <div>Hello</div>; }',
        },
        {
          code: 'const MyComponent = () => <div>Hello</div>;',
        },
        // Non-React classes
        {
          code: 'class MyClass { }',
        },
        // Note: Rule detects ALL React class components, including PureComponent
        // There's no option to ignore PureComponent
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Class Components', () => {
    ruleTester.run('invalid - React class components', reactClassToHooks, {
      valid: [],
      invalid: [
        {
          name: 'a class component where the configuration wants a function',
          code: 'class MyComponent extends Component { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
        {
          code: 'class MyComponent extends React.Component { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
        /*
         * The computed spelling, through the SUGGESTION rather than just the
         * report. The rule learned to recognise `React['Component']` because a
         * bundler emits it; the fixer's regex still consumed only `React`, so
         * the suggestion produced
         *
         *     function MyComponent(props)['Component'] { }
         *
         * which does not parse. A suggestion that emits invalid code is worse
         * than no suggestion — the reporting side looked correct the whole
         * time, which is why this asserts the OUTPUT and not just the
         * messageId.
         */
        ...[
          { label: 'single-quoted', superClass: "React['Component']" },
          { label: 'double-quoted', superClass: 'React["PureComponent"]' },
        ].map(({ label, superClass }) => ({
          name: `a ${label} computed superclass fixes to valid code`,
          code: `class MyComponent extends ${superClass} { }`,
          errors: [
            {
              messageId: 'migrateToHooks' as const,
              suggestions: [
                {
                  messageId: 'convertToFunction' as const,
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        })),
        {
          code: 'class MyComponent extends PureComponent { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', reactClassToHooks, {
      valid: [],
      invalid: [
        {
          code: 'class MyComponent extends Component { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              // Note: Rule only provides suggestions for simple components (complexity: simple)
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', reactClassToHooks, {
      valid: [
        // Note: Rule doesn't have ignorePureRenderComponents option
      ],
      invalid: [
        {
          code: 'class MyComponent extends Component { }',
          options: [{ allowComplexLifecycle: true }],
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Line 101: isReactComponent returns false
    ruleTester.run('line 101 - non-React class', reactClassToHooks, {
      valid: [
        {
          code: 'class MyClass extends BaseClass { }',
        },
        {
          code: 'class MyClass { }',
        },
      ],
      invalid: [],
    });

    // Lines 124-129, 134: Lifecycle method detection
    ruleTester.run('line 124-129, 134 - lifecycle methods', reactClassToHooks, {
      valid: [],
      invalid: [
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {
                console.log('mounted');
              }
            }
          `,
          errors: [
            {
              messageId: 'migrateToHooks',
              // Rule no longer provides suggestions for components with lifecycle methods
              // The fixer doesn't work properly for them
            },
          ],
        },
        {
          code: `
            class MyComponent extends Component {
              componentWillUnmount() {
                console.log('unmounting');
              }
            }
          `,
          errors: [
            {
              messageId: 'migrateToHooks',
              // Rule no longer provides suggestions for components with lifecycle methods
            },
          ],
        },
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate() {
                return true;
              }
            }
          `,
          errors: [
            {
              messageId: 'migrateToHooks',
              // Rule no longer provides suggestions for components with lifecycle methods
            },
          ],
        },
      ],
    });

    // Line 143, 159: Complex lifecycle methods
    ruleTester.run('line 143, 159 - complex lifecycle', reactClassToHooks, {
      valid: [
        {
          code: `
            class MyComponent extends Component {
              static getDerivedStateFromProps() {
                return null;
              }
            }
          `,
          options: [{ allowComplexLifecycle: true }],
        },
        {
          code: `
            class MyComponent extends Component {
              getSnapshotBeforeUpdate() {
                return null;
              }
            }
          `,
          // getSnapshotBeforeUpdate is now in lifecycleMap and detected as complex
          // With allowComplexLifecycle: true, the rule skips it (no error)
          options: [{ allowComplexLifecycle: true }],
        },
      ],
      invalid: [
        {
          code: `
            class MyComponent extends Component {
              static getDerivedStateFromProps() {
                return null;
              }
            }
          `,
          options: [{ allowComplexLifecycle: false }],
          errors: [{ messageId: 'migrateToHooks' }],
        },
        {
          code: `
            class MyComponent extends Component {
              getSnapshotBeforeUpdate() {
                return null;
              }
            }
          `,
          // getSnapshotBeforeUpdate is now detected as complex
          // With allowComplexLifecycle: false, it reports an error
          options: [{ allowComplexLifecycle: false }],
          errors: [{ messageId: 'migrateToHooks' }],
        },
      ],
    });

    // Line 183: this.state replacement in fix
    ruleTester.run('line 183 - this.state replacement', reactClassToHooks, {
      valid: [],
      invalid: [
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>{this.state.count}</div>;
              }
            }
          `,
          errors: [
            {
              messageId: 'migrateToHooks',
              // Rule no longer provides suggestions for components with render() method
              // The fixer doesn't work properly for them
            },
          ],
        },
      ],
    });
  });
});

describe('react-class-to-hooks: React class components by binding', () => {
  ruleTester.run('bindings, error boundaries and options', reactClassToHooks, {
    valid: [
      {
        name: 'a Component the file declares itself is not React',
        code: 'class Component {} class A extends Component { render() { return null; } }',
      },
      {
        name: 'Component imported from another library is not React',
        code: "import { Component } from 'lit'; class A extends Component { render() { return null; } }",
      },
      {
        name: 'an error boundary (componentDidCatch) has no hooks equivalent',
        code: "import { Component } from 'react'; class Boundary extends Component { componentDidCatch(e) { log(e); } render() { return this.props.children; } }",
      },
      {
        name: 'an error boundary (static getDerivedStateFromError) has no hooks equivalent',
        code: "import React from 'react'; const Boundary = class extends React.Component { static getDerivedStateFromError() { return { failed: true }; } render() { return null; } };",
      },
      {
        name: 'ignorePureRenderComponents skips a PureComponent class',
        code: "import { PureComponent } from 'react'; class A extends PureComponent { render() { return null; } }",
        options: [{ ignorePureRenderComponents: true }],
      },
      {
        name: 'allowComplexLifecycle skips a quoted getSnapshotBeforeUpdate',
        code: "import { Component } from 'react'; class A extends Component { 'getSnapshotBeforeUpdate'() { return null; } render() { return null; } }",
        options: [{ allowComplexLifecycle: true }],
      },
    ],
    invalid: [
      {
        name: 'a renamed Component import',
        code: "import { Component as Base } from 'react'; class A extends Base { render() { return null; } }",
        errors: [
          {
            messageId: 'migrateToHooks',
            data: { componentName: 'A', complexity: 'simple' },
          },
        ],
      },
      {
        name: 'a namespace import',
        code: "import * as R from 'react'; class A extends R.Component { render() { return null; } }",
        errors: [{ messageId: 'migrateToHooks' }],
      },
      {
        name: 'a class expression takes its variable name',
        code: "import { Component } from 'react'; const Profile = class extends Component { render() { return null; } };",
        errors: [
          {
            messageId: 'migrateToHooks',
            data: { componentName: 'Profile', complexity: 'simple' },
          },
        ],
      },
      {
        name: 'an anonymous default-exported class',
        code: "import { Component } from 'react'; export default class extends Component { render() { return null; } }",
        errors: [
          {
            messageId: 'migrateToHooks',
            data: { componentName: 'default', complexity: 'simple' },
          },
        ],
      },
      {
        name: 'a class expression passed as an argument',
        code: "import { Component } from 'react'; wrap(class extends Component { render() { return null; } });",
        errors: [
          {
            messageId: 'migrateToHooks',
            data: { componentName: 'default', complexity: 'simple' },
          },
        ],
      },
      {
        name: 'ignorePureRenderComponents keeps a Component class',
        code: "import { Component } from 'react'; class A extends Component { render() { return null; } }",
        options: [{ ignorePureRenderComponents: true }],
        errors: [{ messageId: 'migrateToHooks' }],
      },
      {
        name: 'a quoted getSnapshotBeforeUpdate is a complex lifecycle',
        code: "import { Component } from 'react'; class A extends Component { 'getSnapshotBeforeUpdate'() { return null; } render() { return null; } }",
        errors: [
          {
            messageId: 'migrateToHooks',
            data: { componentName: 'A', complexity: 'complex' },
          },
        ],
      },
      {
        name: 'a static componentDidCatch is not an error boundary',
        code: "import { Component } from 'react'; class A extends Component { static componentDidCatch() {} render() { return null; } }",
        errors: [{ messageId: 'migrateToHooks' }],
      },
      {
        name: 'an instance getDerivedStateFromError is not an error boundary',
        code: "import { Component } from 'react'; class A extends Component { getDerivedStateFromError() {} render() { return null; } }",
        errors: [{ messageId: 'migrateToHooks' }],
      },
    ],
  });
});
