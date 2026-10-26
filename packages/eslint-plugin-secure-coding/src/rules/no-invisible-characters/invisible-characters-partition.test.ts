/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * PARTITION MATRIX — invisible-character shapes × the three source-text rules.
 *
 * `no-invisible-characters`, `no-bidi-characters` and `no-homoglyph-identifiers`
 * all carry CWE-1007, and the first two both visit `Program`, so the rule audit
 * flags them as possible duplicate coverage. They are partitioned by CHARACTER:
 *
 *   no-invisible-characters   blank-glyph letters (Hangul fillers, Khmer
 *                             inherent vowels) — in code and comments
 *   no-bidi-characters        bidi controls — anywhere
 *   no-homoglyph-identifiers  zero-width format characters in strings, and
 *                             ASCII-lookalike letters in identifiers
 *
 * Every shape below is linted with all three rules on. A shape owned by
 * `no-invisible-characters` must produce exactly one report, from it. A shape
 * owned by a sibling must be reported by that sibling and never by
 * `no-invisible-characters`. Whether bidi and homoglyph co-report a bidi
 * control inside a string is their question, not this rule's, and is
 * deliberately not asserted here.
 */
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { noBidiCharacters } from '../no-bidi-characters/index';
import { noHomoglyphIdentifiers } from '../no-homoglyph-identifiers/index';
import { noInvisibleCharacters } from './index';

const RULES = {
  'no-invisible-characters': noInvisibleCharacters,
  'no-bidi-characters': noBidiCharacters,
  'no-homoglyph-identifiers': noHomoglyphIdentifiers,
} as const;

type RuleName = keyof typeof RULES;

const linter = new Linter({ configType: 'flat' });

function reportingRules(code: string): string[] {
  const messages = linter.verify(
    code,
    {
      languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
      plugins: { sc: { rules: RULES as any } },
      rules: Object.fromEntries(
        Object.keys(RULES).map((r) => [`sc/${r}`, 'error' as const]),
      ),
    },
    'app.js',
  );
  // A crash or parse error surfaces as a message with no ruleId. Never score
  // it as "quiet".
  const crashed = messages.filter((m) => !m.ruleId);
  if (crashed.length > 0) throw new Error(crashed[0].message);
  return messages.map((m) => (m.ruleId ?? '').replace('sc/', ''));
}

// Payloads are escapes, so this file contains no invisible character itself.
/** [shape, the rule that owns it] */
const MATRIX: ReadonlyArray<readonly [string, string, RuleName]> = [
  ['U+3164 in a string', 'const s = "a\u3164b";', 'no-invisible-characters'],
  ['U+FFA0 in a string', 'const s = "a\uFFA0b";', 'no-invisible-characters'],
  ['U+17B4 in a string', 'const s = "a\u17B4b";', 'no-invisible-characters'],
  [
    'U+3164 inside an identifier',
    'var adm\u3164in = 1;',
    'no-invisible-characters',
  ],
  [
    'U+3164 as a whole identifier',
    'const { timeout, \u3164 } = req.query;',
    'no-invisible-characters',
  ],
  ['U+3164 in a comment', '// hidden\u3164text', 'no-invisible-characters'],
  ['U+202E in a string', 'const s = "\u202Eadmin";', 'no-bidi-characters'],
  ['U+2066 in a comment', '// note \u2066x', 'no-bidi-characters'],
  [
    'U+200B beside ASCII in a string',
    'const group = "admin\u200B";',
    'no-homoglyph-identifiers',
  ],
  [
    'a Cyrillic lookalike in an ASCII identifier',
    'const \u0430dminRole = 1;',
    'no-homoglyph-identifiers',
  ],
];

describe('invisible-character partition: no-invisible-characters × no-bidi-characters × no-homoglyph-identifiers', () => {
  for (const [label, code, owner] of MATRIX) {
    it(`${label} → ${owner}`, () => {
      const reporters = reportingRules(code);
      if (owner === 'no-invisible-characters') {
        expect(reporters).toEqual(['no-invisible-characters']);
      } else {
        expect(reporters).toContain(owner);
        expect(reporters).not.toContain('no-invisible-characters');
      }
    });
  }
});
