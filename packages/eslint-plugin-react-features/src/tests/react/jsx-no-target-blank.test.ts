/**
 * @fileoverview Tests for jsx-no-target-blank rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxNoTargetBlank } from '../../rules/react/jsx-no-target-blank';

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

describe('jsx-no-target-blank', () => {
  ruleTester.run('jsx-no-target-blank', jsxNoTargetBlank, {
    valid: [
      // No target="_blank"
      '<a href="https://example.com">Link</a>',
      // With rel="noopener"
      '<a href="https://example.com" target="_blank" rel="noopener">Link</a>',
      // With rel="noreferrer"
      '<a href="https://example.com" target="_blank" rel="noreferrer">Link</a>',
      // With rel="noopener noreferrer"
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>',
      // With other targets
      '<a href="https://example.com" target="_self">Link</a>',
      '<a href="https://example.com" target="_parent">Link</a>',
      // Relative URLs are safe
      '<a href="/page" target="_blank">Link</a>',
      // Same-origin URLs
      '<a href="#hash" target="_blank">Link</a>',
    ],
    invalid: [
      {
        code: '<a href="https://example.com" target="_blank">Link</a>',
        output: '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        code: '<a href="https://example.com" target="_blank" rel="nofollow">Link</a>',
        output: '<a href="https://example.com" target="_blank" rel="nofollow noopener noreferrer">Link</a>',
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        code: '<a href="http://example.com" target="_blank">Link</a>',
        output: '<a href="http://example.com" target="_blank" rel="noopener noreferrer">Link</a>',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        code: '<a href="//example.com" target="_blank">Link</a>',
        output: '<a href="//example.com" target="_blank" rel="noopener noreferrer">Link</a>',
        errors: [{ messageId: 'noTargetBlank' }],
      },
    ],
  });
});
