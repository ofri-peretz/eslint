/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-bidi-characters
 * Detects Unicode bidirectional control characters (CWE-1007, "Trojan Source").
 *
 * Bidi controls reorder how text is DISPLAYED without changing how it is COMPILED. An
 * attacker can therefore write source that a reviewer reads as one program while the
 * compiler reads another — the canonical form hides an early `return` inside what looks
 * like a comment:
 *
 *   if (accessLevel != "user\u2066 // Check if admin\u2069 \u2066") {
 *
 * Because the payload lives in the raw bytes, this scans source text rather than the AST:
 * the characters survive in string literals, comments, and identifiers alike, and an
 * AST-only rule would miss the comment case entirely — which is the one the original
 * Trojan Source paper demonstrated.
 *
 * @see https://trojansource.codes/
 * @see https://cwe.mitre.org/data/definitions/1007.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'bidiCharacter' | 'removeBidiCharacter';

export interface Options {
  /**
   * Additional code points to treat as dangerous, as `U+XXXX` strings.
   * Use for confusables your threat model cares about beyond the bidi set.
   */
  additionalCharacters?: string[];

  /**
   * Allow the invisible marks U+200E/U+200F, which have legitimate uses in
   * genuinely bidirectional natural-language strings. Default: false.
   */
  allowDirectionalMarks?: boolean;
}

type RuleOptions = [Options?];

/**
 * The bidi control characters. The `*_ISOLATE`/`*_EMBEDDING`/`*_OVERRIDE` families are what
 * make Trojan Source work; the two marks are weaker but still able to reorder rendering.
 */
const BIDI_CHARACTERS = new Map<string, string>([
  ['\u202A', 'U+202A LEFT-TO-RIGHT EMBEDDING'],
  ['\u202B', 'U+202B RIGHT-TO-LEFT EMBEDDING'],
  ['\u202C', 'U+202C POP DIRECTIONAL FORMATTING'],
  ['\u202D', 'U+202D LEFT-TO-RIGHT OVERRIDE'],
  ['\u202E', 'U+202E RIGHT-TO-LEFT OVERRIDE'],
  ['\u2066', 'U+2066 LEFT-TO-RIGHT ISOLATE'],
  ['\u2067', 'U+2067 RIGHT-TO-LEFT ISOLATE'],
  ['\u2068', 'U+2068 FIRST STRONG ISOLATE'],
  ['\u2069', 'U+2069 POP DIRECTIONAL ISOLATE'],
]);

/** Weaker marks — real bidirectional text uses these, so they are separately gated. */
const DIRECTIONAL_MARKS = new Map<string, string>([
  ['\u200E', 'U+200E LEFT-TO-RIGHT MARK'],
  ['\u200F', 'U+200F RIGHT-TO-LEFT MARK'],
]);

/** `U+202E` -> the character itself. Returns undefined for anything unparseable. */
const codePointFromLabel = (label: string): string | undefined => {
  const match = /^U\+([0-9a-fA-F]{4,6})$/.exec(label.trim());
  if (!match) return undefined;
  const codePoint = Number.parseInt(match[1], 16);
  // 6 hex digits reach U+FFFFFF, far past the U+10FFFF Unicode ceiling, and
  // `String.fromCodePoint` throws a RangeError above it. `U+110000` in a user's
  // `additionalCharacters` therefore crashed the rule — and with it the lint run
  // — for every file. The pattern is not a range check; this is.
  if (codePoint > 0x10ffff) return undefined;
  return String.fromCodePoint(codePoint);
};

export const noBidiCharacters = createRule<RuleOptions, MessageIds>({
  name: 'no-bidi-characters',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-bidi-characters',
      description:
        'Disallows Unicode bidirectional control characters, which let source render differently than it compiles (Trojan Source, CWE-1007)',
      cwe: 'CWE-1007',
      cvss: 5.3,
    },
    hasSuggestions: true,
    messages: {
      bidiCharacter: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Bidirectional control character — Trojan Source (CWE-1007)',
        cwe: 'CWE-1007',
        description:
          '{{characterName}} found in source. Bidi controls change how code is DISPLAYED without changing how it is COMPILED, so a reviewer can approve one program while the compiler builds another.',
        severity: 'HIGH',
        fix: 'Remove the character. If the string genuinely needs bidirectional text, use the escape sequence (\\u202E) so it is visible in review.',
        documentationLink: 'https://trojansource.codes/',
      }),
      removeBidiCharacter: 'Remove {{characterName}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalCharacters: { type: 'array', items: { type: 'string' } },
          allowDirectionalMarks: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context, [options = {}]) {
    const { additionalCharacters = [], allowDirectionalMarks = false } = options;

    const dangerous = new Map(BIDI_CHARACTERS);
    if (!allowDirectionalMarks) {
      for (const [char, name] of DIRECTIONAL_MARKS) dangerous.set(char, name);
    }
    for (const label of additionalCharacters) {
      const char = codePointFromLabel(label);
      if (char) dangerous.set(char, label.trim());
    }

    return {
      Program(node: TSESTree.Program) {
        const { sourceCode } = context;
        const text = sourceCode.getText();

        // Walk by CODE POINT, not by code unit. `text[index]` yields one UTF-16 unit,
        // so a configured supplementary character (`additionalCharacters: ['U+1D173']`)
        // could never match its own key — the lookup only ever saw the high surrogate.
        // BMP characters, which is every built-in bidi control, keep width 1 and the
        // exact ranges they had before.
        for (let index = 0; index < text.length; ) {
          const codePoint = text.codePointAt(index) as number;
          const width = codePoint > 0xffff ? 2 : 1;
          const characterName = dangerous.get(text.slice(index, index + width));
          if (!characterName) {
            index += width;
            continue;
          }

          // Report the single character so the location points at the payload itself,
          // not at the whole file.
          const range: TSESTree.Range = [index, index + width];
          context.report({
            node,
            loc: {
              start: sourceCode.getLocFromIndex(index),
              end: sourceCode.getLocFromIndex(index + width),
            },
            messageId: 'bidiCharacter',
            data: { characterName },
            suggest: [
              {
                messageId: 'removeBidiCharacter',
                data: { characterName },
                fix: (fixer: TSESLint.RuleFixer) => fixer.removeRange(range),
              },
            ],
          });
          index += width;
        }
      },
    };
  },
});
