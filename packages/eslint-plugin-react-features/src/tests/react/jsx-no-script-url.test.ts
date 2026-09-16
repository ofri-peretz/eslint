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
      {
        name: 'an ordinary href',
        code: '<a href="https://example.com">Link</a>',
      },
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
        name: 'a javascript: href',
        code: '<a href="javascript:void(0)">Link</a>',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        code: '<a href="javascript:alert(1)">Link</a>',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        name: 'the scheme test is case-insensitive',
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
      // ── FN sealed 2026-09-16, from the burgee FP/FN sweep ───────────────
      // `/^\s*javascript:/i` stripped whitespace only BEFORE the scheme. The
      // URL parser removes leading C0 controls and space, then strips every
      // ASCII tab/LF/CR from anywhere in the input — so both of these resolve
      // to `javascript:alert(1)`, verified in Chrome and in Node's WHATWG
      // `URL`, identical to the plain payload three cases above. Built from
      // char codes because the payload is invisible in source, which is the
      // whole point of the evasion.
      {
        // @found spec diff (WHATWG URL)
        name: 'FN: a tab inside the scheme is still a javascript: URL',
        code: `<a href="java${String.fromCharCode(9)}script:alert(1)">Link</a>`,
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        // @found spec diff (WHATWG URL)
        name: 'FN: a leading C0 control still resolves to javascript:',
        code: `<a href="${String.fromCharCode(1)}javascript:alert(1)">Link</a>`,
        errors: [{ messageId: 'noScriptUrl' }],
      },
    ],
  });
});
