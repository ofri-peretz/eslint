/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An empty catch that leaves the caller DENIED is not fail-open.
 *
 * Hand-verification run 2026-08-24 against nightscout/cgm-remote-monitor
 * `lib/authorization/index.js:192`:
 *
 *   let token = null;
 *   try {
 *     token = env.enclave.verifyJWT(data.token).accessToken;
 *   } catch (err) {}
 *   if (!token && data.api_secret) { … }
 *   if (token) { requestSucceeded(data.ip); …; return results; }
 *   console.error('Resolving secret/token to permissions failed');
 *   addFailedRequest(data.ip);
 *
 * `token` stays null and the gate below it returns without granting, so an
 * unverified token lands on the deny path. The empty catch is a real smell —
 * it swallows programming errors too — but the authentication DECISION is
 * closed, and that is what this rule is about.
 *
 * The line this must not cross is
 * `benchmarks/corpus/CWE-636/vulnerable/empty-catch-continues.js`, which has
 * the same `let actor = null; try {…} catch {}` opening and then runs
 * `await purgeTable(req.body.table)` with nothing branching on `actor`. That
 * one IS fail-open, and it stays reported — the difference is a guard that
 * reads the variable and leaves.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noFailOpenAuth } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-fail-open-auth — a swallow that fails closed', noFailOpenAuth, {
  valid: [
    // The corpus shape.
    `async function resolve(data) {
       let token = null;
       try {
         token = verifyJWT(data.token).accessToken;
       } catch (err) {}
       if (token) {
         return grant(token);
       }
       recordFailure(data.ip);
       return deny();
     }`,
    // An unrelated exiting guard sits between the try and the real one, so
    // the scan has to keep looking rather than stop at the first `if`.
    `async function resolve(req, data) {
       let token = null;
       try { token = verifyJWT(data.token).accessToken; } catch (err) {}
       if (req.method === 'OPTIONS') { return preflight(); }
       if (token) { return grant(token); }
       return deny();
     }`,
    // `false` and `undefined` are deny states too.
    `async function check(req) {
       let allowed = false;
       try { allowed = await authenticate(req); } catch (e) {}
       if (!allowed) { return reject(); }
       return proceed();
     }`,
  ],
  invalid: [
    // Nothing branches on the variable before the privileged work — the
    // corpus case, restated so this file carries both sides.
    {
      code: `async function handleAdminAction(req, res) {
         let actor = null;
         try { actor = await assertAdmin(req.headers.authorization); } catch (err) {}
         await purgeTable(req.body.table);
         res.json({ ok: true, actor: actor && actor.id });
       }`,
      errors: [{ messageId: 'failOpenSwallow' as const }],
    },
    // A guard that reads the variable but does NOT leave — execution falls
    // through to the privileged work either way.
    {
      code: `async function handler(req, res) {
         let user = null;
         try { user = await authenticate(req); } catch (e) {}
         if (user) { log('authenticated'); }
         await deleteEverything();
       }`,
      errors: [{ messageId: 'failOpenSwallow' as const }],
    },
    // A member-expression target has no binding to carry a deny state.
    {
      code: `async function handler(req, res) {
         const state = { user: null };
         try { state.user = await authenticate(req); } catch (e) {}
         if (state.user) { return ok(res); }
         await purge();
       }`,
      errors: [{ messageId: 'failOpenSwallow' as const }],
    },
    // A parameter is not a declaration with a falsy initialiser, so there is
    // no prior deny state either — the caller chose the incoming value.
    {
      code: `async function handler(req, res, user) {
         try { user = await authenticate(req); } catch (e) {}
         if (user) { return ok(res); }
         await purge();
       }`,
      errors: [{ messageId: 'failOpenSwallow' as const }],
    },
    // Declared with a TRUTHY initialiser — swallowing leaves it granted.
    {
      code: `async function handler(req, res) {
         let allowed = true;
         try { allowed = await authenticate(req); } catch (e) {}
         if (allowed) { return ok(res); }
         await purge();
       }`,
      errors: [{ messageId: 'failOpenSwallow' as const }],
    },
    // Declared inside the try — there is no prior deny state to preserve.
    {
      code: `async function handler(req, res) {
         try { var session = await authenticate(req); } catch (e) {}
         if (session) { return ok(res); }
         await purge();
       }`,
      errors: [{ messageId: 'failOpenSwallow' as const }],
    },
  ],
});
