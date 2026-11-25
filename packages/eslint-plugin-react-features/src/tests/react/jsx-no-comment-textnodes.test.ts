/**
 * Tests for jsx-no-comment-textnodes
 * A comment written between tags renders as text; it belongs in braces.
 * The case list follows eslint-plugin-react's tests/lib/rules/jsx-no-comment-textnodes.js
 * (the full set is in upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { jsxNoCommentTextnodes } from '../../rules/react/jsx-no-comment-textnodes';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('jsx-no-comment-textnodes', jsxNoCommentTextnodes, {
  valid: [
    {
      name: 'a comment in braces',
      code: '<div>{/* valid */}</div>',
    },
    {
      name: 'a line comment in braces',
      code: `<div>{
        // valid
      }</div>`,
    },
    {
      name: 'a string that looks like a comment, in braces',
      code: "<div>{'// not a comment'}</div>",
    },
    {
      name: 'text with a URL: the slashes do not start a line',
      code: '<div>see http://example.com</div>',
    },
    {
      name: 'a comment-like string as an attribute value',
      code: '<div title="// not a comment" />',
    },
    {
      name: 'a comment-like string outside JSX',
      code: "const url = '// not jsx';",
    },
    {
      name: 'a string literal continued over a line that starts with slashes, outside JSX',
      code: 'var a = "x\\\n// y";',
    },
    {
      name: 'no comment at all',
      code: '<div>plain</div>',
    },
  ],
  invalid: [
    {
      name: 'a line comment as text',
      code: '<div>// invalid</div>',
      errors: [{ messageId: 'putCommentInBraces' }],
    },
    {
      name: 'a block comment as text',
      code: '<div>/* invalid */</div>',
      errors: [{ messageId: 'putCommentInBraces' }],
    },
    {
      name: 'a comment on its own line of text',
      code: `<div>
        // invalid
      </div>`,
      errors: [{ messageId: 'putCommentInBraces' }],
    },
    {
      name: 'a comment in a fragment',
      code: '<>// invalid</>',
      errors: [{ messageId: 'putCommentInBraces' }],
    },
    {
      name: 'a comment after an element, still text of the parent',
      code: '<div><span /> // invalid</div>',
      errors: [{ messageId: 'putCommentInBraces' }],
    },
  ],
});
