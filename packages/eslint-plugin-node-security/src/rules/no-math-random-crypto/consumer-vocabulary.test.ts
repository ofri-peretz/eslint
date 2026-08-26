/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The word list belongs to whoever runs the rule.
 *
 * This rule decides by NAME — its own header says so — and the space of names a
 * project might use for a secret is endless. A fixed vocabulary means guessing
 * at somebody else's conventions and being wrong in both directions at once: a
 * codebase that calls its CSRF value `nonce` is missed, and one whose
 * `keyHandler` is a keyboard handler is flagged.
 *
 * The defaults are what the corpus measured and stay the defaults. What these
 * cases pin is that they can be replaced, because a rule that guesses at
 * identifier names without an escape hatch has no answer for the project it
 * guessed wrong about.
 *
 * The exception, and the reason this is about NAMES rather than about matching
 * at all: an SDK-specific plugin matching its own library's API — Anthropic's
 * `dangerouslyAllowBrowser`, Gemini's `safetySettings` — is reading a fixed
 * vocabulary defined by the library, not a name the consumer chose.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-math-random-crypto — the consumer owns the vocabulary', () => {
  ruleTester.run('vocabulary', noMathRandomCrypto, {
    valid: [
      {
        name: 'a word the consumer removed stops reporting',
        code: 'const token = Math.random().toString(36);',
        options: [{ secretWords: ['nonce'] }],
      },
      {
        name: 'with the defaults, a keyboard handler is not a key',
        code: 'const keyboardDelay = Math.random() * 100;',
      },
    ],
    invalid: [
      {
        name: 'a word the consumer added starts reporting',
        code: 'const nonce = Math.random().toString(36);',
        options: [{ secretWords: ['nonce'] }],
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'the defaults still hold when nothing is configured',
        code: 'const token = Math.random().toString(36);',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a correlation word the consumer replaced no longer exempts',
        code: 'function generateTraceId() { return Math.random().toString(36); }',
        options: [{ secretWords: ['trace'], correlationIdWords: ['span'] }],
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
    ],
  });
});
