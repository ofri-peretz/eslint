/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from 'vitest';
import { noInvisibleCharacters } from './index';

const ruleTester = new RuleTester();

// Every payload is written as a JS escape, so this file contains no invisible
// character itself — a test for CWE-1007 that cannot be reviewed would be the
// defect it tests for. `'\u3164'` in this file IS the character in the case;
// `'\\u3164'` is the six visible characters of the escape.
const HANGUL_FILLER = '\u3164';
const HALFWIDTH_FILLER = '\uFFA0';
const CHOSEONG_FILLER = '\u115F';
const JUNGSEONG_FILLER = '\u1160';
const KHMER_AQ = '\u17B4';
const KHMER_AA = '\u17B5';

const INVISIBLE = /[\u115F\u1160\u17B4\u17B5\u3164\uFFA0]/g;

type Where = 'code' | 'comment';

/**
 * One expected error per [line, column], in source order, reported as `where`
 * unless the position names its own. Each carries the suggestion's output: the
 * code with exactly that one character removed.
 */
function hits(
  code: string,
  where: Where,
  positions: [number, number, Where?][],
) {
  const indexes = [...code.matchAll(INVISIBLE)].map((m) => m.index as number);
  return positions.map(([line, column, own = where], n) => ({
    messageId:
      own === 'comment'
        ? ('invisibleCharacterInComment' as const)
        : ('invisibleCharacterInCode' as const),
    line,
    column,
    endLine: line,
    endColumn: column + 1,
    suggestions: [
      {
        messageId: 'removeInvisibleCharacter' as const,
        output: code.slice(0, indexes[n]) + code.slice(indexes[n] + 1),
      },
    ],
  }));
}

// The cases in the two blocks marked "Ported" are adapted from
// eslint-plugin-security@4.2.0, test/rules/detect-invisible-characters.js
// (https://github.com/eslint-community/eslint-plugin-security), licensed
// Apache-2.0. This rule is the drop-in for that rule's `detect-invisible-characters`,
// so its cases are the parity contract: every one of them must behave here as
// it does there. The implementation is independent; the cases are theirs.

