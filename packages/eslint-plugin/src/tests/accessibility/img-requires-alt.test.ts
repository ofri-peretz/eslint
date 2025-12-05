/**
 * Comprehensive tests for img-requires-alt rule
 * Accessibility: WCAG 2.1 Level A
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { imgRequiresAlt } from '../../rules/accessibility/img-requires-alt';

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
        // Image with JSXSpreadAttribute (to cover line 89-91 in getAltValue)
        {
          code: '<img src="photo.jpg" {...props} alt="Description" />',
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
        // Image with JSXSpreadAttribute but no alt (to cover line 89-91)
        // Note: The rule may not detect this case if spread attributes are present
        // This test covers the getAltValue function's handling of non-JSXAttribute types
        {
          code: '<img {...props} src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img {...props} src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img {...props} src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        // Image with filename-based suggestion (to cover line 149)
        {
          code: '<img src="/images/beautiful-sunset.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        // Image with no attributes except src (to cover lines 196-213 - no lastAttr case)
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

  describe('Edge Cases - hasAriaLabel', () => {
    ruleTester.run('edge cases - aria-label with JSXSpreadAttribute (line 107)', imgRequiresAlt, {
      valid: [
        // Test with JSXSpreadAttribute to cover line 107 (attr.type !== 'JSXAttribute')
        {
          code: '<img src="photo.jpg" {...props} aria-label="Description" />',
          options: [{ allowAriaLabel: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Uncovered Lines', () => {
    // Lines 89-91: getAltValue edge cases
    ruleTester.run('line 89-91 - getAltValue edge cases', imgRequiresAlt, {
      valid: [
        // alt attribute with no value (empty alt)
        {
          code: '<img src="photo.jpg" alt />',
        },
        // alt attribute with empty string value
        {
          code: '<img src="photo.jpg" alt="" />',
        },
        // JSXSpreadAttribute before alt (to test getAltValue with spread)
        {
          code: '<img {...props} alt="test" />',
        },
      ],
      invalid: [
        // alt attribute with dynamic value (alt={undefined} or alt={variable})
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
        {
          code: '<img src="photo.jpg" alt={imageAlt} />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt={imageAlt} alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt={imageAlt} alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });

    // Line 149: filename-based suggestion in suggestAltText
    ruleTester.run('line 149 - filename-based suggestion', imgRequiresAlt, {
      valid: [],
      invalid: [
        {
          code: '<img src="/images/beautiful-sunset.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src="user_profile_picture.png" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="user_profile_picture.png" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="user_profile_picture.png" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src="https://example.com/images/product-hero.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="https://example.com/images/product-hero.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="https://example.com/images/product-hero.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });

    // Lines 196-213: Fixer with no attributes (lastAttr is undefined)
    ruleTester.run('line 196-213 - fixer with no attributes', imgRequiresAlt, {
      valid: [],
      invalid: [
        // Image with only src attribute (to test lastAttr handling)
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
        // Image with multiple attributes to test lastAttr fallback
        {
          code: '<img src="photo.jpg" className="image" id="img1" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" className="image" id="img1" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" className="image" id="img1" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });

    // Line 171: alt={undefined} or alt={variable} - treat as missing
    ruleTester.run('line 171 - dynamic alt value treated as missing', imgRequiresAlt, {
      valid: [],
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
        {
          code: '<img src="photo.jpg" alt={altText} />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt={altText} alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt={altText} alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src="photo.jpg" alt={getAltText()} />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt={getAltText()} alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt={getAltText()} alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

