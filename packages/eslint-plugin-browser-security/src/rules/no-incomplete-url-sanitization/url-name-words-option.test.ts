/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The names that say "this value is a URL" are the project's, not ours.
 *
 * The rule carried a fixed English regex — `url|uri|href|host|origin|domain|
 * referrer|endpoint|link` — as ONE of two independent kinds of evidence, the
 * other being taint. A list that only widens recall is exactly the kind that
 * has to be replaceable: a codebase whose URL variable is `endereco` got
 * nothing from it and had no way to ask, while a `linkedList` was caught by
 * `link`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noIncompleteUrlSanitization } from './index';

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

suite(
  'no-incomplete-url-sanitization — the URL vocabulary is the project’s',
  () => {
    ruleTester.run('urlNameWords', noIncompleteUrlSanitization, {
      valid: [
        {
          // REPLACES: once the consumer states their own vocabulary, a name we
          // guessed is no longer one of theirs.
          name: 'a default name the consumer replaced out of the list',
          code: `function f() { const link = cfg(); if (link.includes('example.com')) { g(); } }`,
          options: [{ urlNameWords: ['endereco'] }],
        },
        {
          name: 'a name in neither the default nor the replacement',
          code: `function f() { const zzz = cfg(); if (zzz.includes('example.com')) { g(); } }`,
        },
      ],
      invalid: [
        {
          name: 'the default vocabulary still covers the English names',
          code: `function f() { const link = cfg(); if (link.includes('example.com')) { g(); } }`,
          errors: 1,
        },
        {
          // The point of the option: a project whose URLs are not named in
          // English is now reachable.
          name: 'a URL named in a language the default list is not written in',
          code: `function f() { const endereco = cfg(); if (endereco.includes('example.com')) { g(); } }`,
          options: [{ urlNameWords: ['endereco'] }],
          errors: 1,
        },
      ],
    });
  },
);
