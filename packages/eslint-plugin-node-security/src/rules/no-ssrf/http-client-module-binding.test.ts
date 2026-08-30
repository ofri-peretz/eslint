/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An HTTP client is identified by the MODULE it comes from, not by what the
 * importer happened to call it.
 *
 * The rule matched a set of local binding names — `axios`, `got`, `http`,
 * `request`, … — which is the consumer's choice, not the package's. That was
 * wrong in both directions at once, and both are sealed here.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noSsrf } from './index';

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

suite('no-ssrf — the client is the module, not the variable name', () => {
  ruleTester.run('module binding', noSsrf, {
    valid: [
      {
        // FP: a local object that happens to be called `request`. Nothing here
        // makes an outbound call, and the old name set reported it.
        name: 'FP: a local variable named after an HTTP client package',
        code: `async function f(req) { const request = { get: (u) => u }; await request.get(req.query.u); }`,
      },
    ],
    invalid: [
      {
        name: 'the ordinary spelling still reports',
        code: `import axios from 'axios';\nasync function f(req) { await axios.get(req.query.u); }`,
        errors: 1,
      },
      {
        // FN: an aliased import. `import axiosClient from 'axios'` is ordinary
        // and matched none of the name set, so the rule was silent on it.
        name: 'FN: an HTTP client imported under a different name',
        code: `import axiosClient from 'axios';\nasync function f(req) { await axiosClient.get(req.query.u); }`,
        errors: 1,
      },
    ],
  });
});
