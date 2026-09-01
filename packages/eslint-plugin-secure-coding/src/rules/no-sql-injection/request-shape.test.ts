/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Express never required the parameter be called `req`.
 *
 * This rule required BOTH a root name from `['req','request','ctx','event']`
 * AND a request property. So a codebase writing `(inbound, res) => …`, or the
 * TypeScript `(request: Request, response: Response)` that half this ecosystem
 * writes, got NOTHING — no findings on its SQL, no warning, no way to know.
 *
 * Found by `scripts/name-dependence-probe.mts`, which renames every binding in
 * a true positive and re-runs the rule. This rule lost 21 of them, second only
 * to `no-hardcoded-credentials`.
 *
 * The CONTRACT is the shape. `.query`, `.params`, `.body`, `.headers` are
 * published by Express, Koa, Fastify and the Lambda proxy integration — we can
 * and should be specific about those. The receiver's name is the consumer's.
 *
 * `readsRequestShape` requires the receiver to be a PARAMETER, which is the
 * structural fact the name test was standing in for: a request ARRIVES as an
 * argument. `requestRoots` stays as the escape hatch for a request this file
 * cannot see is a parameter, such as a `ctx` closed over by Koa middleware.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noSqlInjection } from './index';

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

suite('no-sql-injection — the request is a shape, not a name', () => {
  ruleTester.run('request-shape', noSqlInjection, {
    valid: [
      {
        // NOT a parameter. A request arrives as an argument; a module-local
        // object with a `.params` is somebody's own data structure.
        name: 'a module-local object that happens to have params',
        code: "const config = { params: { id: 1 } }; db.query('SELECT * FROM t WHERE id = ' + config.params.id);",
      },
      { name: 'a fully literal query', code: "db.query('SELECT * FROM t');" },
      {
        // The shape path defers to the consumer. Saying "only `ctx` is a
        // request here" is a decision, and a structural fallback that
        // reinstated `req` behind their back would make the option a lie.
        // This rule's own option-overrides suite caught exactly that.
        name: 'a narrowed requestRoots turns the shape path off',
        code: "function f(inbound, db) { return db.query('SELECT * FROM t WHERE id = ' + inbound.query.id); }",
        options: [{ requestRoots: ['ctx'] }],
      },
      {
        name: 'a parameterised query, which is the documented fix',
        code: "function f(req, db) { return db.query('SELECT * FROM t WHERE id = $1', [req.query.id]); }",
      },
    ],
    invalid: [
      {
        // @found rename probe
        name: 'FN: a renamed request parameter',
        code: "function f(inbound, db) { return db.query('SELECT * FROM t WHERE id = ' + inbound.query.id); }",
        errors: 1,
      },
      {
        // @found rename probe
        name: 'FN: the TypeScript-style request parameter',
        code: "function f(request, db) { return db.query('SELECT * FROM t WHERE id = ' + request.params.id); }",
        errors: 1,
      },
      {
        name: 'the req spelling this rule always caught',
        code: "function f(req, db) { return db.query('SELECT * FROM t WHERE id = ' + req.query.id); }",
        errors: 1,
      },
    ],
  });
});
