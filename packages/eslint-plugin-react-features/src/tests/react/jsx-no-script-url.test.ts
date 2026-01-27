/**
 * @fileoverview Tests for jsx-no-script-url rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxNoScriptUrl } from '../../rules/react/jsx-no-script-url';

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

describe('jsx-no-script-url', () => {
  ruleTester.run('jsx-no-script-url', jsxNoScriptUrl, {
    valid: [
      // Normal URLs
      '<a href="https://example.com">Link</a>',
      '<a href="http://example.com">Link</a>',
      '<a href="/page">Link</a>',
      '<a href="#section">Link</a>',
      '<a href="mailto:test@example.com">Email</a>',
      '<a href="tel:+1234567890">Call</a>',
      // No href
      '<a>Link</a>',
      // Empty href
      '<a href="">Link</a>',
      // Non-anchor elements
      '<button onClick={handleClick}>Button</button>',
      '<div>Content</div>',
    ],
    invalid: [
      {
        code: '<a href="javascript:void(0)">Link</a>',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        code: '<a href="javascript:alert(1)">Link</a>',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        code: '<a href="JAVASCRIPT:void(0)">Link</a>',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        code: '<a href="javascript:">Link</a>',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        code: '<a href="  javascript:void(0)">Link</a>',
        errors: [{ messageId: 'noScriptUrl' }],
      },
    ],
  });
});
