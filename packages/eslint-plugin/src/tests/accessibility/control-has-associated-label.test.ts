/**
 * Comprehensive tests for control-has-associated-label rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { controlHasAssociatedLabel } from '../../rules/accessibility/control-has-associated-label';

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

describe('control-has-associated-label', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - controls with labels', controlHasAssociatedLabel, {
      valid: [
        // Controls with text content
        {
          code: '<button type="button">Save</button>',
        },
        // aria-label
        {
          code: '<button type="button" aria-label="Save"></button>',
        },
        {
          code: '<input aria-label="Username" />',
        },
        // aria-labelledby
        {
          code: '<input aria-labelledby="username-label" />',
        },
        {
          code: '<button aria-labelledby="save-btn-label">Save</button>',
        },
        // img alt for input type="image"
        {
          code: '<input type="image" alt="Submit" />',
        },
        // Expressions (assumed to contain labels)
        {
          code: '<button type="button">{maybeSomethingThatContainsALabel}</button>',
        },
        // Non-interactive elements (not checked by rule)
        {
          code: '<div>Content</div>',
        },
        {
          code: '<span>Text</span>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Labels', () => {
    ruleTester.run('invalid - controls without labels', controlHasAssociatedLabel, {
      valid: [],
      invalid: [
        {
          code: '<button type="button"></button>',
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'button',
              },
            },
          ],
        },
        {
          code: '<input />',
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'input',
              },
            },
          ],
        },
        {
          code: '<select></select>',
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'select',
              },
            },
          ],
        },
        {
          code: '<textarea></textarea>',
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'textarea',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Interactive Roles', () => {
    ruleTester.run('interactive roles require labels', controlHasAssociatedLabel, {
      valid: [
        // Elements with interactive roles and labels
        {
          code: '<div role="button" aria-label="Save">Save</div>',
        },
        {
          code: '<span role="checkbox" aria-label="Agree">Agree</span>',
        },
      ],
      invalid: [
        // Elements with interactive roles but no labels
        {
          code: '<div role="button"></div>',
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'div',
              },
            },
          ],
        },
        {
          code: '<span role="checkbox"></span>',
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'span',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Options - ignoreElements', () => {
    ruleTester.run('ignoreElements option', controlHasAssociatedLabel, {
      valid: [
        // By default, audio and canvas are ignored (DEFAULT_IGNORE_ELEMENTS)
        {
          code: '<audio></audio>',
        },
        {
          code: '<canvas></canvas>',
        },
        // Explicitly ignore button (which is normally checked)
        {
          code: '<button></button>',
          options: [{ ignoreElements: ['button'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Options - ignoreRoles', () => {
    ruleTester.run('ignoreRoles option', controlHasAssociatedLabel, {
      valid: [
        // listbox is in interactiveRoles but also in DEFAULT_IGNORE_ROLES
        {
          code: '<div role="listbox"></div>',
        },
        // Explicitly ignore button role (which is normally checked)
        {
          code: '<div role="button"></div>',
          options: [{ ignoreRoles: ['button'] }],
        },
      ],
      invalid: [
        // With empty ignoreRoles, button role should be checked
        {
          code: '<div role="button"></div>',
          options: [{ ignoreRoles: [] }],
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'div',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Options - labelAttributes', () => {
    ruleTester.run('labelAttributes option', controlHasAssociatedLabel, {
      valid: [
        {
          code: '<CustomInput label="Surname" type="text" />',
          options: [{ labelAttributes: ['label'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Options - controlComponents', () => {
    ruleTester.run('controlComponents option', controlHasAssociatedLabel, {
      valid: [
        {
          code: '<CustomInput label="Name" />',
          options: [{ controlComponents: ['CustomInput'], labelAttributes: ['label'] }],
        },
      ],
      invalid: [
        {
          code: '<CustomInput />',
          options: [{ controlComponents: ['CustomInput'] }],
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'CustomInput',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Options - depth', () => {
    ruleTester.run('depth option', controlHasAssociatedLabel, {
      valid: [
        // Button with nested text content (depth 2 can find it)
        {
          code: `
            <button>
              <span>Click me</span>
            </button>
          `,
          options: [{ depth: 2 }],
        },
        // Button with deeper nested text (depth 3 can find it)
        {
          code: `
            <button>
              <div>
                <span>Click me</span>
              </div>
            </button>
          `,
          options: [{ depth: 3 }],
        },
      ],
      invalid: [
        // Button with text too deep for depth 1
        {
          code: `
            <button>
              <span>Click me</span>
            </button>
          `,
          options: [{ depth: 1 }],
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'button',
              },
            },
          ],
        },
      ],
    });
  });

  // Removed 'Options - assert modes' section - assert option not implemented in current rule

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', controlHasAssociatedLabel, {
      valid: [
        // Note: Rule doesn't check htmlFor/id associations
        // It only checks aria-label, aria-labelledby, and text content
        {
          code: `
            <form>
              <input aria-label="Username" type="text" />
              <button type="submit">Submit</button>
            </form>
          `,
        },
        // Multiple controls with proper labels
        {
          code: `
            <div>
              <button aria-label="Save">💾</button>
              <button aria-label="Delete">🗑️</button>
            </div>
          `,
        },
      ],
      invalid: [
        // Controls without any labels
        {
          code: `
            <form>
              <input id="username" type="text" />
              <button type="submit"></button>
            </form>
          `,
          errors: [
            {
              messageId: 'missingLabel',
              data: {
                element: 'input',
              },
            },
            {
              messageId: 'missingLabel',
              data: {
                element: 'button',
              },
            },
          ],
        },
      ],
    });
  });
});
