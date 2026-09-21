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
      { name: 'the same prop without the prefix', code: `interface Props { looped: boolean; }` },
      // Non-boolean type — even with `is` prefix, not flagged
      { code: `interface Props { isLooped: string; }` },
      {
        name: '`is` followed by a lowercase letter is a word, not a prefix',
        code: `interface Props { island: boolean; }`,
      },
      // Other patterns
      { code: `interface Props { disabled: boolean; loading: boolean; }` },
      // Property is a function — not a flagged shape
      { code: `interface Props { isOpen: () => boolean; }` },
    ],
    invalid: [
      {
        name: 'an is-prefixed boolean prop',
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
        /*
         * `isTTY` mirrors Node's own `process.stdin` shape. The rename has to
         * stay a usable identifier: a leading run of capitals is an acronym,
         * not a word boundary.
         * @found burgee FP/FN sweep 2026-09-15, packages/flagstaff/src/ora.ts:76
         */
        name: 'an acronym after the prefix lowercases as a whole run, not one character',
        code: `interface Props { isTTY: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { tty: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        // The acronym run ends where the next word starts, so the capital that
        // begins that word survives: `isURLPath` -> `urlPath`, not `urlpath`.
        name: 'an acronym followed by a word keeps the word boundary',
        code: `interface Props { isURLPath: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { urlPath: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        /*
         * A two-letter acronym.
         * @found burgee FP/FN sweep 2026-09-15, packages/caique/src/terminal.ts:20
         */
        name: 'a two-letter acronym lowercases fully',
        code: `interface Props { isID: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { id: boolean; }`,
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
