/**
 * Comprehensive tests for no-noninteractive-element-to-interactive-role rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNoninteractiveElementToInteractiveRole } from '../rules/no-noninteractive-element-to-interactive-role';

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

describe('no-noninteractive-element-to-interactive-role', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - non-interactive elements with appropriate roles', noNoninteractiveElementToInteractiveRole, {
      valid: [
        // Non-interactive elements without roles
        {
          name: 'a plain div',
          code: '<div>Content</div>',
        },
        {
          code: '<span>Text</span>',
        },
        // Non-interactive elements with non-interactive roles
        {
          code: '<div role="article">Content</div>',
        },
        {
          code: '<section role="banner">Header</section>',
        },
        // Allowed exceptions for specific elements
        {
          code: '<ul role="listbox">Items</ul>',
        },
        {
          code: '<ol role="menu">Items</ol>',
        },
        {
          code: '<li role="menuitem">Item</li>',
        },
        {
          code: '<table role="grid">Table</table>',
        },
        {
          code: '<td role="gridcell">Cell</td>',
        },
      ],
      invalid: [],
    });
  });

  describe('Static elements (div/span) carry no semantics to lose', () => {
    ruleTester.run('valid - the custom-widget pattern on static elements', noNoninteractiveElementToInteractiveRole, {
      valid: [
        {
          // div and span are generic (HTML-AAM): giving them a widget role is
          // how a custom widget is built, not a loss of document semantics.
          name: 'a div given the button role, with its behaviour',
          code: '<div role="button" tabIndex={0} onClick={handle}>Click me</div>',
        },
        {
          name: 'a span given the link role',
          code: '<span role="link">Link text</span>',
        },
        {
          name: 'a role the file cannot know on a heading',
          code: '<h2 role={dynamicRole}>Title</h2>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Non-interactive Elements with Interactive Roles', () => {
    ruleTester.run('invalid - non-interactive elements with interactive roles', noNoninteractiveElementToInteractiveRole, {
      valid: [],
      invalid: [
        {
          name: 'an interactive role written as a braced string',
          code: '<h2 role={"button"}>Click me</h2>',
          errors: [{ messageId: 'noninteractiveToInteractive' }],
        },
        {
          code: '<p role="checkbox">Check me</p>',
          errors: [
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'p',
                role: 'checkbox',
              },
            },
          ],
        },
        {
          code: '<article role="menuitem">Menu item</article>',
          errors: [
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'article',
                role: 'menuitem',
              },
            },
          ],
        },
        {
          code: '<section role="radio">Radio option</section>',
          errors: [
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'section',
                role: 'radio',
              },
            },
          ],
        },
        {
          code: '<aside role="switch">Toggle</aside>',
          errors: [
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'aside',
                role: 'switch',
              },
            },
          ],
        },
        {
          code: '<header role="textbox">Input field</header>',
          errors: [
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'header',
                role: 'textbox',
              },
            },
          ],
        },
        {
          code: '<footer role="combobox">Combo box</footer>',
          errors: [
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'footer',
                role: 'combobox',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Interactive Elements (not checked by this rule)', () => {
    ruleTester.run('interactive elements are not checked', noNoninteractiveElementToInteractiveRole, {
      valid: [
        {
          code: '<button role="button">Click me</button>',
        },
        {
          code: '<input role="textbox" />',
        },
        {
          code: '<a href="#" role="link">Link</a>',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noNoninteractiveElementToInteractiveRole, {
      valid: [
        // Dynamic role values (can't check statically)
        {
          code: '<div role={dynamicRole}>Content</div>',
        },
        // No role attribute
        {
          code: '<div>Content</div>',
        },
        // Interactive roles on allowed elements
        {
          code: '<ul role="listbox"><li>Item</li></ul>',
        },
        {
          code: '<table role="grid"><tr><td>Cell</td></tr></table>',
        },
      ],
      invalid: [
        // Non-interactive roles on non-interactive elements (allowed)
        // Only interactive roles on non-interactive elements are flagged
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', noNoninteractiveElementToInteractiveRole, {
      valid: [
        {
          code: `
            <div className="container">
              <header>Header</header>
              <main>
                <article>Article content</article>
              </main>
            </div>
          `,
        },
        {
          code: `
            <ul role="menu">
              <li role="menuitem">Item 1</li>
              <li role="menuitem">Item 2</li>
            </ul>
          `,
        },
      ],
      invalid: [
        {
          code: `
            <div className="container">
              <h2 role="button">Click me</h2>
              <p role="link">Link text</p>
            </div>
          `,
          errors: [
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'h2',
                role: 'button',
              },
            },
            {
              messageId: 'noninteractiveToInteractive',
              data: {
                element: 'p',
                role: 'link',
              },
            },
          ],
        },
      ],
    });
  });
});
