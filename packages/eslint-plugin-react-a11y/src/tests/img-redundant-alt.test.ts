/**
 * Comprehensive tests for img-redundant-alt rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { imgRedundantAlt } from '../rules/img-redundant-alt';

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

describe('img-redundant-alt', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - images with non-redundant alt text', imgRedundantAlt, {
      valid: [
        // Images with descriptive alt text (no redundant words)
        {
          code: '<img src="photo.jpg" alt="A beautiful sunset over the mountains" />',
        },
        {
          code: '<img src="logo.png" alt="Company logo" />',
        },
        // Images with empty alt (decorative)
        {
          code: '<img src="decoration.png" alt="" />',
        },
        // Images without alt (not checked by this rule)
        {
          code: '<img src="photo.jpg" />',
        },
        // Dynamic alt values (can't analyze statically)
        {
          code: '<img src="photo.jpg" alt={altText} />',
        },
        // Alt text with partial matches (e.g., "Photography" doesn't match "photo")
        {
          code: '<img src="photo.jpg" alt="Photography class" />',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Redundant Alt Text', () => {
    ruleTester.run('invalid - images with redundant alt text', imgRedundantAlt, {
      valid: [],
      invalid: [
        // "Photo" matches the redundant word "photo"
        {
          code: '<img src="foo" alt="Photo of foo being weird." />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'photo',
              },
            },
          ],
        },
        // "Image" matches the redundant word "image"
        {
          code: '<img src="bar" alt="Image of me at a bar!" />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'image',
              },
            },
          ],
        },
        // "Picture" matches the redundant word "picture"
        {
          code: '<img src="baz" alt="Picture of baz fixing a bug." />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'picture',
              },
            },
          ],
        },
        // Case insensitive matching
        {
          code: '<img src="test" alt="PHOTO of test" />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'photo',
              },
            },
          ],
        },
        // "image" is checked first in the array, so it's reported
        {
          code: '<img src="test" alt="This image shows test" />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'image',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Options - components', () => {
    ruleTester.run('components option', imgRedundantAlt, {
      valid: [
        {
          code: '<Image src="photo.jpg" alt="A beautiful sunset" />',
          options: [{ components: ['Image'] }],
        },
      ],
      invalid: [
        {
          code: '<Image src="photo.jpg" alt="Photo of sunset" />',
          options: [{ components: ['Image'] }],
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'photo',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Options - words', () => {
    ruleTester.run('words option', imgRedundantAlt, {
      valid: [
        // With custom words, default words (image, photo, picture) are no longer checked
        {
          code: '<img src="photo.jpg" alt="Photo of sunset" />',
          options: [{ words: ['Bild', 'Foto'] }],
        },
      ],
      invalid: [
        // Custom word "Bild" is now redundant
        {
          code: '<img src="photo.jpg" alt="Bild of sunset" />',
          options: [{ words: ['Bild', 'Foto'] }],
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'bild',
              },
            },
          ],
        },
        // Custom word "Foto" is now redundant
        {
          code: '<img src="photo.jpg" alt="Foto of sunset" />',
          options: [{ words: ['Bild', 'Foto'] }],
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'foto',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', imgRedundantAlt, {
      valid: [
        // Not an img element (not checked)
        {
          code: '<div alt="Photo of something">Content</div>',
        },
        // img without alt attribute (not checked)
        {
          code: '<img src="photo.jpg" />',
        },
        // img with empty alt (decorative)
        {
          code: '<img src="photo.jpg" alt="" />',
        },
        // img with alt but no value (not a literal string)
        {
          code: '<img src="photo.jpg" alt />',
        },
        // Dynamic alt values (not checked)
        {
          code: '<img src="photo.jpg" alt={dynamicAlt} />',
        },
      ],
      invalid: [
        // aria-hidden without "true" value - still checked
        {
          code: '<img src="photo.jpg" aria-hidden alt="Photo of something" />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'photo',
              },
            },
          ],
        },
        // aria-hidden="false" - still checked
        {
          code: '<img src="photo.jpg" aria-hidden="false" alt="Photo of something" />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'photo',
              },
            },
          ],
        },
        // aria-hidden={false} - still checked
        {
          code: '<img src="photo.jpg" aria-hidden={false} alt="Photo of something" />',
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'photo',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', imgRedundantAlt, {
      valid: [
        {
          code: `
            <div>
              <img src="photo.jpg" alt="Beautiful landscape" />
            </div>
          `,
        },
      ],
      invalid: [
        {
          code: `
            <div>
              <img src="photo.jpg" alt="Photo of landscape" />
            </div>
          `,
          errors: [
            {
              messageId: 'redundantAlt',
              data: {
                word: 'photo',
              },
            },
          ],
        },
      ],
    });
  });
});
