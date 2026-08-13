/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from 'vitest';
import { noBidiCharacters } from './index';

const ruleTester = new RuleTester();

// Built from escapes so the payload is visible in review — writing the raw characters into
// a test file would make the test itself unreviewable, which is the whole point of CWE-1007.
const RLO = '‮';
const LRI = '⁦';
const PDI = '⁩';
const RLM = '‏';

describe('no-bidi-characters', () => {
  ruleTester.run('no-bidi-characters', noBidiCharacters, {
    valid: [
      { code: `const greeting = 'hello';` },
      // Escape sequences are the safe way to express bidi text: visible in review.
      { code: `const rtl = '\\u202E';` },
      { code: `// a normal comment about right-to-left text` },
      { code: `const arabic = 'مرحبا';` },
      // Directional marks may be permitted for genuine bidirectional strings.
      { code: `const s = '${RLM}';`, options: [{ allowDirectionalMarks: true }] },
      // An unparseable additionalCharacters entry is ignored rather than throwing.
      { code: `const s = 'ok';`, options: [{ additionalCharacters: ['not-a-codepoint', 'U+ZZZZ', ''] }] },
      // A well-formed entry that is simply absent from the source stays quiet.
      { code: `const s = 'ok';`, options: [{ additionalCharacters: ['U+200B'] }] },
    ],
    invalid: [
      // The Trojan Source comment-hiding shape from the original paper.
      {
        code: `if (accessLevel != 'user${LRI} // Check if admin${PDI} ${LRI}') {\n  grantAdmin();\n}`,
        // Three controls: the two isolates that fence the fake comment, plus the reopen.
        errors: 3,
      },
      // A right-to-left override inside a string literal.
      { code: `const label = '${RLO}admin';`, errors: 1 },
      // ...and inside a comment, which an AST-only rule would never see.
      { code: `// begin admins only ${RLO}\nconst x = 1;`, errors: 1 },
      // Directional marks are dangerous by default.
      { code: `const s = '${RLM}';`, errors: 1 },
      // Opt-in additional confusables.
      {
        code: `const s = '​';`,
        options: [{ additionalCharacters: ['U+200B'] }],
        errors: 1,
      },
      // The suggestion removes exactly the offending character and nothing else.
      {
        code: `const label = '${RLO}admin';`,
        errors: [
          {
            messageId: 'bidiCharacter',
            suggestions: [{ messageId: 'removeBidiCharacter', output: `const label = 'admin';` }],
          },
        ],
      },
    ],
  });
});
