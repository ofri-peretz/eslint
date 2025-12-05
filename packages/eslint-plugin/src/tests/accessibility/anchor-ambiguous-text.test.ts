/**
 * Comprehensive tests for anchor-ambiguous-text rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { anchorAmbiguousText } from '../../rules/accessibility/anchor-ambiguous-text';

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

describe('anchor-ambiguous-text', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - non-ambiguous anchor text', anchorAmbiguousText, {
      valid: [
        // Descriptive anchor text
        {
          code: '<a href="#section">Read the tutorial</a>',
        },
        {
          code: '<a href="/about">Learn more about our company</a>',
        },
        {
          code: '<a href="/contact">Contact us</a>',
        },
        // Dynamic content (variables) - can't be analyzed statically
        {
          code: '<a href="#">{here}</a>',
        },
        {
          code: '<a href="#">{linkText}</a>',
        },
        // aria-label overrides text content (if aria-label is descriptive)
        {
          code: '<a href="#" aria-label="tutorial on using eslint-plugin-jsx-a11y">click here</a>',
        },
        // Complex nested structure with descriptive text is valid
        {
          code: '<a href="/docs"><i></i>documentation</a>',
        },
        // Text with additional context is not exact match
        {
          code: '<a href="#">click here to learn more about accessibility</a>',
        },
        {
          code: '<a href="#">{prefix} click here</a>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Ambiguous Text', () => {
    ruleTester.run('invalid - ambiguous anchor text', anchorAmbiguousText, {
      valid: [],
      invalid: [
        {
          code: '<a href="#">here</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'here',
              },
            },
          ],
        },
        {
          code: '<a href="#">HERE</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'HERE',
              },
            },
          ],
        },
        {
          code: '<a href="#">link</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'link',
              },
            },
          ],
        },
        {
          code: '<a href="#">click here</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'click here',
              },
            },
          ],
        },
        {
          code: '<a href="#">learn more</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'learn more',
              },
            },
          ],
        },
        {
          code: '<a href="#">a link</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'a link',
              },
            },
          ],
        },
        // Nested elements with ambiguous text
        {
          code: '<a href="#"><span> click </span> here</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'click here',
              },
            },
          ],
        },
        {
          code: '<a href="#">a<i></i> link</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'a link',
              },
            },
          ],
        },
        {
          code: '<a href="#"><i></i>a link</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'a link',
              },
            },
          ],
        },
        // Trimmed and case-insensitive
        {
          code: '<a href="#"> a link </a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'a link',
              },
            },
          ],
        },
        // Icon with ambiguous text
        {
          code: '<a href="/docs"><i></i>a link</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'a link',
              },
            },
          ],
        },
        // Punctuation is stripped before comparison - these are still ambiguous
        {
          code: '<a href="#">learn more.</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'learn more.',
              },
            },
          ],
        },
        {
          code: '<a href="#">learn more!</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'learn more!',
              },
            },
          ],
        },
      ],
    });
  });

  describe('aria-label and alt overrides', () => {
    ruleTester.run('aria-label and alt overrides', anchorAmbiguousText, {
      valid: [
        // aria-label overrides inner text
        {
          code: '<a href="#" aria-label="tutorial on using eslint-plugin-jsx-a11y">click here</a>',
        },
        // img alt text is checked for ambiguity
        {
          code: '<a href="#"><img alt="tutorial screenshot" /></a>',
        },
      ],
      invalid: [
        // aria-label itself is ambiguous
        {
          code: '<a href="#" aria-label="click here">something</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'click here',
              },
            },
          ],
        },
        // img alt text is ambiguous
        {
          code: '<a href="#"><img alt="click here" /></a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'click here',
              },
            },
          ],
        },
      ],
    });
  });

  describe('aria-hidden elements', () => {
    ruleTester.run('aria-hidden elements are skipped', anchorAmbiguousText, {
      valid: [
        // aria-hidden content is skipped, remaining text is descriptive
        {
          code: '<a href="#"><span aria-hidden="true">icon</span>View documentation</a>',
        },
      ],
      invalid: [
        // Only the non-hidden part is checked - "click here" is ambiguous
        {
          code: '<a href="#"><span aria-hidden="true">learn more</span>click here</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'click here',
              },
            },
          ],
        },
        // aria-hidden content is ignored, remaining "learn more" is ambiguous
        {
          code: '<a href="#"><span aria-hidden="true">more text</span>learn more</a>',
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'learn more',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', anchorAmbiguousText, {
      valid: [
        // Not an anchor element
        {
          code: '<div>click here</div>',
        },
        // Empty anchor (no text to check)
        {
          code: '<a href="#"></a>',
        },
        // Anchor with only whitespace (empty after trim)
        {
          code: '<a href="#">   </a>',
        },
        // Anchor with only dynamic content (can't analyze statically)
        {
          code: '<a href="#">{dynamicText}</a>',
        },
        // Anchor with JSX expressions (can't fully analyze)
        {
          code: '<a href="#">{`learn ${topic}`}</a>',
        },
      ],
      invalid: [],
    });
  });

  describe('Complex nested structures', () => {
    ruleTester.run('complex nested structures', anchorAmbiguousText, {
      valid: [
        {
          code: `
            <nav>
              <a href="/about">About Us</a>
              <a href="/services">Our Services</a>
            </nav>
          `,
        },
      ],
      invalid: [
        {
          code: `
            <nav>
              <a href="/about">here</a>
              <a href="/services">click here</a>
            </nav>
          `,
          errors: [
            {
              messageId: 'ambiguousText',
              data: {
                text: 'here',
              },
            },
            {
              messageId: 'ambiguousText',
              data: {
                text: 'click here',
              },
            },
          ],
        },
      ],
    });
  });
});
