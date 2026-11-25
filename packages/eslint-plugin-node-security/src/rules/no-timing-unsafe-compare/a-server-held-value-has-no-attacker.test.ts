/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Found linting open-source Node apps: a value the server holds, compared with
 * another value the server holds, was reported because the request had been
 * used to look both up. The CSRF middleware memoised `req.session.csrfSecret`
 * and compared it with itself; a session endpoint compared the id of each row
 * of `req.user.sessions` with the id of the current session. No attacker-typed
 * byte reaches either side, so there is nothing to time.
 *
 * Every exemption below has an invalid lookalike in which one side is the
 * caller's: the same shape with the exemption's evidence missing.
 */
const ELEMENT_METHODS = ['find', 'filter', 'some', 'every', 'findIndex'];

ruleTester.run(
  'a value the server holds against another has no attacker on either side',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'a session secret against the memo of itself (csurf-style middleware)',
        code: `
          function csrf(req, res, next) {
            let secret = req.session.csrfSecret;
            let token;
            req.csrfToken = function () {
              let current = req.session && req.session.csrfSecret;
              if (token && current === secret) {
                return token;
              }
              return null;
            };
          }
        `,
      },
      {
        name: 'a conditional of two session slots against a session slot',
        code: `
          function check(req, flag) {
            const stored = flag ? req.session.csrfToken : req.user.csrfToken;
            return stored === req.session.csrfToken;
          }
        `,
      },
      {
        name: 'a value assigned through a session slot is still the server value',
        code: `
          function check(req) {
            const saved = req.session.token = req.user.token;
            return saved === req.session.token;
          }
        `,
      },
      {
        name: 'a Koa state slot and a response local are server state',
        code: `
          function check(ctx, res) {
            return ctx.state.csrfToken === res.locals.csrfToken;
          }
        `,
      },
      {
        name: 'a slot below another slot (req.app.locals) is server state',
        code: `
          function check(req) {
            return req.app.locals.csrfToken === req.session.csrfToken;
          }
        `,
      },
      {
        name: 'a row of the stored sessions against the current session id',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            const rows = await db.select(columns).from(sessions).where(eq(sessions.userId, req.user.id));
            return rows.every((row) => row.id !== currentSession.sessionId);
          }
        `,
      },
      // One row per entry of ELEMENT_CALLBACK_METHODS: dropping an entry from
      // the table must fail exactly one of these.
      ...ELEMENT_METHODS.map((method) => ({
        name: `a row from req.user.sessions.${method}(…) against the current session id`,
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            return req.user.sessions.${method}((session) => session.id === currentSession.sessionId);
          }
        `,
      })),
    ],
    invalid: [
      {
        name: 'the request body against the current session id still reports',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            if (req.body.sessionId === currentSession.sessionId) throw new Error('x');
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a field named like a slot, but below the request body, is the caller’s',
        code: `
          function check(req) {
            return req.body.user.token === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a query field named state is not the framework state slot',
        code: `
          function check(req) {
            return req.query.state === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a slot below the body (req.body.locals) is not a slot',
        code: `
          function check(req) {
            return req.body.locals.token === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a logical expression with one caller-supplied branch is not server state',
        code: `
          function check(req) {
            const supplied = req.session && req.body.token;
            return supplied === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a conditional with one caller-supplied branch is not server state',
        code: `
          function check(req, flag) {
            const supplied = flag ? req.session.token : req.body.token;
            return supplied === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'the awaited body of the request is the attacker’s, not a store read',
        code: `
          async function check(req) {
            const stored = await getStored(req.params.id);
            return (await req.json()).token === stored.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'awaiting a bare promise proves nothing about where it came from',
        code: `
          async function check(req, pending) {
            return (await pending).token === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a row of the request body, not of server state',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            return req.body.items.find((item) => item.token === currentSession.sessionId);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'the index parameter of a callback is not the element',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            return req.user.sessions.find((row, session) => session.id === currentSession.sessionId);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a callback declared elsewhere is not resolved to the receiver',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            function matches(session) {
              return session.id === currentSession.sessionId;
            }
            return req.user.sessions.find(matches);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a callback kept in a variable is not resolved to the receiver',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            const matches = (session) => session.id === currentSession.sessionId;
            return req.user.sessions.find(matches);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a callback in the second slot of the call is not the iterator',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            return req.user.sessions.find(noop, (session) => session.id === currentSession.sessionId);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a bare function call is not an array method on server state',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            return find((session) => session.id === currentSession.sessionId);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'map is not an element callback over a filter of the receiver',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            return req.user.sessions.map((session) => session.id === currentSession.sessionId);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a slot reached through a computed owner is not a slot',
        code: `
          function check(req, key) {
            return req[key].locals.token === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'two bindings that initialise each other resolve to nothing',
        code: `
          function check(req) {
            let a = b;
            let b = a;
            return a === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'an imported binding is not an element of server state',
        code: `
          import { row } from './rows';
          function check(req) {
            return row.token === req.session.token;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a destructured parameter is not the plain element',
        code: `
          async function handler(req, res) {
            const currentSession = await getSession(req, res);
            return req.user.sessions.find(({ id: session }) => session === currentSession.sessionId);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);
