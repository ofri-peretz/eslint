/**
 * Tests for heading-has-content rule
 * Accessibility: WCAG 1.3.1 Info and Relationships (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { headingHasContent } from '../rules/heading-has-content';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('heading-has-content', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid headings', headingHasContent, {
      valid: [
        { code: '<h1>Title</h1>' },
        { code: '<h2>Subtitle</h2>' },
        { code: '<h3>Section</h3>' },
        { code: '<h4>Subsection</h4>' },
        { code: '<h5>Minor</h5>' },
        { code: '<h6>Smallest</h6>' },
        // Note: This rule doesn't treat aria-label as content for headings
        { code: '<h1><span>Content</span></h1>' },
        { code: '<h1>{title}</h1>' },
        // dangerouslySetInnerHTML counts as content
        { code: '<h1 dangerouslySetInnerHTML={{ __html: "Title" }} />' },
        // children prop counts as content
        { code: '<h1 children="Title" />' },
        // title attribute counts as content
        { code: '<h1 title="Title" />' },
        // Non-heading JSX elements should be ignored
        { code: '<div></div>' },
        // Custom components option
        {
          code: '<Heading>Content</Heading>',
          options: [{ components: ['Heading'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - empty headings', headingHasContent, {
      valid: [],
      invalid: [
        { code: '<h1></h1>', errors: [{ messageId: 'missingContent' }] },
        { code: '<h2></h2>', errors: [{ messageId: 'missingContent' }] },
        { code: '<h3 />', errors: [{ messageId: 'missingContent' }] },
        { code: '<h4></h4>', errors: [{ messageId: 'missingContent' }] },
        { code: '<h5 />', errors: [{ messageId: 'missingContent' }] },
        { code: '<h6></h6>', errors: [{ messageId: 'missingContent' }] },
        // Custom component without content
        {
          code: '<Heading />',
          options: [{ components: ['Heading'] }],
          errors: [{ messageId: 'missingContent' }],
        },
      ],
    });
  });
});
