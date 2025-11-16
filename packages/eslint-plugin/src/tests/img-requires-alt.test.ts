/**
 * Comprehensive tests for img-requires-alt rule
 * Accessibility: WCAG 2.1 Level A
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { imgRequiresAlt } from '../rules/accessibility/img-requires-alt';

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

describe('img-requires-alt', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - images with alt text', imgRequiresAlt, {
      valid: [
        // Image with alt attribute
        {
          code: '<img src="photo.jpg" alt="A beautiful sunset" />',
        },
        {
          code: '<img src="logo.png" alt="Company logo" />',
        },
        // Image with empty alt (decorative)
        {
          code: '<img src="decoration.png" alt="" />',
        },
        // Image with aria-label (if allowed)
        {
          code: '<img src="photo.jpg" aria-label="A beautiful sunset" />',
          options: [{ allowAriaLabel: true }],
        },
        // Image with aria-labelledby (if allowed)
        {
          code: '<img src="photo.jpg" aria-labelledby="img-desc" />',
          options: [{ allowAriaLabelledby: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Alt', () => {
    ruleTester.run('invalid - images without alt text', imgRequiresAlt, {
      valid: [],
      invalid: [
        // Note: Rule may not detect all missing alt cases
        // Some patterns may not be detected due to JSX parsing limitations
        // These tests represent expected behavior, but rule may need enhancement
        {
          code: '<img src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src="logo.png" className="logo" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="logo.png" className="logo" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="logo.png" className="logo" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src={imageSrc} />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src={imageSrc} alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src={imageSrc} alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: `
            <div>
              <img src="photo.jpg" />
            </div>
          `,
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: `
            <div>
              <img src="photo.jpg" alt="TODO: Add descriptive text" />
            </div>
          `,
                },
                {
                  messageId: 'useEmptyAlt',
                  output: `
            <div>
              <img src="photo.jpg" alt="" />
            </div>
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', imgRequiresAlt, {
      valid: [],
      invalid: [
        {
          code: '<img src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options - allowAriaLabel', () => {
    ruleTester.run('allowAriaLabel option', imgRequiresAlt, {
      valid: [
        {
          code: '<img src="photo.jpg" aria-label="Description" />',
          options: [{ allowAriaLabel: true }],
        },
      ],
      invalid: [
        {
          code: '<img src="photo.jpg" />',
          options: [{ allowAriaLabel: true }],
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options - allowAriaLabelledby', () => {
    ruleTester.run('allowAriaLabelledby option', imgRequiresAlt, {
      valid: [
        {
          code: '<img src="photo.jpg" aria-labelledby="img-desc" />',
          options: [{ allowAriaLabelledby: true }],
        },
      ],
      invalid: [
        {
          code: '<img src="photo.jpg" />',
          options: [{ allowAriaLabelledby: true }],
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', imgRequiresAlt, {
      valid: [
        // Not an img element
        {
          code: '<div src="photo.jpg" />',
        },
        {
          code: '<Image src="photo.jpg" />',
        },
      ],
      invalid: [
        {
          code: '<img src="photo.jpg" alt={undefined} />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt={undefined} alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt={undefined} alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

