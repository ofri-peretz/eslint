/**
 * Comprehensive tests for required-attributes rule
 * React: Enforce required attributes on components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requiredAttributes } from '../../rules/react/required-attributes';

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

describe('required-attributes', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - components with required attributes', requiredAttributes, {
      valid: [
        // Component with required attribute
        {
          code: '<Button type="submit" />',
          options: [{ attributes: [{ attribute: 'type' }] }],
        },
        {
          code: '<Input name="email" />',
          options: [{ attributes: [{ attribute: 'name' }] }],
        },
        // Component in ignore list
        {
          code: '<CustomButton />',
          options: [{ 
            attributes: [{ attribute: 'type' }],
            ignoreComponents: ['CustomButton']
          }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Attributes', () => {
    ruleTester.run('invalid - missing required attributes', requiredAttributes, {
      valid: [],
      invalid: [
        {
          code: '<Button />',
          options: [{ attributes: [{ attribute: 'type' }] }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<Button type="TODO" />',
                },
              ],
            },
          ],
        },
        {
          code: '<Input />',
          options: [{ attributes: [{ attribute: 'name' }] }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<Input name="TODO" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', requiredAttributes, {
      valid: [],
      invalid: [
        {
          code: '<Button />',
          options: [{ 
            attributes: [{ 
              attribute: 'type',
              suggestedValue: 'button'
            }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<Button type="button" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', requiredAttributes, {
      valid: [
        {
          code: '<div />',
          options: [{ 
            attributes: [{ 
              attribute: 'type',
              ignoreTags: ['div']
            }] 
          }],
        },
        // Test ignoreTags option (line 61)
        {
          code: '<span />',
          options: [{ 
            attributes: [{ 
              attribute: 'aria-label',
              ignoreTags: ['span']
            }] 
          }],
        },
        // Test that type/name only apply to form elements (line 193)
        {
          code: '<div />',
          options: [{ 
            attributes: [{ attribute: 'type' }] 
          }],
        },
        {
          code: '<span />',
          options: [{ 
            attributes: [{ attribute: 'name' }] 
          }],
        },
      ],
      invalid: [
        // Test aria- attribute handling (line 164)
        {
          code: '<button />',
          options: [{ 
            attributes: [{ attribute: 'aria-label' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<button aria-label="TODO: Add descriptive label" />',
                },
              ],
            },
          ],
        },
        // Test tabIndex attribute handling (line 167)
        {
          code: '<div />',
          options: [{ 
            attributes: [{ attribute: 'tabIndex' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<div tabIndex="0" />',
                },
              ],
            },
          ],
        },
        // Test type attribute on form element (should be required)
        {
          code: '<input />',
          options: [{ 
            attributes: [{ attribute: 'type' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<input type="TODO" />',
                },
              ],
            },
          ],
        },
        // Test name attribute on form element (should be required)
        {
          code: '<input />',
          options: [{ 
            attributes: [{ attribute: 'name' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<input name="TODO" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Lines 100-115: JSXMemberExpression handling in getElementName
    ruleTester.run('line 100-115 - JSXMemberExpression', requiredAttributes, {
      valid: [],
      invalid: [
        {
          code: '<Box.Item />',
          options: [{ 
            attributes: [{ attribute: 'data-testid' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<Box.Item data-testid="box.item" />',
                },
              ],
            },
          ],
        },
        {
          code: '<Container.Header.Title />',
          options: [{ 
            attributes: [{ attribute: 'aria-label' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<Container.Header.Title aria-label="TODO: Add descriptive label" />',
                },
              ],
            },
          ],
        },
      ],
    });

    // Lines 160-161: getDefaultSuggestedValue for data-testid
    ruleTester.run('line 160-161 - data-testid kebab case', requiredAttributes, {
      valid: [],
      invalid: [
        {
          code: '<MyComponent />',
          options: [{ 
            attributes: [{ attribute: 'data-testid' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<MyComponent data-testid="my-component" />',
                },
              ],
            },
          ],
        },
        {
          code: '<UserProfile />',
          options: [{ 
            attributes: [{ attribute: 'data-testid' }] 
          }],
          errors: [
            {
              messageId: 'missingAttribute',
              suggestions: [
                {
                  messageId: 'addAttribute',
                  output: '<UserProfile data-testid="user-profile" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

