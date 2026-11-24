/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two shapes found scanning Unleash (2026-11-24), where nothing secret is on
 * either side of the comparison:
 *
 * - `src/lib/features/edgetokens/edge-hmac-verifier.ts:58` compares the
 *   SHA-256 of the request body with the `content-sha256` header. A plain
 *   digest takes no key, so the caller computes the same value from what they
 *   sent; the HMAC that follows is the real check, and it uses
 *   `timingSafeEqual`.
 * - `src/lib/features/apitokensv2/api-token-v2-service.ts:289` compares an
 *   event type with `API_TOKEN_DELETED`, a string literal exported from
 *   `../../events/index.js`. Read where it is written, it is a constant.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

const unsafe = [{ messageId: 'timingUnsafeCompare' as const }];

const root = mkdtempSync(join(tmpdir(), 'timing-unsafe-imports-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const write = (name: string, text: string): void => {
  const file = join(root, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
// Plain JavaScript, which every engine's fallback parser reads.
write(
  'events/index.js',
  [
    "export const API_TOKEN_DELETED = 'api-token-deleted';",
    'export const SIGNING_TOKEN = process.env.SIGNING_TOKEN;',
    'export const apiToken = loadToken();',
  ].join('\n'),
);
const service = join(root, 'tokens/service.js');

ruleTester.run(
  'a value the caller can compute is not a secret',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        // @source Unleash src/lib/features/edgetokens/edge-hmac-verifier.ts:58
        // @found real-source scan
        name: 'FP: a plain digest of the body against the digest the client sent',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req) {
            const bodyHash = req.headers['content-sha256'];
            const computedHash = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
            if (computedHash !== bodyHash) return false;
            return true;
          }
        `,
      },
      {
        name: 'the same digest written inline',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req) {
            return createHash('sha256').update(req.body).digest('hex') === req.headers['content-sha256'];
          }
        `,
      },
      {
        // @source Unleash src/lib/features/apitokensv2/api-token-v2-service.ts:289
        // @found real-source scan
        name: 'FP: an event type against a literal exported from a relative module',
        filename: service,
        code: `
          import { API_TOKEN_DELETED } from '../events/index.js';
          export function onEvent(event) {
            return event.type === API_TOKEN_DELETED;
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a digest of a stored secret crosses the boundary',
        code: `
          import { createHash } from 'node:crypto';
          async function verify(req) {
            const expectedHash = createHash('sha256').update(await store.secret()).digest('hex');
            if (expectedHash !== req.headers['x-hash']) return false;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a keyed digest of the body is still the server secret',
        code: `
          import { createHmac } from 'node:crypto';
          function verify(req) {
            const signature = req.headers['x-signature'];
            const expected = createHmac('sha256', key).update(req.body).digest('hex');
            if (expected !== signature) return false;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an imported secret read from the environment is not a constant',
        filename: service,
        code: `
          import { SIGNING_TOKEN } from '../events/index.js';
          export function check(req) {
            return req.headers.token === SIGNING_TOKEN;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an imported secret computed at load is not a constant',
        filename: service,
        code: `
          import { apiToken } from '../events/index.js';
          export function check(req) {
            return req.headers['x-api-token'] === apiToken;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a binding from a package is out of reach and judged as before',
        filename: service,
        code: `
          import { apiToken } from 'some-config';
          export function check(req) {
            return req.headers['x-api-token'] === apiToken;
          }
        `,
        errors: unsafe,
      },
    ],
  },
);
