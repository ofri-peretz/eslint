/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A liveness probe is unauthenticated on purpose.
 *
 * Hand-verification run 2026-08-22. shardeum/json-rpc-server
 * `src/routes/healthCheck.ts:8` registers `router.get('/is-alive', …)` and was
 * reported as `Missing Authentication`, CWE-287, CVSS 9.8 — the rule's top
 * severity, on an endpoint whose entire job is to answer a caller that holds no
 * session.
 *
 * `DEFAULT_PUBLIC_ROUTE_PATTERNS` already carried `health`, `healthz`, `readyz`
 * and `livez`; the gap was the other half of the same vocabulary. Kubernetes
 * spells the concepts `liveness` and `readiness`, and hand-rolled probes are
 * routinely `/is-alive`, `/alive` or `/heartbeat`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noMissingAuthentication } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-missing-authentication — a health check is public',
  noMissingAuthentication,
  {
    valid: [
    {
      // A dynamic method names no route — `propertyName` returns null, so
      // `resolvedMethod !== null` is false and the rule cannot claim this
      // registers anything. The negative half of resolving string subscripts.
      name: 'a dynamic router method registers no nameable route',
      code: `router[verb]('/admin/accounts', (req, res) => { res.json(listUsers()); });`,
    },
      // The corpus shape.
      `router.get('/is-alive', (req, res) => { res.status(200).json({ status: 'ok' }); });`,
      `router.get('/alive', (req, res) => { res.send('ok'); });`,
      `app.get('/liveness', (req, res) => { res.send('ok'); });`,
      `app.get('/readiness', (req, res) => { res.send('ok'); });`,
      `app.get('/heartbeat', (req, res) => { res.send('ok'); });`,
    ],
    invalid: [
      // The positive control: the same registration shape on a route that is not
      // a probe still reports. Without this the file would pass just as well if
      // the rule had stopped looking at routes altogether.
      {
        code: `router.get('/admin/accounts', (req, res) => { res.json(listUsers()); });`,
        errors: [{ messageId: 'missingAuthentication' }],
      },
    ],
  },
);
