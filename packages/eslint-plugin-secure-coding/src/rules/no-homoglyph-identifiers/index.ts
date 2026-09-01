/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-homoglyph-identifiers
 * Detects characters that a code reviewer cannot see, or cannot tell apart
 * from ASCII.
 * CWE-1007: Insufficient Visual Distinction of Homoglyphs Presented to User
 *
 * Two different attacks, two separate detections:
 *
 *   const adminRole = 'admin';
 *   const аdminRole = 'guest';   // Cyrillic 'а' (U+0430) — a *different* binding
 *
 *   const ADMIN_GROUP = 'admin<U+200B>';   // never equal to 'admin'
 *
 * Both survive review because the diff looks correct. The rule's whole job is
 * to print the codepoint, since the character itself cannot be shown.
 *
 * @see https://cwe.mitre.org/data/definitions/1007.html
 * @see https://trojansource.codes/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

/**
 * @vocabulary The confusable and invisible code points are Unicode's, from the
 * UTS #39 security mechanisms data. They are a property of the character set,
 * not of anybody's codebase.
 *
 * @see https://www.unicode.org/reports/tr39/
 */
type MessageIds = 'homoglyphIdentifier' | 'invisibleCharacter';

export interface Options {
  /** Check identifier names for script-mixing homoglyphs. Default: true */
  checkIdentifiers?: boolean;

  /** Check string literals and template chunks for invisible characters. Default: true */
  checkStrings?: boolean;
}

type RuleOptions = [Options?];

/**
 * Non-ASCII codepoints that render as an ASCII Latin letter, mapped to the
 * letter they impersonate.
 *
 * An explicit list, not a script range. "Any Cyrillic character" would have
 * been one line, and it would have reported `имяUser` — a Russian developer
 * writing a mixed identifier — with the same confidence as an attack. The
 * vulnerability is *visual identity with ASCII*, so only characters that have
 * it belong here, and the mapping is what lets the message say which letter is
 * being impersonated instead of just "non-ASCII character found".
 */
const CONFUSABLE_WITH_ASCII: ReadonlyMap<number, string> = new Map([
  // Cyrillic lowercase
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
  // Cyrillic uppercase
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
  // Greek lowercase
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
  // Greek uppercase
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
  // Armenian
  [0x0578, 'n'],
  [0x057d, 'u'],
  [0x0585, 'o'],
  // Cherokee — the block ESLint's own docs cite for identifier confusables
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
  // Latin-script lookalikes outside ASCII
  [0x01c0, 'l'],
  [0x0131, 'i'],
  [0x0261, 'g'],
]);

/**
 * Characters that occupy no visible space, or that reorder what follows.
 *
 * Zero-width and bidi controls only. This is the line that keeps the i18n
 * corpus fixture clean: Hebrew, Cyrillic and Japanese *text* is data a user
 * reads, and there is nothing deceptive about it. What is deceptive is a
 * character the reviewer's editor does not draw at all — U+200B inside
 * `'admin'`, or U+202E reversing the rest of the line (Trojan Source).
 */
