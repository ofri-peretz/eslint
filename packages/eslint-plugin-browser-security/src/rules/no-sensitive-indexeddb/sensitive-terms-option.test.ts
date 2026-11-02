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
 * The bearer-credential words are part of the DEFAULT vocabulary, and nothing
 * more: `sensitiveTerms` replaces the whole list, bearer words included, exactly
 * as the option's documentation says. A replaced vocabulary that kept matching
 * `accessToken` was the divergence the fidelity model found.
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
        {
          name: 'a replaced vocabulary replaces the bearer words too: accessToken store with sensitiveTerms [pin]',
          code: store('accessToken'),
          options: [{ sensitiveTerms: ['pin'] }],
        },
        {
          name: 'a replaced vocabulary replaces the bearer words too: accessToken field with sensitiveTerms [pin]',
          code: `const store = tx.objectStore('v'); store.add({ accessToken: value });`,
          options: [{ sensitiveTerms: ['pin'] }],
        },
        {
          name: 'an emptied vocabulary reports no bearer credential',
          code: store('accessTokens'),
          options: [{ sensitiveTerms: [] }],
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
          name: 'a bearer credential reports under the default vocabulary',
          code: store('accessTokens'),
          errors: 1,
        },
        {
          name: 'additionalPatterns still applies on top of a replaced vocabulary',
          code: `const store = tx.objectStore('v'); store.put(value, 'entitlementGrant');`,
          options: [
            {
              sensitiveTerms: ['pin'],
              additionalPatterns: ['entitlementGrant'],
            },
          ],
          errors: 1,
        },
      ],
    });
  },
);
