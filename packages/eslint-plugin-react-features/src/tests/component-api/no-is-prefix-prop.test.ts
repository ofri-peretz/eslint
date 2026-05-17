/**
 * Tests for no-is-prefix-prop (R8)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noIsPrefixProp } from '../../rules/component-api/no-is-prefix-prop';

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

describe('no-is-prefix-prop', () => {
  ruleTester.run('no-is-prefix-prop', noIsPrefixProp, {
    valid: [
      // Boolean without `is` prefix
      { code: `interface Props { looped: boolean; }` },
      // Non-boolean type — even with `is` prefix, not flagged
      { code: `interface Props { isLooped: string; }` },
      // `is` followed by lowercase — not a prefix pattern
      { code: `interface Props { island: boolean; }` },
      // Other patterns
      { code: `interface Props { disabled: boolean; loading: boolean; }` },
      // Property is a function — not a flagged shape
      { code: `interface Props { isOpen: () => boolean; }` },
    ],
    invalid: [
      {
        code: `interface Props { isLooped: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { looped: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        code: `type Props = { isOpen: boolean; };`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `type Props = { open: boolean; };`,
              },
            ],
          },
        ],
      },
      {
        code: `interface Props { isDisabled: boolean; isHidden: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { disabled: boolean; isHidden: boolean; }`,
              },
            ],
          },
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { isDisabled: boolean; hidden: boolean; }`,
              },
            ],
          },
        ],
      },
    ],
  });
});
