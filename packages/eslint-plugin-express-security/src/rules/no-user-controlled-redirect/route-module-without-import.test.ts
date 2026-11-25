/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An open redirect in a route module that never imports Express.
 *
 * `module.exports = (app, db) => { app.get('/learn', isLoggedIn, (req, res) =>
 * res.redirect(req.query.url)) }` receives `app` from its caller, so the file
 * has no `express` import, and its handler is the two-argument `(req, res)`
 * form the middleware-signature arm of the gate refuses. The rule abstained
 * on it. Fixtures are not given an Express import: the gate is under test.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUserControlledRedirect } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'script' },
});

describe('no-user-controlled-redirect: route module with no express import', () => {
  ruleTester.run('no-user-controlled-redirect', noUserControlledRedirect, {
    valid: [
      {
        name: 'the same shape, redirect target is a constant',
        code: `module.exports = (app) => {
          app.get('/learn', isLoggedIn, (req, res) => res.redirect('/home'));
        };`,
      },
      {
        name: 'a non-Express server: handler is (request, reply), no gate evidence',
        code: `fastify.get('/learn', (request, reply) => reply.redirect(request.query.url));`,
      },
      {
        name: 'a bare node:http handler with no route registration',
        code: `http.createServer((req, res) => res.redirect(req.query.url));`,
      },
      {
        name: 'origin allowlist guard still silences it',
        code: `module.exports = (app) => {
          app.get('/learn', (req, res) => {
            if (new URL(req.query.url).host !== 'example.com') return res.sendStatus(400);
            return res.redirect(req.query.url);
          });
        };`,
      },
    ],
    invalid: [
      {
        name: 'redirect to req.query.url in an inline handler registered on app',
        code: `module.exports = (app, db) => {
          app.get('/learn', isLoggedIn, (req, res) => {
            return res.redirect(req.query.url);
          });
        };`,
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        name: 'function-expression handler on a router with a body parameter',
        code: `router.post('/go', function (request, response) {
          response.redirect(request.body.next);
        });`,
        errors: [{ messageId: 'openRedirect' }],
      },
    ],
  });
});
