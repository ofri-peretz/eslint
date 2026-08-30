/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The name SELECTS the candidate; the binding DECIDES.
 *
 * `isInboundRequestBinding` already required a handler parameter, so a
 * module-local `const request = Object.freeze({...})` was never a request
 * whatever it was called. But the NAME is what puts a candidate forward, and
 * the list was `req|request|ctx|event|message` — so a handler written
 * `(inbound, outbound)` or `(payload)` never got that far. Express, Koa and
 * Lambda all take the request POSITIONALLY; nothing publishes those words.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noUnsafeRegexConstruction } from './index';

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
  'no-unsafe-regex-construction — the request root names are the project’s',
  () => {
    ruleTester.run('requestRootNames', noUnsafeRegexConstruction, {
      valid: [
        {
          // REPLACES: a name we guessed is no longer one of theirs.
          name: 'a default name the consumer replaced out of the list',
          code: `function h(req) { return new RegExp(req.query.pattern); }`,
          options: [{ requestRootNames: ['inbound'] }],
        },
      ],
      invalid: [
        {
          name: 'the default vocabulary still covers the English names',
          code: `function h(req) { return new RegExp(req.query.pattern); }`,
          errors: 1,
        },
        {
          // The point: a handler whose parameter is named anything at all.
          name: 'a handler parameter named nothing in particular',
          code: `function h(inbound) { return new RegExp(inbound.query.pattern); }`,
          options: [{ requestRootNames: ['inbound'] }],
          errors: 1,
        },
      ],
    });
  },
);