describe('no-invisible-characters', () => {
  ruleTester.run('no-invisible-characters', noInvisibleCharacters, {
    valid: [
      // ── Ported from eslint-plugin-security (Apache-2.0) ──────────────────
      {
        name: 'ordinary multi-line ASCII code with an access check is quiet',
        code: `
      var accessLevel = "user";
      if (accessLevel != "user") {
        console.log("You are an admin.");
      }
      `,
      },
      {
        name: 'a plain ASCII string is quiet',
        code: 'var greeting = "hello world";',
      },
      {
        name: 'the filler written as a visible \\u3164 escape is quiet',
        code: 'var s = "\\u3164";',
      },
      {
        name: 'visible Hangul jamo U+3131 and U+314F beside U+3164 in its block are quiet',
        code: 'var s = "\u3131\u314F";',
      },
      {
        name: 'the visible halfwidth jamo U+FFA1 beside U+FFA0 in its block is quiet',
        code: 'var s = "\uFFA1";',
      },
      {
        name: 'ordinary Korean text (Hangul syllables) is quiet',
        code: 'var s = "\uC548\uB155\uD558\uC138\uC694";',
      },
      {
        name: 'a normal comment over ordinary code is quiet',
        code: `
      // a normal comment
      var isAdmin = false;
      `,
      },

      // ── Our own ──────────────────────────────────────────────────────────
      {
        name: 'conjoining jamo that compose a visible syllable are not fillers',
        code: 'const s = "\u1100\u1161";',
      },
      {
        name: 'visible Khmer text beside the inherent vowels in its block is quiet',
        code: 'const s = "\u1780\u17B6";',
      },
      {
        name: 'a zero-width space belongs to no-homoglyph-identifiers, not this rule',
        code: 'const group = "admin\u200B";',
      },
      {
        name: 'emoji built from ZWJ and variation selector 16 are ordinary UI text',
        code: 'const s = "\u2764\uFE0F \u{1F468}\u200D\u{1F469}";',
      },
      {
        name: 'every filler written as an escape is visible in review and quiet',
        code: 'const s = "\\u115F\\u1160\\u17B4\\u17B5\\uFFA0";',
      },
    ],
    invalid: [
      // ── Ported from eslint-plugin-security (Apache-2.0) ──────────────────
      {
        name: 'U+3164 inside a string literal',
        code: `var a = "hello${HANGUL_FILLER}world";`,
        errors: hits(`var a = "hello${HANGUL_FILLER}world";`, 'code', [
          [1, 15],
        ]),
      },
      {
        name: 'U+FFA0 inside a string literal',
        code: `var b = "foo${HALFWIDTH_FILLER}bar";`,
        errors: hits(`var b = "foo${HALFWIDTH_FILLER}bar";`, 'code', [[1, 13]]),
      },
      {
        name: 'both fillers in one string are reported separately',
        code: `var c = "a${HANGUL_FILLER}b${HALFWIDTH_FILLER}c";`,
        errors: hits(
          `var c = "a${HANGUL_FILLER}b${HALFWIDTH_FILLER}c";`,
          'code',
          [
            [1, 11],
            [1, 13],
          ],
        ),
      },
      {
        name: 'U+3164 inside an identifier makes a second name that looks like admin',
        code: `var adm${HANGUL_FILLER}in = 1;`,
        errors: hits(`var adm${HANGUL_FILLER}in = 1;`, 'code', [[1, 8]]),
      },
      {
        name: 'U+FFA0 inside an identifier',
        code: `var b${HALFWIDTH_FILLER}ar = 1;`,
        errors: hits(`var b${HALFWIDTH_FILLER}ar = 1;`, 'code', [[1, 6]]),
      },
      {
        name: 'a template literal after an LF reports line 2 at the right column',
        code: `var t = \`line1\nli${HANGUL_FILLER}ne2\`;`,
        errors: hits(`var t = \`line1\nli${HANGUL_FILLER}ne2\`;`, 'code', [
          [2, 3],
        ]),
      },
      {
        name: 'a template literal after a CRLF reports line 2 at the right column',
        code: `var t = \`line1\r\nli${HANGUL_FILLER}ne2\`;`,
        errors: hits(`var t = \`line1\r\nli${HANGUL_FILLER}ne2\`;`, 'code', [
          [2, 3],
        ]),
      },
      {
        name: 'a template literal after a lone CR reports line 2 at the right column',
        code: `var t = \`line1\rli${HANGUL_FILLER}ne2\`;`,
        errors: hits(`var t = \`line1\rli${HANGUL_FILLER}ne2\`;`, 'code', [
          [2, 3],
        ]),
      },
      {
        name: 'a template literal after U+2028 LINE SEPARATOR reports line 2',
        code: `var t = \`line1\u2028li${HANGUL_FILLER}ne2\`;`,
        errors: hits(`var t = \`line1\u2028li${HANGUL_FILLER}ne2\`;`, 'code', [
          [2, 3],
        ]),
      },
      {
        name: 'a template literal after U+2029 PARAGRAPH SEPARATOR reports line 2',
        code: `var t = \`line1\u2029li${HANGUL_FILLER}ne2\`;`,
        errors: hits(`var t = \`line1\u2029li${HANGUL_FILLER}ne2\`;`, 'code', [
          [2, 3],
        ]),
      },
      {
        name: 'a lone U+3164 after a trailing comma is a hidden array element',
        code: `const checkCommands = [\n  'ping -c 1 google.com',\n  'curl -s http://example.com/',${HANGUL_FILLER}\n];`,
        errors: hits(
          `const checkCommands = [\n  'ping -c 1 google.com',\n  'curl -s http://example.com/',${HANGUL_FILLER}\n];`,
          'code',
          [[3, 33]],
        ),
      },
      {
        name: 'U+3164 in a line comment is reported as comment text',
        code: `// hidden${HANGUL_FILLER}comment\nvar x = 1;`,
        errors: hits(
          `// hidden${HANGUL_FILLER}comment\nvar x = 1;`,
          'comment',
          [[1, 10]],
        ),
      },
      {
        name: 'U+3164 on both lines of a block comment is reported twice',
        code: `/* a${HANGUL_FILLER}\n b${HANGUL_FILLER} */\nvar y = 2;`,
        errors: hits(
          `/* a${HANGUL_FILLER}\n b${HANGUL_FILLER} */\nvar y = 2;`,
          'comment',
          [
            [1, 5],
            [2, 3],
          ],
        ),
      },

      // ── Our own ──────────────────────────────────────────────────────────
      {
        name: 'U+115F HANGUL CHOSEONG FILLER is an invisible letter too',
        code: `const s = "a${CHOSEONG_FILLER}b";`,
        errors: hits(`const s = "a${CHOSEONG_FILLER}b";`, 'code', [[1, 13]]),
      },
      {
        name: 'U+1160 HANGUL JUNGSEONG FILLER is an invisible letter too',
        code: `const s = "a${JUNGSEONG_FILLER}b";`,
        errors: hits(`const s = "a${JUNGSEONG_FILLER}b";`, 'code', [[1, 13]]),
      },
      {
        name: 'the Khmer inherent vowels U+17B4 and U+17B5 render as nothing',
        code: `const s = "a${KHMER_AQ}b${KHMER_AA}c";`,
        errors: hits(`const s = "a${KHMER_AQ}b${KHMER_AA}c";`, 'code', [
          [1, 13],
          [1, 15],
        ]),
      },
      {
        name: 'the invisible-backdoor shape: a filler destructured from input, then executed',
        code: `const { timeout, ${HANGUL_FILLER} } = req.query;\nexec(${HANGUL_FILLER});`,
        errors: hits(
          `const { timeout, ${HANGUL_FILLER} } = req.query;\nexec(${HANGUL_FILLER});`,
          'code',
          [
            [1, 18],
            [2, 6],
          ],
        ),
      },
      {
        name: 'a filler inside a regular expression literal changes what it matches',
        code: `const re = /^adm${HANGUL_FILLER}in$/;`,
        errors: hits(`const re = /^adm${HANGUL_FILLER}in$/;`, 'code', [
          [1, 17],
        ]),
      },
      {
        name: 'code and comment hits in one file each get their own message',
        code: `const role = "adm${HANGUL_FILLER}in"; // ok${HANGUL_FILLER}`,
        errors: hits(
          `const role = "adm${HANGUL_FILLER}in"; // ok${HANGUL_FILLER}`,
          'code',
          [
            [1, 18],
            [1, 29, 'comment'],
          ],
        ),
      },
    ],
  });
});
