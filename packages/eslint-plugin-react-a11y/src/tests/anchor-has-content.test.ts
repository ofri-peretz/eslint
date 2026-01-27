/**
 * Tests for anchor-has-content rule
 * Accessibility: WCAG 2.4.4 Link Purpose (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { anchorHasContent } from '../rules/anchor-has-content';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('anchor-has-content', () => {
  describe('Valid Code - Accessible Anchors', () => {
    ruleTester.run('valid - anchors with content', anchorHasContent, {
      valid: [
        // Text content
        { code: '<a href="#">Click here</a>' },
        { code: '<a href="/home">Home</a>' },
        // aria-label for icon-only links
        { code: '<a href="#" aria-label="Go to home"><Icon /></a>' },
        // aria-labelledby
        { code: '<a href="#" aria-labelledby="labelId"><Icon /></a>' },
        // Title attribute
        { code: '<a href="#" title="Link title"><Icon /></a>' },
        // Children prop
        { code: '<a href="#" children="Content" />' },
        // dangerouslySetInnerHTML (has content)
        { code: '<a href="#" dangerouslySetInnerHTML={{ __html: "content" }} />' },
        // JSX expression children
        { code: '<a href="#">{text}</a>' },
        // Multiple children
        { code: '<a href="#"><span>Icon</span> Text</a>' },
        // Custom component with components option
        {
          code: '<Link href="#">Click</Link>',
          options: [{ components: ['Link'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Inaccessible Anchors', () => {
    ruleTester.run('invalid - empty anchors', anchorHasContent, {
      valid: [],
      invalid: [
        // Empty anchor
        {
          code: '<a href="#"></a>',
          errors: [{ messageId: 'missingContent' }],
        },
        // Self-closing without accessible content
        {
          code: '<a href="#" />',
          errors: [{ messageId: 'missingContent' }],
        },
        // Only non-accessible attributes
        {
          code: '<a href="#" className="link" id="myLink"></a>',
          errors: [{ messageId: 'missingContent' }],
        },
        // Custom component without content
        {
          code: '<Link href="#"></Link>',
          options: [{ components: ['Link'] }],
          errors: [{ messageId: 'missingContent' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', anchorHasContent, {
      valid: [
        // Non-anchor elements (should not trigger)
        { code: '<div></div>' },
        { code: '<button></button>' },
      ],
      invalid: [],
    });
  });

  describe('FP Protection - Known False Positives', () => {
    ruleTester.run('FP protection', anchorHasContent, {
      valid: [
        // Fragment children (should be valid)
        { code: '<a href="#"><>Content</></a>' },
        // Conditional content (content exists)
        { code: '<a href="#">{condition ? "Yes" : "No"}</a>' },
        // Whitespace-only text - currently valid, but could be FP in strict mode
        // NOTE: This might need stricter handling
        { code: '<a href="#"> </a>' },
      ],
      invalid: [],
    });
  });

  describe('FN Protection - Known Attack Patterns', () => {
    ruleTester.run('FN protection - must catch inaccessible patterns', anchorHasContent, {
      valid: [],
      invalid: [
        // Empty with only href
        {
          code: '<a href="https://example.com"></a>',
          errors: [{ messageId: 'missingContent' }],
        },
      ],
    });
  });
});
