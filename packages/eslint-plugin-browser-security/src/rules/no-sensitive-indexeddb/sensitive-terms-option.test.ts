/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `additionalPatterns` could only GROW the list, which is the wrong shape for a
 * guess: a project could add forever and still never stop the report on a word
 * we picked wrongly. If your `token` is a lexer token, only replacement helps.
 *
 * What is NOT replaceable, deliberately: the bearer-credential half matches the
 * HTTP Authorization scheme and the JWT shape — RFC 6750 and RFC 7519, published
 * formats rather than guesses — so it reports whatever the vocabulary says.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noSensitiveIndexeddb } from './index';

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

/** The store-name sink: `createObjectStore('<name>')`. */
const store = (name: string) => `db.createObjectStore('${name}');`;

suite(
  'no-sensitive-indexeddb — the sensitive vocabulary is replaceable',
  () => {
    ruleTester.run('sensitiveTerms', noSensitiveIndexeddb, {
      valid: [
        {
          // The whole point: `additionalPatterns` could never do this.
          name: 'a default term the consumer replaced out of the list',
          code: store('passwords'),
          options: [{ sensitiveTerms: ['contrasena'] }],
        },
      ],
      invalid: [
        {
          name: 'the default vocabulary still reports',
          code: store('passwords'),
          errors: 1,
        },
        {
          name: 'a term the default list is not written in',
          code: store('contrasenas'),
          options: [{ sensitiveTerms: ['contrasena'] }],
          errors: 1,
        },
        {
          // The published-format half is not silenced by an empty vocabulary.
          name: 'a bearer credential reports with the vocabulary emptied',
          code: store('accessTokens'),
          options: [{ sensitiveTerms: [] }],
          errors: 1,
        },
      ],
    });
  },
);
