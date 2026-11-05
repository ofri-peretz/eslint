/**
 * Tests for no-this-in-sfc rule
 * Disallow this from being used in stateless functional components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noThisInSfc } from '../../rules/react/no-this-in-sfc';

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

describe('no-this-in-sfc', () => {
  describe('Basic Functionality', () => {
    ruleTester.run('no-this-in-sfc validation', noThisInSfc, {
      valid: [
        {
          name: 'a lowercase function that does not return JSX is not a component',
          code: 'function notAComponent() { return this.value; }',
        },
        {
          name: 'a PascalCase arrow that returns no JSX',
          code: 'const Format = () => this.value;',
        },
        {
          name: 'a module-level arrow that is not a component',
          code: 'const myFunc = () => this.value;',
        },
        {
          name: 'an object method has its own this',
          code: 'const obj = { method: function() { return this.value; } };',
        },
        {
          name: 'a plain helper function has its own this',
          code: 'function helper() { const value = this.something; return this.other; }',
        },
        {
          name: 'a PascalCase constructor function that does not return JSX',
          code: 'function Counter() { this.count = 0; }',
        },
        {
          name: 'a nested function inside a component has its own this',
          code: 'function Card() { const f = function () { return this.x; }; return <div>{f()}</div>; }',
        },
        {
          name: 'a lowercase render helper is not a component',
          code: 'function renderRow() { return <div>{this.props.x}</div>; }',
        },
        {
          name: 'a function with an explicit this parameter',
          code: 'function Card(this: any) { return <div>{this.x}</div>; }',
        },
        {
          name: 'a function passed to something other than memo or forwardRef',
          code: 'const Card = wrap(() => <div>{this.x}</div>);',
        },
        {
          name: 'a class field initializer this is the instance',
          code: 'class Store { handler = () => this.x; }',
        },
        // Class components - this is allowed
        {
          name: '`this` in a class render, where it is the instance',
          code: `
            class MyComponent extends React.Component {
              render() {
                return <div>{this.props.value}</div>;
              }
            }
          `,
        },
        {
          code: `
            class Component {
              method() {
                return this.value;
              }
            }
          `,
        },
        // Class expressions
        {
          code: `
            const MyComponent = class extends React.Component {
              render() {
                return this.props.value;
              }
            };
          `,
        },
        {
          /*
           * A receiver-forwarding wrapper. The signature declares `this`, so
           * it is a contract the author wrote, not a component that forgot it
           * has no instance.
           * @found burgee FP/FN sweep 2026-09-15, packages/closeout/src/once.ts:54
           */
          name: 'FP: a function that declares an explicit TS `this` parameter owns its receiver',
          code: `
            function once(fn: (...args: unknown[]) => unknown) {
              return function (this: unknown, ...args: unknown[]) {
                return fn.apply(this, args);
              };
            }
          `,
        },
        {
          // A nested class must not clear the enclosing class on exit, or
          // valid class-component \`this\` after it reports.
          // @found reasoned while fixing the declared-this finding (burgee FP/FN sweep 2026-09-20), not seen in real code
          name: 'FP: `this` in a class render stays valid after a nested class closes',
          code: `
            class Outer extends React.Component {
              render() {
                class Inner {}
                return <div>{this.props.value}</div>;
              }
            }
          `,
        },
      ],
      invalid: [
        // this in functional components (should use hooks instead)
        {
          code: `
            function MyComponent() {
              return <div>{this.props.value}</div>;
            }
          `,
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
        {
          code: `
            const MyComponent = () => {
              return <div>{this.state.value}</div>;
            };
          `,
          errors: [
            {
              messageId: 'noThisInSfc',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noThisInSfc, {
      valid: [
        // Empty classes
        {
          code: 'class Empty {}',
        },
        {
          name: 'a class component and a helper with its own this',
          code: `
            class MyComponent extends React.Component {
              render() {
                return this.props.value;
              }
            }

            function helper() {
              return this.value;
            }
          `,
        },
        // Class with only static methods
        {
          code: `
            class Utils {
              static helper() {
                return 'no this used';
              }
            }
          `,
        },
      ],
      invalid: [
        {
          name: 'this in a component that also declares helpers',
          code: 'function Card() { const f = () => 1; function g() { return <i />; } class X {} return <div>{this.x}{f()}</div>; }',
          errors: [{ messageId: 'noThisInSfc' }],
        },
        {
          name: 'this in an expression-bodied arrow component',
          code: 'const Card = () => (x ? null : <i>{this.x}</i>);',
          errors: [{ messageId: 'noThisInSfc' }],
        },
        {
          name: 'this in a memo component on a named import',
          code: 'import { memo } from "react"; const Card = memo(() => <div>{this.props.x}</div>);',
          errors: [{ messageId: 'noThisInSfc' }],
        },
        {
          name: 'this in an arrow inside a forwardRef component',
          code: 'import React from "react"; const Card = React.forwardRef(function (props, ref) { const f = () => this.x; return <div ref={ref}>{f()}</div>; });',
          errors: [{ messageId: 'noThisInSfc' }],
        },
        {
          name: 'this in an anonymous export default function component',
          code: 'export default function (props) { return cond ? <div>{this.x}</div> : null; }',
          errors: [{ messageId: 'noThisInSfc' }],
        },
        {
          name: 'this in a function expression component that renders conditionally',
          code: 'const Card = function () { if (x) { return null; } return ok && <b>{this.x}</b>; };',
          errors: [{ messageId: 'noThisInSfc' }],
        },
      ],
    });
  });
});
