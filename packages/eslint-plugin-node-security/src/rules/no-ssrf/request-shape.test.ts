/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Express never required the parameter be called `req`.
 *
 * This rule matched `['req', 'request', 'ctx', 'event']` on the root
 * identifier, so a codebase writing `(inbound, outbound) => …` got NOTHING
 * from it — no findings, no warning, no way to know. Found by
 * `scripts/name-dependence-probe.mts`, which renames every binding in a true
 * positive and re-runs the rule.
 *
 * The CONTRACT is the shape: `.query`, `.body`, `.params`, `.headers` are
 * published by Express, Koa, Fastify and the Lambda proxy integration. The
 * receiver's name is the consumer's, and always was.
 *
 * `readsRequestShape` requires the receiver to be a FUNCTION PARAMETER, which
 * is what keeps a module-local `config.params` out — a request arrives as an
 * argument. And `body` alone does not qualify: every AST node has one, and
 * treating `node.body` as a request read reported this linter's own source.
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

suite('no-ssrf — the request is a shape, not a name', () => {
  ruleTester.run('request-shape', noSsrf, {
    valid: [
      {
        // NOT a parameter: a request arrives as an argument, and a
        // module-local object with a `.params` is somebody's own data.
        name: 'a module-local object that happens to have params',
        code: "const config = { params: { url: 'https://a.example' } }; fetch(config.params.url);",
      },
      {
        // `body` is the commonest property name in this ecosystem. Every AST
        // node has one, and so does every HTTP response.
        name: 'an AST visitor reading node.body',
        code: 'function visit(node) { return fetch(node.body); }',
      },
      { name: 'a literal url', code: "fetch('https://api.example.com');" },
    ],
    invalid: [
      {
        // @found rename probe
        name: 'FN: a renamed request parameter',
        code: 'function f(inbound) { return fetch(inbound.query.target); }',
        errors: 1,
      },
      {
        // The TypeScript spelling, which is at least as common as `req`.
        // @found rename probe
        name: 'FN: the TypeScript-style request parameter',
        code: 'function f(request) { return fetch(request.body.url); }',
        errors: 1,
      },
      {
        name: 'the req spelling this rule always caught',
        code: 'function f(req) { return fetch(req.query.target); }',
        errors: 1,
      },
    ],
  });
});
