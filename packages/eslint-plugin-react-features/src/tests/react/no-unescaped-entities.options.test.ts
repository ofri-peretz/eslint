/**
 * Tests for no-unescaped-entities' `forbid` option. The case list follows
 * eslint-plugin-react's tests/lib/rules/no-unescaped-entities.js (the full set
 * is in upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnescapedEntities } from '../../rules/react/no-unescaped-entities';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-unescaped-entities forbid', noUnescapedEntities, {
  valid: [
    {
      name: 'forbid replaces the defaults: a quote is allowed',
      options: [{ forbid: ['&'] }],
      code: '<div>He said "hi"</div>',
    },
    {
      name: 'an entry with no character forbids nothing',
      options: [{ forbid: [{ alternatives: ['&amp;'] }, ''] }],
      code: '<div>foo & bar</div>',
    },
    {
      name: 'an empty forbid list forbids nothing',
      options: [{ forbid: [] }],
      code: '<div>foo "bar" baz</div>',
    },
  ],
  invalid: [
    {
      name: 'a forbidden character, as a bare string',
      options: [{ forbid: ['&'] }],
      code: '<div>foo & bar</div>',
      errors: [{ messageId: 'noUnescapedEntities', line: 1, column: 10 }],
    },
    {
      name: 'every occurrence is reported where it stands',
      options: [{ forbid: ['&'] }],
      code: '<div>a & b &\n  & c</div>',
      errors: [
        { messageId: 'noUnescapedEntities', line: 1, column: 8 },
        { messageId: 'noUnescapedEntities', line: 1, column: 12 },
        { messageId: 'noUnescapedEntities', line: 2, column: 3 },
      ],
    },
    {
      name: 'a character with alternatives suggests each of them',
      options: [{ forbid: [{ char: '&', alternatives: ['&amp;', '&#38;'] }] }],
      code: '<div>foo & bar</div>',
      errors: [
        {
          messageId: 'noUnescapedEntities',
          suggestions: [
            {
              messageId: 'replaceWithAlt',
              data: { alt: '&amp;' },
              output: '<div>foo &amp; bar</div>',
            },
            {
              messageId: 'replaceWithAlt',
              data: { alt: '&#38;' },
              output: '<div>foo &#38; bar</div>',
            },
          ],
        },
      ],
    },
    {
      name: 'a character in an object with no alternatives suggests nothing',
      options: [{ forbid: [{ char: '&' }] }],
      code: '<div>foo & bar</div>',
      errors: [{ messageId: 'noUnescapedEntities' }],
    },
  ],
});
