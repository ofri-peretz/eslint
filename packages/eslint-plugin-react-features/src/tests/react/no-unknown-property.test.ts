/**
 * Tests for no-unknown-property rule
 * Disallow unknown DOM properties in JSX
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnknownProperty } from '../../rules/react/no-unknown-property';

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

describe('no-unknown-property', () => {
  describe('Valid HTML Attributes', () => {
    ruleTester.run('valid HTML attributes', noUnknownProperty, {
      valid: [
        // Standard HTML attributes
        {
          code: '<input type="text" value="test" />',
        },
        {
          code: '<div className="container" id="main" />',
        },
        {
          code: '<img src="image.jpg" alt="description" />',
        },
        {
          code: '<a href="https://example.com" target="_blank" rel="noopener" />',
        },
        // React-specific attributes
        {
          code: '<div key="1" ref={myRef} />',
        },
        {
          code: '<input defaultChecked={true} defaultValue="test" />',
        },
        // Event handlers
        {
          code: '<button onClick={handleClick} onChange={handleChange} />',
        },
        // Data attributes
        {
          code: '<div data-testid="my-test" data-value="123" />',
        },
        // Aria attributes
        {
          code: '<button aria-label="Close" aria-expanded="false" />',
        },
        // SVG attributes
        {
          code: '<svg width="100" height="100" viewBox="0 0 100 100" />',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid HTML Attributes', () => {
    ruleTester.run('invalid HTML attributes', noUnknownProperty, {
      valid: [],
      invalid: [
        // Invalid attributes
        {
          code: '<div classname="test" />', // Should be className
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<input onchange={handleChange} />', // Should be onChange
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<div for="test" />', // Should be htmlFor
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<meta http-equiv="test" />', // Should be httpEquiv
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<input maxlength="10" />', // Should be maxLength
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<td colspan="2" />', // Should be colSpan
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<div contenteditable="true" />', // Should be contentEditable
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<input readonly="true" />', // Should be readOnly
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<input tabindex="0" />', // Should be tabIndex
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        {
          code: '<div custom-prop="value" />', // Custom property not in allowlist
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', noUnknownProperty, {
      valid: [
        // Complex valid component
        {
          code: `
            <form
              className="form"
              onSubmit={handleSubmit}
              noValidate
            >
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                aria-describedby="email-help"
              />
            </form>
          `,
        },
        // Mixed valid attributes
        {
          code: `
            <div
              className="card"
              role="article"
              data-testid="card"
              onClick={handleClick}
            >
              <h2>Card Title</h2>
            </div>
          `,
        },
      ],
      invalid: [
        // Multiple invalid attributes
        {
          code: `
            <input
              type="text"
              classname="input"
              onchange={handleChange}
              maxlength="50"
            />
          `,
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        // Invalid attributes in nested elements
        {
          code: `
            <div className="container">
              <span classname="text">Text</span>
              <button onclick={handleClick}>Click</button>
            </div>
          `,
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript Support', () => {
    ruleTester.run('TypeScript support', noUnknownProperty, {
      valid: [
        // TypeScript with valid attributes
        {
          code: '<input type="text" ref={inputRef} />',
          filename: '/src/component.tsx',
        },
        // Generic components
        {
          code: '<MyComponent<string> className="test" />',
          filename: '/src/component.tsx',
        },
      ],
      invalid: [
        // TypeScript with invalid attributes
        {
          code: '<div classname="test" />',
          filename: '/src/component.tsx',
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        // TypeScript with multiple invalid attributes
        {
          code: '<input type="text" classname="input" onchange={handleChange} />',
          filename: '/src/component.tsx',
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noUnknownProperty, {
      valid: [
        // Spread operator (can't validate spread)
        {
          code: '<Component {...props} />',
        },
        // Dynamic attributes
        {
          code: '<div {...{ className: "test" }} />',
        },
      ],
      invalid: [
        // Invalid attribute with spread
        {
          code: '<div className="test" classname="invalid" {...props} />',
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        // Invalid attribute with expression
        {
          code: '<input type="text" onchange={condition ? handler1 : handler2} />',
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
      ],
    });
  });

  describe('Real World Examples', () => {
    ruleTester.run('real world examples', noUnknownProperty, {
      valid: [
        // Form with proper attributes
        {
          code: `
            function LoginForm() {
              return (
                <form onSubmit={handleSubmit} noValidate>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    aria-describedby="email-error"
                  />
                  <button type="submit" disabled={loading}>
                    Login
                  </button>
                </form>
              );
            }
          `,
        },
        // Card component
        {
          code: `
            function Card({ title, children }) {
              return (
                <div className="card" role="article">
                  <h3>{title}</h3>
                  <div className="card-content">
                    {children}
                  </div>
                </div>
              );
            }
          `,
        },
      ],
      invalid: [
        // Common mistakes in forms
        {
          code: `
            function BadForm() {
              return (
                <form onsubmit={handleSubmit}>
                  <input
                    type="text"
                    classname="input"
                    maxlength="100"
                    readonly
                  />
                  <button onclick={handleClick}>Submit</button>
                </form>
              );
            }
          `,
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
        // Table with invalid attributes
        {
          code: `
            function Table() {
              return (
                <table>
                  <tr>
                    <td colspan="2" rowspan="1">Cell</td>
                  </tr>
                </table>
              );
            }
          `,
          errors: [
            {
              messageId: 'noUnknownProperty',
            },
            {
              messageId: 'noUnknownProperty',
            },
          ],
        },
      ],
    });
  });
});
