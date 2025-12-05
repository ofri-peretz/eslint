/**
 * Comprehensive tests for prefer-tag-over-role rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferTagOverRole } from '../rules/prefer-tag-over-role';

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

describe('prefer-tag-over-role', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - semantic elements without redundant roles', preferTagOverRole, {
      valid: [
        // Semantic elements without roles (preferred)
        {
          code: '<header>Header content</header>',
        },
        {
          code: '<article>Article content</article>',
        },
        {
          code: '<main>Main content</main>',
        },
        {
          code: '<aside>Aside content</aside>',
        },
        {
          code: '<nav>Navigation</nav>',
        },
        {
          code: '<section>Section content</section>',
        },
        {
          code: '<footer>Footer content</footer>',
        },
        {
          code: '<figure>Figure content</figure>',
        },
        {
          code: '<img src="image.jpg" alt="Image" />',
        },
        {
          code: '<ul><li>Item</li></ul>',
        },
        {
          code: '<button>Click me</button>',
        },
        {
          code: '<a href="#section">Link</a>',
        },
        {
          code: '<h1>Heading</h1>',
        },
        {
          code: '<input type="text" />',
        },
        {
          code: '<input type="checkbox" />',
        },
        {
          code: '<input type="radio" />',
        },
        {
          code: '<input type="search" />',
        },
        {
          code: '<textarea>Text area</textarea>',
        },
        // Elements with roles that don't have semantic alternatives
        {
          code: '<div role="dialog">Dialog</div>',
        },
        {
          code: '<div role="tablist">Tab list</div>',
        },
        {
          code: '<div role="tooltip">Tooltip</div>',
        },
        // Dynamic role values (can't check statically)
        {
          code: '<div role={dynamicRole}>Dynamic role</div>',
        },
        // No role attribute
        {
          code: '<div>Plain div</div>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Elements with redundant roles', () => {
    ruleTester.run('invalid - elements with roles that have semantic alternatives', preferTagOverRole, {
      valid: [],
      invalid: [
        // banner -> header
        {
          code: '<div role="banner">Header content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'header',
                role: 'banner',
                element: 'div',
              },
            },
          ],
        },
        // article -> article (already correct, but if using role)
        {
          code: '<div role="article">Article content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'article',
                role: 'article',
                element: 'div',
              },
            },
          ],
        },
        // main -> main
        {
          code: '<div role="main">Main content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'main',
                role: 'main',
                element: 'div',
              },
            },
          ],
        },
        // complementary -> aside
        {
          code: '<div role="complementary">Aside content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'aside',
                role: 'complementary',
                element: 'div',
              },
            },
          ],
        },
        // navigation -> nav
        {
          code: '<div role="navigation">Navigation</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'nav',
                role: 'navigation',
                element: 'div',
              },
            },
          ],
        },
        // region -> section
        {
          code: '<div role="region">Section content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'section',
                role: 'region',
                element: 'div',
              },
            },
          ],
        },
        // contentinfo -> footer
        {
          code: '<div role="contentinfo">Footer content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'footer',
                role: 'contentinfo',
                element: 'div',
              },
            },
          ],
        },
        // figure -> figure
        {
          code: '<div role="figure">Figure content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'figure',
                role: 'figure',
                element: 'div',
              },
            },
          ],
        },
        // img -> img
        {
          code: '<div role="img">Image content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'img',
                role: 'img',
                element: 'div',
              },
            },
          ],
        },
        // list -> ul
        {
          code: '<div role="list">List content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'ul',
                role: 'list',
                element: 'div',
              },
            },
          ],
        },
        // listitem -> li
        {
          code: '<div role="listitem">List item</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'li',
                role: 'listitem',
                element: 'div',
              },
            },
          ],
        },
        // button -> button
        {
          code: '<div role="button">Button content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'button',
                role: 'button',
                element: 'div',
              },
            },
          ],
        },
        // link -> a
        {
          code: '<div role="link">Link content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'a',
                role: 'link',
                element: 'div',
              },
            },
          ],
        },
        // heading -> h1
        {
          code: '<div role="heading">Heading content</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'h1',
                role: 'heading',
                element: 'div',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Input Type Specific Rules', () => {
    ruleTester.run('input type specific rules', preferTagOverRole, {
      valid: [
        // Already correct input types
        {
          code: '<input type="checkbox" />',
        },
        {
          code: '<input type="radio" />',
        },
        {
          code: '<input type="search" />',
        },
      ],
      invalid: [
        // Wrong elements with role that should be input
        {
          code: '<div role="checkbox">Checkbox</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'input[type="checkbox"]',
                role: 'checkbox',
                element: 'div',
              },
            },
          ],
        },
        {
          code: '<span role="radio">Radio</span>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'input[type="radio"]',
                role: 'radio',
                element: 'span',
              },
            },
          ],
        },
        {
          code: '<div role="searchbox">Search</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'input[type="search"]',
                role: 'searchbox',
                element: 'div',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Textbox Role', () => {
    ruleTester.run('textbox role alternatives', preferTagOverRole, {
      valid: [
        // Already correct input/textarea
        {
          code: '<input type="text" />',
        },
        {
          code: '<textarea>Text area</textarea>',
        },
      ],
      invalid: [
        // Should use input or textarea
        {
          code: '<div role="textbox">Text input</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'input',
                role: 'textbox',
                element: 'div',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', preferTagOverRole, {
      valid: [
        // Dynamic role values
        {
          code: '<div role={dynamicRole}>Dynamic</div>',
        },
        // Role with non-string value
        {
          code: '<div role={123}>Numeric role</div>',
        },
        // No role attribute
        {
          code: '<div>No role</div>',
        },
        // Empty role
        {
          code: '<div role="">Empty role</div>',
        },
        // Roles not in mapping
        {
          code: '<div role="custom-role">Custom role</div>',
        },
      ],
      invalid: [
        // Multiple attributes with role
        {
          code: '<div className="header" role="banner">Header</div>',
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'header',
                role: 'banner',
                element: 'div',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', preferTagOverRole, {
      valid: [
        {
          code: `
            <header>
              <nav>Navigation</nav>
              <main>Main content</main>
            </header>
          `,
        },
        {
          code: `
            <article>
              <h1>Title</h1>
              <section>Section</section>
            </article>
          `,
        },
      ],
      invalid: [
        {
          code: `
            <div>
              <div role="banner">Header</div>
              <div role="navigation">Nav</div>
            </div>
          `,
          errors: [
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'header',
                role: 'banner',
                element: 'div',
              },
            },
            {
              messageId: 'preferTagOverRole',
              data: {
                tag: 'nav',
                role: 'navigation',
                element: 'div',
              },
            },
          ],
        },
      ],
    });
  });
});
