/**
 * Comprehensive tests for no-noninteractive-tabindex rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNoninteractiveTabindex } from '../rules/no-noninteractive-tabindex';

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

describe('no-noninteractive-tabindex', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no tabindex or allowed tabindex', noNoninteractiveTabindex, {
      valid: [
        // No tabindex attribute
        {
          code: '<div>Content</div>',
        },
        {
          code: '<span>Text</span>',
        },
        // Interactive elements with tabindex
        {
          code: '<button tabIndex="0">Button</button>',
        },
        {
          code: '<input tabIndex="0" />',
        },
        {
          code: '<a href="#" tabIndex="0">Link</a>',
        },
        // Elements with interactive roles and tabindex
        {
          code: '<div role="button" tabIndex="0">Button</div>',
        },
        {
          code: '<span role="link" tabIndex="0">Link</span>',
        },
        // Non-interactive elements with tabindex="-1" (allowed)
        {
          code: '<div tabIndex="-1">Content</div>',
        },
        {
          code: '<article tabIndex="-1">Article</article>',
        },
        {
          code: '<section tabIndex="-1">Section</section>',
        },
        {
          code: '<div role="article" tabIndex="-1">Article</div>',
        },
        // Elements with allowed roles (tabpanel by default)
        {
          code: '<div role="tabpanel" tabIndex="0">Tab Panel</div>',
        },
        // Custom allowed roles
        {
          code: '<div role="custom" tabIndex="0">Custom</div>',
          options: [{ roles: ['custom'] }],
        },
        // Custom allowed tags
        {
          code: '<pre tabIndex="0">Code</pre>',
          options: [{ tags: ['pre'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Non-interactive elements with positive tabindex', () => {
    ruleTester.run('invalid - non-interactive elements with positive tabindex', noNoninteractiveTabindex, {
      valid: [],
      invalid: [
        // Basic non-interactive elements with string tabindex
        {
          code: '<div tabIndex="0">Content</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        {
          code: '<span tabIndex="1">Text</span>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        {
          code: '<article tabIndex="0">Article</article>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        {
          code: '<section tabIndex="2">Section</section>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        // Elements with non-interactive roles
        {
          code: '<div role="article" tabIndex="0">Article</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        {
          code: '<div role="banner" tabIndex="0">Banner</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        {
          code: '<div role="complementary" tabIndex="1">Complementary</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
      ],
    });
  });

  describe('Options - tags', () => {
    ruleTester.run('tags option', noNoninteractiveTabindex, {
      valid: [
        {
          code: '<pre tabIndex="0">Code</pre>',
          options: [{ tags: ['pre'] }],
        },
        {
          code: '<code tabIndex="0">Code</code>',
          options: [{ tags: ['pre', 'code'] }],
        },
      ],
      invalid: [
        {
          code: '<pre tabIndex="0">Code</pre>',
          options: [{ tags: [] }],
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
      ],
    });
  });

  describe('Options - roles', () => {
    ruleTester.run('roles option', noNoninteractiveTabindex, {
      valid: [
        {
          code: '<div role="tabpanel" tabIndex="0">Tab Panel</div>',
        },
        {
          code: '<div role="custom" tabIndex="0">Custom</div>',
          options: [{ roles: ['custom'] }],
        },
      ],
      invalid: [
        {
          code: '<div role="tabpanel" tabIndex="0">Tab Panel</div>',
          options: [{ roles: [] }],
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
      ],
    });
  });

  describe('Options - allowExpressionValues', () => {
    ruleTester.run('allowExpressionValues option', noNoninteractiveTabindex, {
      valid: [
        // Static interactive role is always allowed
        {
          code: '<div role="button" tabIndex="0">Static Role</div>',
        },
        // tabindex="-1" is always allowed
        {
          code: '<div role={dynamicRole} tabIndex="-1">Dynamic Role</div>',
        },
      ],
      invalid: [
        // Dynamic roles can't be determined, so non-interactive tabindex is flagged
        {
          code: '<div role={dynamicRole} tabIndex="0">Dynamic Role</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        // Non-interactive static role
        {
          code: '<div role="article" tabIndex="0">Article</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
      ],
    });
  });

  describe('Interactive Roles (allowed)', () => {
    ruleTester.run('interactive roles are allowed tabindex', noNoninteractiveTabindex, {
      valid: [
        {
          code: '<div role="button" tabIndex="0">Button</div>',
        },
        {
          code: '<div role="link" tabIndex="0">Link</div>',
        },
        {
          code: '<div role="checkbox" tabIndex="0">Checkbox</div>',
        },
        {
          code: '<div role="textbox" tabIndex="0">Textbox</div>',
        },
        {
          code: '<div role="combobox" tabIndex="0">Combobox</div>',
        },
        {
          code: '<div role="listbox" tabIndex="0">Listbox</div>',
        },
        {
          code: '<div role="menu" tabIndex="0">Menu</div>',
        },
        {
          code: '<div role="tab" tabIndex="0">Tab</div>',
        },
        {
          code: '<div role="tree" tabIndex="0">Tree</div>',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noNoninteractiveTabindex, {
      valid: [
        // Dynamic tabindex values (can't check statically)
        {
          code: '<div tabIndex={dynamicValue}>Dynamic tabindex</div>',
        },
        // No tabindex attribute
        {
          code: '<div role="article">No tabindex</div>',
        },
        // tabindex with undefined value (no value to check)
        {
          code: '<div tabIndex>Undefined tabindex</div>',
        },
        // Expression tabindex values are skipped (rule only handles Literal)
        {
          code: '<div tabIndex={0}>Numeric zero</div>',
        },
        {
          code: '<div tabIndex={1}>Numeric one</div>',
        },
      ],
      invalid: [
        // tabindex="0" string literal
        {
          code: '<div tabIndex="0">String zero</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
        // tabindex="1" positive string literal
        {
          code: '<div tabIndex="1">String one</div>',
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', noNoninteractiveTabindex, {
      valid: [
        {
          code: `
            <div>
              <button tabIndex="0">Interactive</button>
              <div tabIndex="-1">Non-interactive</div>
            </div>
          `,
        },
        {
          code: `
            <article>
              <h1>Title</h1>
              <div role="button" tabIndex="0">Interactive content</div>
            </article>
          `,
        },
      ],
      invalid: [
        {
          code: `
            <div>
              <div tabIndex="0">Non-interactive</div>
              <span tabIndex="1">Also non-interactive</span>
            </div>
          `,
          errors: [
            {
              messageId: 'noNoninteractiveTabindex',
            },
            {
              messageId: 'noNoninteractiveTabindex',
            },
          ],
        },
      ],
    });
  });
});
