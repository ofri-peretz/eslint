/**
 * Comprehensive tests for required-attributes rule
 * React: Enforce required attributes on components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requiredAttributes } from '../rules/react/required-attributes';

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
      ],
      invalid: [],
    });
  });
});

