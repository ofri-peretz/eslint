/**
 * Comprehensive tests for role-supports-aria-props rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { roleSupportsAriaProps } from '../rules/role-supports-aria-props';

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

describe('role-supports-aria-props', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - elements with supported ARIA properties', roleSupportsAriaProps, {
      valid: [
        // Elements without roles or ARIA properties
        {
          code: '<div>Content</div>',
        },
        {
          code: '<button>Click me</button>',
        },
        // Elements with roles and supported ARIA properties
        {
          code: '<li role="radio" aria-checked="false"></li>',
        },
        {
          code: '<div role="button" aria-pressed="false"></div>',
        },
        {
          code: '<div role="alert" aria-atomic="true"></div>',
        },
        {
          code: '<div role="progressbar" aria-valuemax="100" aria-valuemin="0" aria-valuenow="50" aria-valuetext="50%"></div>',
        },
        {
          code: '<div role="checkbox" aria-checked="mixed"></div>',
        },
        {
          code: '<div role="combobox" aria-expanded="false" aria-activedescendant="option1"></div>',
        },
        {
          code: '<div role="textbox" aria-activedescendant="cursor"></div>',
        },
        // Implicit roles with supported properties
        {
          code: '<a href="#" aria-expanded="true">Link</a>',
        },
        {
          code: '<button aria-pressed="true">Button</button>',
        },
        // Elements without explicit roles (no validation performed for unknown implicit roles)
        {
          code: '<select aria-expanded="true"></select>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsupported ARIA Properties', () => {
    ruleTester.run('invalid - elements with unsupported ARIA properties', roleSupportsAriaProps, {
      valid: [],
      invalid: [
        {
          code: '<li aria-required role="radio"></li>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'radio',
                prop: 'aria-required',
              },
            },
          ],
        },
        {
          code: '<div role="button" aria-checked="true"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'button',
                prop: 'aria-checked',
              },
            },
          ],
        },
        {
          code: '<div role="link" aria-pressed="true"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'link',
                prop: 'aria-pressed',
              },
            },
          ],
        },
        {
          code: '<div role="alert" aria-checked="false"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'alert',
                prop: 'aria-checked',
              },
            },
          ],
        },
        {
          code: '<div role="progressbar" aria-checked="true"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'progressbar',
                prop: 'aria-checked',
              },
            },
          ],
        },
        {
          code: '<div role="checkbox" aria-valuemax="10"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'checkbox',
                prop: 'aria-valuemax',
              },
            },
          ],
        },
        {
          code: '<div role="combobox" aria-pressed="true"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'combobox',
                prop: 'aria-pressed',
              },
            },
          ],
        },
        {
          code: '<div role="textbox" aria-checked="false"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'textbox',
                prop: 'aria-checked',
              },
            },
          ],
        },
        // Implicit roles with unsupported properties
        {
          code: '<button aria-checked="true"></button>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'button',
                prop: 'aria-checked',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Implicit Roles', () => {
    ruleTester.run('implicit roles from HTML elements', roleSupportsAriaProps, {
      valid: [
        // link role supports aria-expanded
        {
          code: '<a href="#" aria-expanded="true">Link</a>',
        },
        // button role supports aria-pressed
        {
          code: '<button aria-pressed="true">Button</button>',
        },
        // textarea has implicit textbox role which supports aria-multiline
        {
          code: '<textarea aria-multiline="true"></textarea>',
        },
      ],
      invalid: [
        // link role does NOT support aria-pressed
        {
          code: '<a href="#" aria-pressed="true">Link</a>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'link',
                prop: 'aria-pressed',
              },
            },
          ],
        },
        // button role does NOT support aria-checked
        {
          code: '<button aria-checked="true">Button</button>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'button',
                prop: 'aria-checked',
              },
            },
          ],
        },
        // textbox role (implicit for input) does NOT support aria-expanded
        {
          code: '<input aria-expanded="false" />',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'textbox',
                prop: 'aria-expanded',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Multiple ARIA Properties', () => {
    ruleTester.run('multiple ARIA properties', roleSupportsAriaProps, {
      valid: [
        // progressbar supports aria-valuemax, aria-valuemin, aria-valuenow
        {
          code: '<div role="progressbar" aria-valuemax="100" aria-valuemin="0" aria-valuenow="50"></div>',
        },
        // combobox supports multiple ARIA properties
        {
          code: '<div role="combobox" aria-expanded="false" aria-activedescendant="option1"></div>',
        },
      ],
      invalid: [
        // button supports aria-pressed but NOT aria-checked
        {
          code: '<div role="button" aria-pressed="true" aria-checked="false"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'button',
                prop: 'aria-checked',
              },
            },
          ],
        },
        // checkbox supports aria-checked but NOT aria-valuemax
        {
          code: '<div role="checkbox" aria-checked="true" aria-valuemax="10"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'checkbox',
                prop: 'aria-valuemax',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', roleSupportsAriaProps, {
      valid: [
        // No ARIA properties
        {
          code: '<div role="button">Button</div>',
        },
        // No role attribute
        {
          code: '<div aria-expanded="true">Content</div>',
        },
        // Dynamic role values (can't check statically)
        {
          code: '<div role={dynamicRole} aria-checked="true"></div>',
        },
        // Dynamic ARIA values (still check the property name)
        {
          code: '<div role="button" aria-pressed={dynamicValue}></div>',
        },
        // Non-ARIA attributes (ignored)
        {
          code: '<div role="button" className="btn" id="my-btn"></div>',
        },
      ],
      invalid: [
        // Unsupported ARIA properties on known roles
        {
          code: '<div role="article" aria-checked="true"></div>',
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'article',
                prop: 'aria-checked',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', roleSupportsAriaProps, {
      valid: [
        // combobox supports aria-expanded and aria-activedescendant
        {
          code: `
            <div role="combobox" aria-expanded="false" aria-activedescendant="option1">
              <input role="textbox" aria-activedescendant="cursor" />
            </div>
          `,
        },
        // checkbox supports aria-checked
        {
          code: `
            <div role="checkbox" aria-checked="true">
              <span>Check me</span>
            </div>
          `,
        },
      ],
      invalid: [
        // radio role does NOT support aria-required
        {
          code: `
            <ul role="radiogroup">
              <li aria-required role="radio" aria-checked="false">Option 1</li>
              <li role="radio" aria-checked="true">Option 2</li>
            </ul>
          `,
          errors: [
            {
              messageId: 'unsupportedAriaProp',
              data: {
                role: 'radio',
                prop: 'aria-required',
              },
            },
          ],
        },
      ],
    });
  });
});
