/**
 * Tests for require-default-props rule
 * Require default props
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireDefaultProps } from '../../rules/react/require-default-props';

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

describe('require-default-props', () => {
  describe('Valid cases - props with defaults', () => {
    ruleTester.run('props with defaults are valid', requireDefaultProps, {
      valid: [
        // All optional props have defaultProps
        {
          name: 'defaults supplied',
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string,
                age: PropTypes.number
              };
              static defaultProps = {
                name: 'Default',
                age: 18
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
        },
        // Required props don't need defaults
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string.isRequired,
                age: PropTypes.number.isRequired
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
        },
        // Mix of required and optional with defaults
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string.isRequired,
                age: PropTypes.number
              };
              static defaultProps = {
                age: 18
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
        },
        // No propTypes at all
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Empty propTypes
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {};
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Non-React class
        {
          code: `
            class Helper {
              static propTypes = {
                name: PropTypes.string
              };
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - missing defaults', () => {
    ruleTester.run('missing defaults trigger errors', requireDefaultProps, {
      valid: [],
      invalid: [
        // Optional prop without default
        {
          name: 'an optional prop with no default',
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
          errors: [{ messageId: 'requireDefaultProps' }],
        },
        // Multiple optional props without defaults
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string,
                age: PropTypes.number,
                active: PropTypes.bool
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
          errors: [
            { messageId: 'requireDefaultProps' },
            { messageId: 'requireDefaultProps' },
            { messageId: 'requireDefaultProps' },
          ],
        },
        // Partial defaults provided
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string,
                age: PropTypes.number
              };
              static defaultProps = {
                name: 'Default'
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
          errors: [{ messageId: 'requireDefaultProps' }],
        },
      ],
    });
  });

  describe('forbidDefaultForRequired option', () => {
    ruleTester.run('forbidDefaultForRequired validation', requireDefaultProps, {
      valid: [
        // Required props without defaults (correct)
        {
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
          options: [{ forbidDefaultForRequired: true }],
        },
      ],
      invalid: [
        // Required prop with default (not allowed when forbidDefaultForRequired is true)
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                name: PropTypes.string.isRequired
              };
              static defaultProps = {
                name: 'Default'
              };
              render() {
                return <div>{this.props.name}</div>;
              }
            }
          `,
          options: [{ forbidDefaultForRequired: true }],
          errors: [{ messageId: 'requireDefaultProps' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', requireDefaultProps, {
      valid: [
        {
          name: 'a runtime-computed key names no prop',
          code: `
            class MyComponent extends Component {
              static propTypes = {
                [key]: PropTypes.string
              };
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        {
          name: 'defaults assigned after the class count',
          code: `
            class MyComponent extends Component {
              static propTypes = { variant: PropTypes.string };
              render() { return null; }
            }
            MyComponent.defaultProps = { variant: 'primary' };
          `,
        },
        {
          name: 'a declared static with no value',
          code: `class MyComponent extends Component { state = {}; static styles = {}; static propTypes: any; static defaultProps; }`,
        },
        {
          name: 'a Component from another library is not React',
          code: `
            import { Component } from 'lit';
            class El extends Component { static propTypes = { variant: PropTypes.string }; }
          `,
        },
        {
          name: 'an assignment to a non-class binding',
          code: `
            class MyComponent extends Component { render() { return null; } }
            const other = {};
            other.propTypes = { variant: PropTypes.string };
            function make() {}
            make.propTypes = { variant: PropTypes.string };
            Undeclared.propTypes = { variant: PropTypes.string };
            MyComponent.propTypes = shared;
            MyComponent.displayName = { x: 1 };
            MyComponent[key] = { x: 1 };
          `,
        },
        // Spread in propTypes (skipped)
        {
          code: `
            class MyComponent extends Component {
              static propTypes = {
                ...otherPropTypes,
                name: PropTypes.string.isRequired
              };
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
      ],
      invalid: [
        {
          name: 'a computed string key is the same prop',
          code: `
            class MyComponent extends Component {
              static propTypes = {
                ['computed']: PropTypes.string
              };
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: [{ messageId: 'requireDefaultProps' }],
        },
        {
          name: 'propTypes assigned after a renamed-import class, with a quoted key',
          code: `
            import { Component as Base } from 'react';
            class MyComponent extends Base { render() { return null; } }
            MyComponent.propTypes = { 'aria-label': PropTypes.string };
          `,
          errors: [{ messageId: 'requireDefaultProps' }],
        },
        {
          name: 'propTypes assigned to a class-expression binding',
          code: `
            const MyComponent = class extends React.Component {};
            (MyComponent as any).propTypes = { variant: PropTypes.string };
          `,
          errors: [{ messageId: 'requireDefaultProps' }],
        },
        {
          name: 'a class expression component, with a computed propTypes static',
          code: `
            const MyComponent = class extends React.Component {
              static ['propTypes'] = { variant: PropTypes.string };
            };
          `,
          errors: [{ messageId: 'requireDefaultProps' }],
        },
      ],
    });
  });
});

