/**
 * Tests for no-raw-cross-property-href rule.
 * Flags hand-written cross-property URL literals in JSX href attributes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRawCrossPropertyHref } from '../../rules/conventions/no-raw-cross-property-href';

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

describe('no-raw-cross-property-href', () => {
  ruleTester.run(
    'no-raw-cross-property-href',
    noRawCrossPropertyHref,
    {
      valid: [
        // Relative href is internal navigation.
        { code: '<a href="/docs">docs</a>;' },
        { code: '<a href="#section">jump</a>;' },
        // Third-party hosts (not in the cross-property list) pass.
        { code: '<a href="https://github.com/ofri-peretz/eslint">gh</a>;' },
        { code: '<a href="https://npmjs.com/package/eslint">npm</a>;' },
        { code: '<a href="https://dev.to/ofriperetzdev">blog</a>;' },
        { code: '<a href="https://example.com/path">x</a>;' },
        // Expression-wrapped href is the escape hatch — buildUtmHref result.
        {
          code: '<a href={buildUtmHref("https://eslint.interlace.tools/", opts)}>x</a>;',
        },
        {
          code: 'const u = "https://eslint.interlace.tools/"; <a href={u}>x</a>;',
        },
        // Non-href JSX attribute is ignored.
        {
          code: '<img src="https://ds.interlace.tools/logo.png" alt="x" />;',
        },
        // Malformed URL string is not flagged.
        { code: '<a href="not a url">x</a>;' },
      ],
      invalid: [
        {
          code: '<a href="https://eslint.interlace.tools/docs">x</a>;',
          errors: [{ messageId: 'rawCrossPropertyHref' }],
        },
        {
          code: '<a href="https://ds.interlace.tools/components/button">x</a>;',
          errors: [{ messageId: 'rawCrossPropertyHref' }],
        },
        {
          code: '<a href="https://serverless.interlace.tools/">x</a>;',
          errors: [{ messageId: 'rawCrossPropertyHref' }],
        },
        {
          code: '<a href="https://storybook.interlace.tools/">x</a>;',
          errors: [{ messageId: 'rawCrossPropertyHref' }],
        },
        {
          code: '<a href="https://interlace.tools/">x</a>;',
          errors: [{ messageId: 'rawCrossPropertyHref' }],
        },
        {
          code: '<a href="https://ofriperetz.dev/articles">x</a>;',
          errors: [{ messageId: 'rawCrossPropertyHref' }],
        },
        // Casing of the host is normalized.
        {
          code: '<a href="https://ESLint.Interlace.Tools/docs">x</a>;',
          errors: [{ messageId: 'rawCrossPropertyHref' }],
        },
      ],
    },
  );
});
