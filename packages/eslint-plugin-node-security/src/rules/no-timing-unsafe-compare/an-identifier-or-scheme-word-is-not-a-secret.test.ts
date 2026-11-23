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
 * Found linting popular Express middleware: a session id compared with another
 * copy of the same client-held session id, and an auth-scheme word compared
 * with the configured scheme, were reported as secret comparisons. Neither
 * decides whether a secret is valid: the id comparison picks whether to re-set
 * a cookie, the scheme word is the public "Bearer" prefix.
 */
ruleTester.run(
  'an identifier or scheme word is not a secret',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'cookie id against the request session id decides a cookie, not a secret',
        code: `
        function sessionMiddleware(req, res, next) {
        var cookieId = req.sessionID = getcookie(req, name, secrets);
        function shouldSave(req) {
          return !saveUninitializedSession && !savedHash && cookieId !== req.sessionID
            ? isModified(req.session)
            : !isSaved(req.session);
        }
        function shouldTouch(req) {
          return cookieId === req.sessionID && !shouldSave(req);
        }
        function shouldSetCookie(req) {
          return cookieId !== req.sessionID ? saveUninitializedSession : rollingSessions;
        }
        }
      `,
      },
      {
        name: 'a chained assignment whose request read sits on the right',
        code: `
          function mw(req) {
            var cookieId = state.id = getcookie(req, name);
            return cookieId !== req.sessionID;
          }
        `,
      },
      {
        name: 'the header scheme word against the configured scheme is public',
        code: `
        extractors.fromAuthHeaderWithScheme = function (auth_scheme) {
          var auth_scheme_lower = auth_scheme.toLowerCase();
          return function (request) {
            var token = null;
            var auth_params = auth_hdr.parse(request.headers[AUTH_HEADER]);
            if (auth_params && auth_scheme_lower === auth_params.scheme.toLowerCase()) {
              token = auth_params.value;
            }
            return token;
          };
        };
      `,
      },
    ],
    invalid: [
      {
        name: 'a real token compared with ===',
        code: "function check(req) { return req.headers['x-token'] === storedToken; }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'an HMAC digest compared with ===',
        code: "function verify(req) { const hmac = crypto.createHmac('sha256', k).update(req.rawBody).digest('hex'); return hmac === req.headers['x-signature']; }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a request session id against the stored one is still a secret comparison',
        code: 'async function check(req) { const stored = await store.get(req.params.user); return req.body.sessionId === stored.sessionId; }',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'an auth token is still reported when the scheme word sits next to it',
        code: "function check(req) { const authScheme = 'bearer'; return req.headers.authorization === authToken; }",
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);
