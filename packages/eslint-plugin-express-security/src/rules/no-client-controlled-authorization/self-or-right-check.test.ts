/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * "Self or holder of the right": `req.params.userId !== user.id`, where `user`
 * is what the verifying callback was handed and the same callback stores it as
 * `req.user`. The id on the right is the server's, so the check does not pass
 * "for anyone who sets the field". Found linting popular Express starters.
 *
 * The evidence is a binding, resolved through scope: a PARAMETER (never
 * reassigned) stored on the same request binding the client value was read
 * from. A local copy of client input, a parameter stored on some other
 * request, or a comparison against another client value still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { noClientControlledAuthorization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const report = { messageId: 'clientControlledAuthorization' as const };

const withExpress = (body: string) =>
  `const express = require('express');\n${body}`;

describe('no-client-controlled-authorization — self or right', () => {
  ruleTester.run('self-or-right-check', noClientControlledAuthorization, {
    valid: [
      {
        // @source hagopj13/node-express-boilerplate src/middlewares/auth.js:15
        // @found linting popular Express and NestJS starters
        name: 'FP: the id is compared to the principal the callback stored on this request',
        code: withExpress(`
          const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
            if (err || info || !user) return reject(new Error('Please authenticate'));
            req.user = user;
            if (requiredRights.length) {
              const hasRequiredRights = requiredRights.every((r) => user.rights.includes(r));
              if (!hasRequiredRights && req.params.userId !== user.id) {
                return reject(new Error('Forbidden'));
              }
            }
            resolve();
          };
        `),
      },
      {
        name: 'the principal is stored after the comparison, in the same callback',
        code: withExpress(`
          const verify = (req) => async (err, user) => {
            if (req.params.userId !== user.id) return;
            req.user = user;
          };
        `),
      },
      {
        name: 'the principal is stored under req.auth',
        code: withExpress(`
          const verify = (req) => async (err, claims) => {
            req.auth = claims;
            if (req.params.userId === claims.sub) return;
          };
        `),
      },
    ],
    invalid: [
      {
        name: 'the same comparison with nothing stored on the request still reports',
        code: withExpress(`
          const verify = (req) => async (err, user) => {
            if (req.params.userId !== user.id) return;
          };
        `),
        errors: [report],
      },
      {
        name: "a local copy of client input stored as req.user is the client's word",
        code: withExpress(`
          const verify = (req) => async () => {
            const user = req.body.user;
            req.user = user;
            if (req.params.userId !== user.id) return;
          };
        `),
        errors: [report],
      },
      {
        name: 'a parameter stored on a different request binding does not vouch for this one',
        code: withExpress(`
          const verify = (req, other) => async (err, user) => {
            other.user = user;
            if (req.params.userId !== user.id) return;
          };
        `),
        errors: [report],
      },
      {
        name: 'a parameter that is rewritten before it is stored is not provably server-side',
        code: withExpress(`
          const verify = (req) => async (err, user) => {
            user = JSON.parse(req.headers['x-user']);
            req.user = user;
            if (req.params.userId !== user.id) return;
          };
        `),
        errors: [report],
      },
      {
        name: 'a stored principal compared with a second client value reports both',
        code: withExpress(`
          const verify = (req) => async (err, user) => {
            req.user = user;
            if (req.params.userId !== req.body.userId) return;
          };
        `),
        errors: [report, report],
      },
      {
        name: 'a stored principal does not exempt a decision that is not a comparison with it',
        code: withExpress(`
          const verify = (req) => async (err, user) => {
            req.user = user;
            if (req.body.role === 'admin') return;
          };
        `),
        errors: [report],
      },
      {
        name: 'a computed slot or a non-identifier value stores nothing',
        code: withExpress(`
          const verify = (req) => async (err, user) => {
            req[slot] = user;
            req.user = wrap(user);
            if (req.params.userId !== user.id) return;
          };
        `),
        errors: [report],
      },
      {
        name: 'a request reached through this has no root binding, so nothing is proven',
        code: withExpress(`
          class Guard {
            check(user) {
              if (this.request.params.userId !== user.id) return;
            }
          }
        `),
        errors: [report],
      },
      {
        name: 'a principal side that is not rooted at a binding proves nothing',
        code: withExpress(`
          const verify = (req) => async (err, user) => {
            req.user = user;
            if (req.params.userId !== getUser().id) return;
          };
        `),
        errors: [report],
      },
    ],
  });
});
