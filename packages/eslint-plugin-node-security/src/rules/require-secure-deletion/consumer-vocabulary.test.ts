/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `sensitiveProperties` replaces the built-in list; `additionalSensitiveProperties`
 * could only grow it.
 *
 * The rule matches on a property NAME by necessity — the value at a `delete`
 * site is not available to a syntactic rule. That makes the vocabulary a claim
 * about somebody else's naming, and a claim about somebody else's naming has to
 * be theirs to withdraw. A project whose `token` is a lexer token could add to
 * the list forever and never stop the report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { requireSecureDeletion } from './index';

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

describe('require-secure-deletion — the consumer owns the vocabulary', () => {
  ruleTester.run('vocabulary', requireSecureDeletion, {
    valid: [
      {
        name: 'a word the consumer replaced out stops reporting',
        code: 'delete user.password;',
        options: [{ sensitiveProperties: ['seedPhrase'] }],
      },
    ],
    invalid: [
      {
        name: 'a word the consumer replaced in starts reporting',
        code: 'delete wallet.seedPhrase;',
        options: [{ sensitiveProperties: ['seedPhrase'] }],
        errors: 1,
      },
      {
        name: 'the built-in vocabulary still holds when nothing is configured',
        code: 'delete user.password;',
        errors: 1,
      },
    ],
  });
});
