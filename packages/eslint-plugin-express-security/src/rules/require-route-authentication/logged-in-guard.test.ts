/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `isLoggedIn` is an authentication guard.
 *
 * The name carries neither `auth` nor `login` (it is "Logged" + "In"), so the
 * guard vocabulary missed the most common spelling of it and every guarded
 * critical route was reported as unauthenticated. Fixtures are not given an
 * Express import: route registration with `(req, res)` is the gate evidence.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireRouteAuthentication } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'script' },
});

describe('require-route-authentication: logged-in guards', () => {
  ruleTester.run('require-route-authentication', requireRouteAuthentication, {
    valid: [
      {
        name: 'isLoggedIn guards a profile route',
        code: `app.get('/profile', isLoggedIn, (req, res) => res.send('x'));`,
      },
      {
        name: 'ensureLoggedIn() factory guards a payment route',
        code: `app.post('/payment', ensureLoggedIn(), (req, res) => res.send('x'));`,
      },
      {
        name: 'a snake_case guard',
        code: `app.post('/payment', is_logged_in, (req, res) => res.send('x'));`,
      },
    ],
    invalid: [
      {
        name: 'the same route with no guard is still reported',
        code: `app.get('/profile', (req, res) => res.send('x'));`,
        errors: [{ messageId: 'missingAuthentication' }],
      },
      {
        name: 'a middleware that merely logs is not a guard',
        code: `app.get('/profile', logRequest, (req, res) => res.send('x'));`,
        errors: [{ messageId: 'missingAuthentication' }],
      },
    ],
  });
});
