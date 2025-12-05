/**
 * Comprehensive tests for no-interactive-element-to-noninteractive-role rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInteractiveElementToNoninteractiveRole } from '../../rules/accessibility/no-interactive-element-to-noninteractive-role';

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

describe('no-interactive-element-to-noninteractive-role', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - interactive elements with appropriate roles', noInteractiveElementToNoninteractiveRole, {
      valid: [
        // Interactive elements without roles (implicit roles are fine)
        {
          code: '<button type="button">Click me</button>',
        },
        {
          code: '<input type="text" />',
        },
        {
          code: '<a href="#section">Link</a>',
        },
        // Interactive elements with interactive roles
        {
          code: '<button role="button">Click me</button>',
        },
        {
          code: '<input role="textbox" />',
        },
        // Non-interactive elements (not checked by this rule)
        {
          code: '<div>Content</div>',
        },
        {
          code: '<span role="presentation">Content</span>',
        },
        // Interactive elements with allowed non-interactive roles
        {
          code: '<tr role="presentation"></tr>',
        },
        {
          code: '<tr role="none"></tr>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Interactive Elements with Non-interactive Roles', () => {
    ruleTester.run('invalid - interactive elements with non-interactive roles', noInteractiveElementToNoninteractiveRole, {
      valid: [],
      invalid: [
        {
          code: '<button role="article">Click me</button>',
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'button',
                role: 'article',
              },
            },
          ],
        },
        {
          code: '<input role="banner" />',
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'input',
                role: 'banner',
              },
            },
          ],
        },
        {
          code: '<a href="#" role="complementary">Link</a>',
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'a',
                role: 'complementary',
              },
            },
          ],
        },
        {
          code: '<select role="img"></select>',
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'select',
                role: 'img',
              },
            },
          ],
        },
        {
          code: '<textarea role="listitem"></textarea>',
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'textarea',
                role: 'listitem',
              },
            },
          ],
        },
        // presentation and none roles (not allowed on interactive elements except tr)
        {
          code: '<button role="presentation">Click me</button>',
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'button',
                role: 'presentation',
              },
            },
          ],
        },
        {
          code: '<input role="none" />',
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'input',
                role: 'none',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Exceptions - TR elements', () => {
    ruleTester.run('tr elements can have presentation or none roles', noInteractiveElementToNoninteractiveRole, {
      valid: [
        {
          code: '<tr role="presentation"></tr>',
        },
        {
          code: '<tr role="none"></tr>',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noInteractiveElementToNoninteractiveRole, {
      valid: [
        // Dynamic role values (can't check statically)
        {
          code: '<button role={dynamicRole}>Click me</button>',
        },
        // No role attribute
        {
          code: '<button>Click me</button>',
        },
        // Non-interactive elements with non-interactive roles (not checked)
        {
          code: '<div role="article">Content</div>',
        },
      ],
      invalid: [
        // Interactive elements with non-literal roles (but if it's a literal non-interactive role)
        // This would be caught if the role is statically determinable
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', noInteractiveElementToNoninteractiveRole, {
      valid: [
        {
          code: `
            <form>
              <button type="submit">Submit</button>
              <input type="text" />
            </form>
          `,
        },
      ],
      invalid: [
        {
          code: `
            <form>
              <button role="banner" type="submit">Submit</button>
              <input role="article" type="text" />
            </form>
          `,
          errors: [
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'button',
                role: 'banner',
              },
            },
            {
              messageId: 'interactiveToNoninteractive',
              data: {
                element: 'input',
                role: 'article',
              },
            },
          ],
        },
      ],
    });
  });
});
