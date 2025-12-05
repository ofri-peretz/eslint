/**
 * Comprehensive tests for aria-activedescendant-has-tabindex rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { ariaActivedescendantHasTabindex } from '../../rules/accessibility/aria-activedescendant-has-tabindex';

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

describe('aria-activedescendant-has-tabindex', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - elements with aria-activedescendant and proper tabindex', ariaActivedescendantHasTabindex, {
      valid: [
        // Elements without aria-activedescendant
        {
          code: '<div>Content</div>',
        },
        {
          code: '<input type="text" />',
        },
        // Inherently focusable elements with aria-activedescendant
        {
          code: '<input aria-activedescendant="option1" />',
        },
        {
          code: '<textarea aria-activedescendant="option1"></textarea>',
        },
        {
          code: '<select aria-activedescendant="option1"></select>',
        },
        {
          code: '<button aria-activedescendant="option1">Button</button>',
        },
        // Elements with explicit tabindex
        {
          code: '<div aria-activedescendant="option1" tabIndex={0}></div>',
        },
        {
          code: '<div aria-activedescendant="option1" tabIndex="-1"></div>',
        },
        {
          code: '<div aria-activedescendant="option1" tabIndex={1}></div>',
        },
        {
          code: '<span aria-activedescendant="option1" tabIndex="0"></span>',
        },
        {
          code: '<div aria-activedescendant="option1" tabIndex="0"></div>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing TabIndex', () => {
    ruleTester.run('invalid - elements with aria-activedescendant but no tabindex', ariaActivedescendantHasTabindex, {
      valid: [],
      invalid: [
        {
          code: '<div aria-activedescendant="option1"></div>',
          errors: [
            {
              messageId: 'missingTabIndex',
            },
          ],
        },
        {
          code: '<span aria-activedescendant="menu-item-1"></span>',
          errors: [
            {
              messageId: 'missingTabIndex',
            },
          ],
        },
        {
          code: '<section aria-activedescendant="tab-1"></section>',
          errors: [
            {
              messageId: 'missingTabIndex',
            },
          ],
        },
        {
          code: '<article aria-activedescendant="item-1"></article>',
          errors: [
            {
              messageId: 'missingTabIndex',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', ariaActivedescendantHasTabindex, {
      valid: [
        // Dynamic aria-activedescendant values
        {
          code: '<div aria-activedescendant={activeId} tabIndex={0}></div>',
        },
        // aria-activedescendant with non-literal values
        {
          code: '<div aria-activedescendant={`${prefix}-item`} tabIndex={0}></div>',
        },
        // Custom components (not inherently focusable, but with tabindex)
        {
          code: '<CustomComponent aria-activedescendant="item1" tabIndex={0} />',
        },
      ],
      invalid: [
        // aria-activedescendant with JSX expression (but no tabindex)
        {
          code: '<div aria-activedescendant={activeItem}></div>',
          errors: [
            {
              messageId: 'missingTabIndex',
            },
          ],
        },
        // aria-activedescendant with template literal (but no tabindex)
        {
          code: '<div aria-activedescendant={`item-${index}`}></div>',
          errors: [
            {
              messageId: 'missingTabIndex',
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', ariaActivedescendantHasTabindex, {
      valid: [
        {
          code: `
            <div>
              <div aria-activedescendant="option1" tabIndex={0}>
                Complex component
              </div>
            </div>
          `,
        },
      ],
      invalid: [
        {
          code: `
            <div>
              <div aria-activedescendant="option1">
                Missing tabindex
              </div>
            </div>
          `,
          errors: [
            {
              messageId: 'missingTabIndex',
            },
          ],
        },
      ],
    });
  });
});
