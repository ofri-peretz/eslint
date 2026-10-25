/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-invisible-characters
 * Detects blank-glyph LETTERS — characters JavaScript accepts as part of a
 * name, that every editor draws as nothing (CWE-1007, the "invisible backdoor").
 *
 *   const admin = false;
 *   const adm<U+3164>in = true;   // two bindings; the diff shows one name twice
 *
 *   const commands = [
 *     'ping -c 1 example.com',
 *     'curl -s http://example.com/',<U+3164>   // a hidden array element
 *   ];
 *
 * The characters here are the ones the two sibling rules cannot see:
 * `no-bidi-characters` owns the bidi controls and `no-homoglyph-identifiers`
 * owns the zero-width format characters. Those are FORMAT characters (Cf).
 * The Hangul fillers and the Khmer inherent vowels are LETTERS and MARKS
 * (Lo / Mn), which is what makes them dangerous — they are legal inside an
 * identifier, so they can mint a second name that looks like the first, or
 * stand alone as an entire identifier that renders as whitespace.
 *
 * Like `no-bidi-characters`, this reads source text rather than the AST: the
 * payload hides in identifiers, strings, templates, regexes and comments
 * alike, and a comment is not an AST node.
 *
 * @see https://certitude.consulting/blog/en/invisible-backdoor/
 * @see https://cwe.mitre.org/data/definitions/1007.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'invisibleCharacterInCode'
  | 'invisibleCharacterInComment'
  | 'removeInvisibleCharacter';

/**
 * @vocabulary The code points are Unicode's: each is a Default_Ignorable_Code_Point
 * that is also a letter or mark, so it renders as nothing and is still valid
 * inside a JavaScript identifier. They are a property of the character set,
 * not of anybody's codebase.
 *
 * Deliberately NOT a range. U+3131 and U+314F sit beside U+3164 in the Hangul
 * Compatibility Jamo block and U+FFA1 beside U+FFA0 in the halfwidth block;
 * each is a visible Korean letter, and a range would report Korean text.
 *
 * Also deliberately not here: U+200B–U+200D, U+2060, U+FEFF and the other
 * format characters (reported by `no-homoglyph-identifiers`), and the
 * variation selectors U+FE00–U+FE0F, which are a required part of ordinary
 * emoji. Reporting them here would put a second finding on a line another
 * rule already owns, or a first finding on every emoji in a UI string.
 */
const INVISIBLE_LETTERS = new Map<string, string>([
  ['\u115F', 'U+115F HANGUL CHOSEONG FILLER'],
  ['\u1160', 'U+1160 HANGUL JUNGSEONG FILLER'],
  ['\u17B4', 'U+17B4 KHMER VOWEL INHERENT AQ'],
  ['\u17B5', 'U+17B5 KHMER VOWEL INHERENT AA'],
  ['\u3164', 'U+3164 HANGUL FILLER'],
  ['\uFFA0', 'U+FFA0 HALFWIDTH HANGUL FILLER'],
]);

/** The same set as one scan. Every member is in the BMP: one UTF-16 unit each. */
const INVISIBLE_PATTERN = new RegExp(
  `[${[...INVISIBLE_LETTERS.keys()].join('')}]`,
  'g',
);

/** Whether `index` falls inside a comment. */
const inComment = (
  comments: readonly TSESTree.Comment[],
  index: number,
): boolean =>
  comments.some(({ range: [start, end] }) => index >= start && index < end);

export const noInvisibleCharacters = createRule<[], MessageIds>({
  name: 'no-invisible-characters',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-invisible-characters',
      description:
        'Disallows invisible letters such as the Hangul fillers (U+3164, U+FFA0), which hide identifiers, values and comment text from code review (CWE-1007)',
      cwe: 'CWE-1007',
      cweJustification:
        'CWE-1007 (Insufficient Visual Distinction of Homoglyphs Presented to User) — the reviewer is the user and the editor is the display: `admin` and `adm<U+3164>in` are two identifiers rendered as one, so a reviewer approves a binding or a value that is not the one the program uses. Chosen over CWE-176 (Improper Handling of Unicode Encoding), which describes a product mishandling Unicode it receives as input; here nothing is mishandled — the parser reads the character correctly, and the weakness is entirely in what the human can see. It is also the CWE the sibling rules no-bidi-characters and no-homoglyph-identifiers carry for the same review-deception class.',
      cvss: 5.3,
    },
    hasSuggestions: true,
    messages: {
      invisibleCharacterInCode: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Invisible character in code (CWE-1007)',
        cwe: 'CWE-1007',
        description:
          '{{characterName}} found in code. It renders as nothing but is a real character: inside a name it makes a different identifier, inside a string a different value, and alone it is an identifier a reviewer cannot see.',
        severity: 'MEDIUM',
        fix: 'Remove the character. If a string genuinely needs it, write it as an escape (\\u3164) so it is visible in review.',
        documentationLink:
          'https://certitude.consulting/blog/en/invisible-backdoor/',
      }),
      invisibleCharacterInComment: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Invisible character in comment (CWE-1007)',
        cwe: 'CWE-1007',
        description:
          '{{characterName}} found in a comment. It renders as nothing, so the comment a reviewer reads is not the text that is there.',
        severity: 'MEDIUM',
        fix: 'Remove the character.',
        documentationLink:
          'https://certitude.consulting/blog/en/invisible-backdoor/',
      }),
      removeInvisibleCharacter: 'Remove {{characterName}}',
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      Program(node: TSESTree.Program) {
        const { sourceCode } = context;
        // `.text` is the file as parsed, read once per file in `Program`.
        const text = sourceCode.text;
        const comments = sourceCode.getAllComments();

        // `matchAll` iterates a copy of the pattern, so its `lastIndex` never
        // leaks from one file into the next.
        for (const match of text.matchAll(INVISIBLE_PATTERN)) {
          const index = match.index;
          const characterName = INVISIBLE_LETTERS.get(match[0]) as string;
          const range: TSESTree.Range = [index, index + 1];

          // One report per character, located on the character itself: the
          // whole point is to point at something the reader cannot see.
          context.report({
            node,
            loc: {
              start: sourceCode.getLocFromIndex(index),
              end: sourceCode.getLocFromIndex(index + 1),
            },
            messageId: inComment(comments, index)
              ? 'invisibleCharacterInComment'
              : 'invisibleCharacterInCode',
            data: { characterName },
            suggest: [
              {
                messageId: 'removeInvisibleCharacter',
                data: { characterName },
                fix: (fixer: TSESLint.RuleFixer) => fixer.removeRange(range),
              },
            ],
          });
        }
      },
    };
  },
});
