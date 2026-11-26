/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Found scanning firecrawl-mcp's bundled `dist/server.js` (FastMCP's stdio
 * transport): the catch stores the error in `failure`, and the `if` right
 * after the try throws when `failure` is set. Nothing is swallowed. The
 * error is handed to a throw, so the auth decision fails closed.
 *
 * The invalid cases mark the boundary. The flag has to be written on every
 * pass through the catch, declared before the try, and not built from its own
 * old value (a counter lets the first failures through). It also has to be
 * read by a guard that leaves before any work runs.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noFailOpenAuth } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const err = [{ messageId: 'failOpenSwallow' as const }];

ruleTester.run(
  'no-fail-open-auth — a catch that records the failure for a guard',
  noFailOpenAuth,
  {
    valid: [
      {
        name: 'the bundled FastMCP shape: the catch records, the guard throws',
        code: `class S {
         async start() {
           let session;
           let failure;
           try {
             session = await this.options.authenticate(void 0);
             if (!session) failure = 'Authentication failed';
           } catch (error2) {
             failure = error2 instanceof Error ? error2.message : String(error2);
           }
           if (failure !== void 0) {
             throw new Error('Authentication failed: ' + failure);
           }
           return this.serve(session);
         }
       }`,
      },
      {
        name: 'a boolean flag read by a later exiting guard, past an unrelated one',
        code: `async function handle(req) {
         let failed = false;
         try { await verifyToken(req.headers.authorization); } catch (e) { log(e); failed = true; }
         if (req.method === 'OPTIONS') return preflight();
         if (failed) return deny();
         return proceed();
       }`,
      },
    ],
    invalid: [
      // The flag is set only on some failures.
      {
        name: 'a flag set only on some failures does not record every failure',
        code: `async function handle(req) {
           let failed = false;
           try { await verifyToken(req.token); } catch (e) { if (e.fatal) failed = true; }
           if (failed) return deny();
           return proceed();
         }`,
        errors: err,
      },
      // A counter lets the first failures through.
      {
        name: 'a counter lets the first failures through',
        code: `let failures = 0;
         async function handle(req) {
           try { await verifyToken(req.token); } catch (e) { failures = failures + 1; }
           if (failures > 3) throw new Error('locked');
           return proceed();
         }`,
        errors: err,
      },
      // The flag is set, but work runs before the guard reads it.
      {
        name: 'work that runs before the guard reads the flag is fail-open',
        code: `async function handle(req) {
           let failure;
           try { await verifyToken(req.token); } catch (e) { failure = e; }
           await purgeTable(req.body.table);
           if (failure) throw failure;
         }`,
        errors: err,
      },
      // A compound write and a member write are not a recorded flag.
      {
        name: 'a compound write and a member write are not a recorded flag',
        code: `async function handle(req, state) {
           let failure = '';
           try { await verifyToken(req.token); } catch (e) { failure += e.message; state.failed = true; }
           if (failure) throw new Error(failure);
           return proceed();
         }`,
        errors: err,
      },
      // A binding first declared inside the catch is not a flag the guard sees.
      {
        name: 'a binding first declared inside the catch is not a flag declared before the try',
        code: `async function handle(req) {
           try { await verifyToken(req.token); } catch (e) { var failure; failure = e; }
           if (failure) throw failure;
           return proceed();
         }`,
        errors: err,
      },
      // A write to an undeclared global has no binding to read.
      {
        name: 'a write to an undeclared global has no binding to read',
        code: `async function handle(req) {
           try { await verifyToken(req.token); } catch (e) { lastError = e; }
           if (lastError) throw lastError;
           return proceed();
         }`,
        errors: err,
      },
    ],
  },
);