// Written as escapes on purpose — a rule that bans invisible characters must
// not contain any. U+00AD soft hyphen, U+180E Mongolian vowel separator,
// U+200B–U+200F zero-width and directional marks, U+202A–U+202E bidi
// overrides, U+2060–U+2064 and U+2066–U+2069 invisible operators and bidi
// isolates, U+FEFF byte-order mark.
const INVISIBLE =
  /[\u00ad\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;

/** `U+0430` — the only way to show a character that has no glyph. */
function toCodepointLabel(codepoint: number): string {
  return `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** The ASCII letter this codepoint impersonates, if it impersonates one. */
function confusableFor(codepoint: number): string | null {
  const mapped = CONFUSABLE_WITH_ASCII.get(codepoint);
  if (mapped !== undefined) return mapped;
  // Fullwidth forms are a mechanical range rather than a list.
  if (codepoint >= 0xff21 && codepoint <= 0xff3a) {
    return String.fromCharCode(codepoint - 0xff21 + 0x41);
  }
  if (codepoint >= 0xff41 && codepoint <= 0xff5a) {
    return String.fromCharCode(codepoint - 0xff41 + 0x61);
  }
  return null;
}

/**
 * The first ASCII-confusable character in a name that also contains ASCII
 * letters.
 *
 * The mixing requirement is the whole rule. A name written entirely in one
 * non-Latin script — `имя`, `названиеПеременной`, `сумма` — is a legitimate
 * non-English identifier: nothing about it is disguised as something else, and
 * flagging it would tell a Russian-speaking team their own language is a
 * vulnerability. The attack needs the two scripts *together*, because the
 * disguise only works when the impostor sits in a name the reader already
 * knows in ASCII.
 */
function homoglyphIn(
  name: string,
): { character: string; codepoint: number; latin: string } | null {
  if (!/[A-Za-z]/.test(name)) return null;

  for (let index = 0; index < name.length; index++) {
    const codepoint = name.charCodeAt(index);
    if (codepoint < 0x80) continue;
    const latin = confusableFor(codepoint);
    if (latin !== null) {
      return { character: name[index], codepoint, latin };
    }
  }
  return null;
}

/** Is this a visible ASCII character — something a reviewer reads as plain text? */
function isVisibleAscii(codepoint: number): boolean {
  return codepoint >= 0x21 && codepoint <= 0x7e;
}

/**
 * The first invisible character that is *hiding* — one sitting next to plain
 * ASCII text.
 *
 * The adjacency test is what separates deception from typography. U+200D is a
 * required part of an emoji family sequence (man + ZWJ + woman + ZWJ + girl)
 * and of correct Persian and Hindi text; U+200C is mandatory in Persian
 * compounds. In those the joiner sits between non-ASCII characters and is
 * doing its job. Inside `admin` it is doing something else — and that is the
 * form the corpus fixture takes, and the form that breaks an equality check
 * nobody can see failing.
 */
function invisibleIn(
  text: string,
): { index: number; codepoint: number } | null {
  for (let index = 0; index < text.length; index++) {
    if (!INVISIBLE.test(text[index])) continue;

    const before = index > 0 ? text.charCodeAt(index - 1) : -1;
    const after = index + 1 < text.length ? text.charCodeAt(index + 1) : -1;
    if (!isVisibleAscii(before) && !isVisibleAscii(after)) continue;

    return { index, codepoint: text.charCodeAt(index) };
  }
  return null;
}

export const noHomoglyphIdentifiers = createRule<RuleOptions, MessageIds>({
  name: 'no-homoglyph-identifiers',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-homoglyph-identifiers.md',
      description:
        'Detects homoglyph identifiers and invisible characters that hide what the code actually does',
      cwe: 'CWE-1007',
      cvss: 5.3,
    },
    messages: {
      homoglyphIdentifier: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Homoglyph Identifier',
        cwe: 'CWE-1007',
        cvss: 5.3,
        description:
          'Identifier "{{name}}" mixes scripts: {{codepoint}} renders as ASCII "{{latin}}" but is a different character',
        severity: 'MEDIUM',
        fix: 'Rewrite the identifier in ASCII, or confirm the binding it resolves to is the one you intended',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1007.html',
      }),
      invisibleCharacter: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Invisible Character',
        cwe: 'CWE-1007',
        cvss: 5.3,
        description:
          'String contains invisible character {{codepoint}} at index {{index}} - the text is not what it appears to be',
        severity: 'MEDIUM',
        fix: 'Remove the character, or write it as an escape (\\u200B) so it is visible in review',
        documentationLink: 'https://trojansource.codes/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkIdentifiers: {
            type: 'boolean',
            default: true,
            description: 'Check identifier names for script-mixing homoglyphs',
          },
          checkStrings: {
            type: 'boolean',
            default: true,
            description:
              'Check string literals and template chunks for invisible characters',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ checkIdentifiers: true, checkStrings: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Raw user options, not the defaults-merged copy: the merge always fills
    // both keys, which would leave one arm of each `??` unreachable.
    const options: Options = context.options[0] ?? {};
    const checkIdentifiers = options.checkIdentifiers ?? true;
    const checkStrings = options.checkStrings ?? true;

    function checkName(
      node: TSESTree.Identifier | TSESTree.PrivateIdentifier,
    ): void {
      if (!checkIdentifiers) return;
      const found = homoglyphIn(node.name);
      if (!found) return;

      context.report({
        node,
        messageId: 'homoglyphIdentifier',
        data: {
          name: node.name,
          codepoint: toCodepointLabel(found.codepoint),
          latin: found.latin,
        },
      });
    }

    function checkText(node: TSESTree.Node, text: string): void {
      const found = invisibleIn(text);
      if (!found) return;

      context.report({
        node,
        messageId: 'invisibleCharacter',
        data: {
          codepoint: toCodepointLabel(found.codepoint),
          index: String(found.index),
        },
      });
    }

    return {
      Identifier: checkName,
      PrivateIdentifier: checkName,

      Literal(node: TSESTree.Literal) {
        if (!checkStrings) return;
        if (typeof node.value !== 'string') return;
        // `raw`, not `value`. A zero-width space written as an escape is
        // visible in the diff and in review — the reviewer can see the
        // codepoint and decide. What this rule exists for is the character
        // that was pasted in as itself and renders as nothing at all. (This
        // reads the node's own raw field; it is not a scan of printed source.)
        checkText(node, node.raw);
      },

      TemplateElement(node: TSESTree.TemplateElement) {
        if (!checkStrings) return;
        checkText(node, node.value.raw);
      },
    };
  },
});
