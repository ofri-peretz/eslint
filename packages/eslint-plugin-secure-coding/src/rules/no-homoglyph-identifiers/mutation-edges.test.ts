/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHomoglyphIdentifiers } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Every entry of the confusable table, with the ASCII letter it renders as.
 * Removing any one entry from the rule's map makes its case go silent.
 */
const CONFUSABLES: ReadonlyArray<readonly [number, string]> = [
  [0x0430, 'a'],
  [0x0432, 'b'],
  [0x0433, 'r'],
  [0x0435, 'e'],
  [0x043a, 'k'],
  [0x043c, 'm'],
  [0x043d, 'h'],
  [0x043e, 'o'],
  [0x0440, 'p'],
  [0x0441, 'c'],
  [0x0443, 'y'],
  [0x0445, 'x'],
  [0x0455, 's'],
  [0x0456, 'i'],
  [0x0458, 'j'],
  [0x0405, 'S'],
  [0x0406, 'I'],
  [0x0408, 'J'],
  [0x0410, 'A'],
  [0x0412, 'B'],
  [0x0415, 'E'],
  [0x041a, 'K'],
  [0x041c, 'M'],
  [0x041d, 'H'],
  [0x041e, 'O'],
  [0x0420, 'P'],
  [0x0421, 'C'],
  [0x0422, 'T'],
  [0x0423, 'Y'],
  [0x0425, 'X'],
  [0x03b1, 'a'],
  [0x03b5, 'e'],
  [0x03b9, 'i'],
  [0x03ba, 'k'],
  [0x03bd, 'v'],
  [0x03bf, 'o'],
  [0x03c1, 'p'],
  [0x03c3, 'o'],
  [0x03c4, 't'],
  [0x03c5, 'u'],
  [0x03c7, 'x'],
  [0x0391, 'A'],
  [0x0392, 'B'],
  [0x0395, 'E'],
  [0x0396, 'Z'],
  [0x0397, 'H'],
  [0x0399, 'I'],
  [0x039a, 'K'],
  [0x039c, 'M'],
  [0x039d, 'N'],
  [0x039f, 'O'],
  [0x03a1, 'P'],
  [0x03a4, 'T'],
  [0x03a5, 'Y'],
  [0x03a7, 'X'],
  [0x0578, 'n'],
  [0x057d, 'u'],
  [0x0585, 'o'],
  [0x13a0, 'D'],
  [0x13a9, 'E'],
  [0x13aa, 'A'],
  [0x13b3, 'W'],
  [0x13bb, 'P'],
  [0x13c0, 'G'],
  [0x13cf, 'C'],
  [0x13d9, 'V'],
  [0x13de, 'S'],
  [0x13e2, 'B'],
  [0x01c0, 'l'],
  [0x0131, 'i'],
  [0x0261, 'g'],
];

const label = (cp: number) =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

describe('no-homoglyph-identifiers (mutation edges)', () => {
  ruleTester.run('no-homoglyph-identifiers', noHomoglyphIdentifiers, {
    valid: [
      {
        name: 'a non-ASCII letter that impersonates nothing is not a homoglyph',
        code: 'const caf\u00e9Total = 1;',
      },
      {
        name: 'halfwidth katakana U+FF66 (past fullwidth z) impersonates no ASCII letter',
        code: 'const total\uff66 = 1;',
      },
      {
        name: 'fullwidth digit U+FF10 (below fullwidth A) impersonates no ASCII letter',
        code: 'const total\uff10 = 1;',
      },
      {
        name: 'an invisible character with no visible ASCII neighbour on either side is left alone',
        code: "const s = ' \u200b ';",
      },
      {
        name: 'U+0020 (just below the visible-ASCII floor) is not a visible neighbour',
        code: "const s = ' \u200b ';",
      },
      {
        name: 'U+007F (just past the visible-ASCII ceiling) is not a visible neighbour',
        code: "const s = '\u007f\u200b\u007f';",
      },
    ],
    invalid: [
      ...CONFUSABLES.map(([cp, latin]) => ({
        name: `${label(cp)} renders as ASCII "${latin}"`,
        code: `const total${String.fromCharCode(cp)} = 1;`,
        errors: [
          {
            messageId: 'homoglyphIdentifier' as const,
            data: {
              name: `total${String.fromCharCode(cp)}`,
              codepoint: label(cp),
              latin,
            },
          },
        ],
      })),
      {
        name: 'fullwidth Z (U+FF3A, the top of the uppercase range) renders as Z',
        code: 'const total\uff3a = 1;',
        errors: [
          {
            messageId: 'homoglyphIdentifier' as const,
            data: { name: 'total\uff3a', codepoint: 'U+FF3A', latin: 'Z' },
          },
        ],
      },
      {
        name: 'fullwidth a (U+FF41, the bottom of the lowercase range) renders as a',
        code: 'const total\uff41 = 1;',
        errors: [
          {
            messageId: 'homoglyphIdentifier' as const,
            data: { name: 'total\uff41', codepoint: 'U+FF41', latin: 'a' },
          },
        ],
      },
      {
        name: 'fullwidth z (U+FF5A, the top of the lowercase range) renders as z',
        code: 'const total\uff5a = 1;',
        errors: [
          {
            messageId: 'homoglyphIdentifier' as const,
            data: { name: 'total\uff5a', codepoint: 'U+FF5A', latin: 'z' },
          },
        ],
      },
      {
        name: '"!" (U+0021, the visible-ASCII floor) before an invisible character is visible',
        code: "const s = ' !\u200b ';",
        errors: [{ messageId: 'invisibleCharacter' as const }],
      },
      {
        name: '"~" (U+007E, the visible-ASCII ceiling) after an invisible character is visible',
        code: "const s = ' \u200b~ ';",
        errors: [{ messageId: 'invisibleCharacter' as const }],
      },
    ],
  });
});
