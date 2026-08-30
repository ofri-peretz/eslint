/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The rule reports two independent things, and only one of them is ours to
 * guess.
 *
 * A JWT (`eyJ…`) and a `Bearer ` prefix are published FORMATS — RFC 7519 and
 * RFC 6750 — so they report on value alone, whatever the binding is called and
 * whatever the consumer configures. The NAME test is the other half, and it
 * was `session` and `token` hardcoded in English: a project whose session id
 * is `sesion` or `sitzung` got nothing and had no way to ask.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noHardcodedSessionTokens } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = suite;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const OPAQUE = "'a1b2c3d4e5f6g7h8i9j0'";

suite(
  'no-hardcoded-session-tokens — the name vocabulary is the project’s',
  () => {
    ruleTester.run('sessionWords', noHardcodedSessionTokens, {
      valid: [
        {
          // REPLACES: once the consumer states their own vocabulary, a name we
          // guessed is no longer one of theirs.
          name: 'a default name the consumer replaced out of the list',
          code: `const sessionId = ${OPAQUE};`,
          options: [{ sessionWords: ['sesion'] }],
        },
        {
          name: 'a name in neither the default nor the replacement',
          code: `const nickname = ${OPAQUE};`,
        },
      ],
      invalid: [
        {
          name: 'the default vocabulary still covers the English names',
          code: `const sessionId = ${OPAQUE};`,
          errors: 1,
        },
        {
          // The point of the option: a project whose session id is not named in
          // English is now reachable.
          name: 'a session id named in a language the default list is not written in',
          code: `const sesionId = ${OPAQUE};`,
          options: [{ sessionWords: ['sesion'] }],
          errors: 1,
        },
        {
          // The FORMAT half is not configurable and must not be silenced by an
          // empty vocabulary — a Bearer token is one whatever you call it.
          name: 'a Bearer token reports on its value with the vocabulary emptied',
          code: `const anything = 'Bearer aaaaaaaaaaaaaaaaaaaaaaaa';`,
          options: [{ sessionWords: [] }],
          errors: 1,
        },
      ],
    });
  },
);
