/**
 * Tests for utm-taxonomy rule.
 * Validates utm_source and utm_medium values against the fixed taxonomy.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { utmTaxonomy } from '../../rules/conventions/utm-taxonomy';

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

describe('utm-taxonomy', () => {
  ruleTester.run('utm-taxonomy', utmTaxonomy, {
    valid: [
      // Strings without UTM are untouched.
      { code: 'const url = "https://example.com/path";' },
      { code: 'const url = "/relative/path";' },
      // Valid utm_source values.
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_source=ofriperetz_dev";',
      },
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_source=dev_to";',
      },
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_source=github&utm_medium=docs";',
      },
      // Valid utm_medium values.
      { code: 'const url = "https://x.com/?utm_medium=social";' },
      { code: 'const url = "https://example.com/?utm_medium=referral";' },
      // Combined valid source + medium.
      {
        code: 'const url = "https://eslint.interlace.tools/path?utm_source=linkedin&utm_medium=social&utm_campaign=launch";',
      },
      // JSX hrefs with valid values.
      {
        code: '<a href="https://eslint.interlace.tools/?utm_source=ofriperetz_dev&utm_medium=blog">link</a>;',
      },
      // Template literals with no interpolation but valid values.
      {
        code: 'const url = `https://eslint.interlace.tools/?utm_source=npm&utm_medium=cli`;',
      },
    ],
    invalid: [
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_source=Blog";',
        errors: [{ messageId: 'invalidUtmSource' }],
      },
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_source=blog_v2";',
        errors: [{ messageId: 'invalidUtmSource' }],
      },
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_source=facebook";',
        errors: [{ messageId: 'invalidUtmSource' }],
      },
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_medium=Blog";',
        errors: [{ messageId: 'invalidUtmMedium' }],
      },
      {
        code: 'const url = "https://eslint.interlace.tools/?utm_medium=newsletter";',
        errors: [{ messageId: 'invalidUtmMedium' }],
      },
      {
        code: 'const url = "https://e.com/?utm_source=BAD&utm_medium=BAD2";',
        errors: [
          { messageId: 'invalidUtmSource' },
          { messageId: 'invalidUtmMedium' },
        ],
      },
      {
        code: '<a href="https://eslint.interlace.tools/?utm_source=invalid">x</a>;',
        errors: [{ messageId: 'invalidUtmSource' }],
      },
    ],
  });
});
