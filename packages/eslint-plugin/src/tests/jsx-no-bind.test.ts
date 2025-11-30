/**
 * Tests for jsx-no-bind rule
 * Prevent .bind() in JSX (performance issue)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxNoBind } from '../rules/react/jsx-no-bind';

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

describe('jsx-no-bind', () => {
  describe('Valid cases - no bind in JSX', () => {
    ruleTester.run('no bind in JSX is valid', jsxNoBind, {
      valid: [
        // Arrow function (also not ideal but not what this rule checks)
        {
          code: `<button onClick={() => handleClick()}>Click</button>`,
        },
        // Pre-bound method reference
        {
          code: `<button onClick={this.handleClick}>Click</button>`,
        },
        // Variable reference
        {
          code: `<button onClick={handleClick}>Click</button>`,
        },
        // String prop
        {
          code: `<button className="btn">Click</button>`,
        },
        // Number prop
        {
          code: `<input maxLength={10} />`,
        },
        // Boolean prop
        {
          code: `<input disabled={true} />`,
        },
        // Object prop
        {
          code: `<div style={{ color: 'red' }}>Text</div>`,
        },
        // Bind outside of JSX (in constructor or class field)
        {
          code: `
            class MyComponent extends Component {
              constructor() {
                this.handleClick = this.handleClick.bind(this);
              }
              render() {
                return <button onClick={this.handleClick}>Click</button>;
              }
            }
          `,
        },
        // No JSX expression container
        {
          code: `<div title="Hello">Content</div>`,
        },
        // Empty element
        {
          code: `<div />`,
        },
        // Function call that's not bind
        {
          code: `<button onClick={handleClick()}>Click</button>`,
        },
        // Method call that's not bind
        {
          code: `<button onClick={this.getHandler()}>Click</button>`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - bind in JSX', () => {
    ruleTester.run('bind in JSX triggers error', jsxNoBind, {
      valid: [],
      invalid: [
        // Basic bind call
        {
          code: `<button onClick={this.handleClick.bind(this)}>Click</button>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // Bind with arguments
        {
          code: `<button onClick={this.handleClick.bind(this, id)}>Click</button>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // Bind with multiple arguments
        {
          code: `<button onClick={this.handleClick.bind(this, id, value)}>Click</button>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // Bind on function
        {
          code: `<button onClick={handleClick.bind(null)}>Click</button>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // Bind in onChange
        {
          code: `<input onChange={this.handleChange.bind(this)} />`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // Bind in onSubmit
        {
          code: `<form onSubmit={this.handleSubmit.bind(this)}>Submit</form>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // Multiple binds in same element
        {
          code: `<button onClick={this.handleClick.bind(this)} onMouseEnter={this.handleHover.bind(this)}>Click</button>`,
          errors: [{ messageId: 'jsxNoBind' }, { messageId: 'jsxNoBind' }],
        },
        // Bind on custom component
        {
          code: `<CustomButton onAction={this.handleAction.bind(this)} />`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', jsxNoBind, {
      valid: [
        // Call expression but not bind
        {
          code: `<button onClick={handler.call(this)}>Click</button>`,
        },
        // Apply is not bind
        {
          code: `<button onClick={handler.apply(this)}>Click</button>`,
        },
        // Method with bind-like name but not actual bind
        {
          code: `<button onClick={this.bindData()}>Click</button>`,
        },
      ],
      invalid: [
        // Nested member expression with bind
        {
          code: `<button onClick={this.handlers.click.bind(this)}>Click</button>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
      ],
    });
  });

  describe('Different event handlers', () => {
    ruleTester.run('different event handlers', jsxNoBind, {
      valid: [],
      invalid: [
        // onFocus
        {
          code: `<input onFocus={this.handleFocus.bind(this)} />`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // onBlur
        {
          code: `<input onBlur={this.handleBlur.bind(this)} />`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // onKeyDown
        {
          code: `<input onKeyDown={this.handleKeyDown.bind(this)} />`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // onMouseMove
        {
          code: `<div onMouseMove={this.handleMouseMove.bind(this)}>Content</div>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
        // onScroll
        {
          code: `<div onScroll={this.handleScroll.bind(this)}>Content</div>`,
          errors: [{ messageId: 'jsxNoBind' }],
        },
      ],
    });
  });
});

