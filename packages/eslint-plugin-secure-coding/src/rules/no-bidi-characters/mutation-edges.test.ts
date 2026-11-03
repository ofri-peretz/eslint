/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noBidiCharacters } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const bidi = [{ messageId: 'bidiCharacter' as const, suggestions: 1 }];
/** U+1D173 MUSICAL SYMBOL BEGIN BEAM — a format character, not built in. */
const BEAM = '\u{1D173}';

describe('no-bidi-characters (mutation edges)', () => {
  ruleTester.run('no-bidi-characters', noBidiCharacters, {
    valid: [
      {
        name: 'a configured label with text before U+ is not a code point',
        options: [{ additionalCharacters: ['xU+1D173'] }],
        code: `const s = '${BEAM}';`,
      },
      {
        name: 'a configured label with text after the hex is not a code point',
        options: [{ additionalCharacters: ['U+1D173x'] }],
        code: `const s = '${BEAM}';`,
      },
    ],
    invalid: [
      ...(
        [
          ['‪', 'LEFT-TO-RIGHT EMBEDDING'],
          ['‫', 'RIGHT-TO-LEFT EMBEDDING'],
          ['‬', 'POP DIRECTIONAL FORMATTING'],
          ['‭', 'LEFT-TO-RIGHT OVERRIDE'],
          ['⁧', 'RIGHT-TO-LEFT ISOLATE'],
          ['⁨', 'FIRST STRONG ISOLATE'],
          ['‎', 'LEFT-TO-RIGHT MARK'],
        ] as const
      ).map(([char, name]) => ({
        name: `${name} is a bidi control`,
        code: `const s = 'a${char}b';`,
        errors: bidi,
      })),
      {
        name: 'a configured label is trimmed before it is read, and the trimmed label names it',
        options: [{ additionalCharacters: [' U+1D173 '] }],
        code: `const s = '${BEAM}';`,
        errors: [
          {
            messageId: 'bidiCharacter' as const,
            data: { characterName: 'U+1D173' },
            suggestions: 1,
          },
        ],
      },
      {
        name: 'the last valid code point U+10FFFF can be configured',
        options: [{ additionalCharacters: ['U+10FFFF'] }],
        code: "const s = '\u{10FFFF}';",
        errors: bidi,
      },
      {
        name: 'U+FFFF is one code unit wide, so the control after it is still seen',
        code: "const s = '￿‮';",
        errors: bidi,
      },
      {
        name: 'the suggestion removes exactly the control character',
        code: "const s = 'a‮b';",
        errors: [
          {
            messageId: 'bidiCharacter' as const,
            line: 1,
            column: 13,
            endLine: 1,
            endColumn: 14,
            suggestions: [
              {
                messageId: 'removeBidiCharacter' as const,
                data: { characterName: 'U+202E RIGHT-TO-LEFT OVERRIDE' },
                output: "const s = 'ab';",
              },
            ],
          },
        ],
      },
    ],
  });
});
