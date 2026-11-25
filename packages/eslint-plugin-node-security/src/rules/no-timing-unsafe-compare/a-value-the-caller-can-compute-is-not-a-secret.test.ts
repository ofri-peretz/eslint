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
write(
  'auth/routes.js',
  [
    'export const ROUTES = {',
    "  resetPassword: '/reset-password',",
    "  nested: { changePassword: '/change-password' },",
    '};',
    'export const SECRETS = { apiToken: process.env.API_TOKEN };',
    "export const LATE = { apiToken: '', nested: { key: '' } };",
    'LATE.apiToken = process.env.API_TOKEN;',
    "export const MERGED = { apiToken: '' };",
    'Object.assign(MERGED, loadSecrets());',
    "export const DELETED = { apiToken: 'x' };",
    'delete DELETED.apiToken;',
    "export const COUNTED = { hits: 0, name: 'hits' };",
    'COUNTED.hits++;',
    "export const READ_ONLY = { name: 'api' };",
    'Object.keys(READ_ONLY);',
    'console.log(READ_ONLY.name);',
    // Reads that write nothing into READ_ONLY: an assignment from it, a sum,
    // a typeof, a computed key, a copy source, and a local `assign`.
    'let copy;',
    'copy = READ_ONLY.name;',
    "const label = READ_ONLY.name + '!';",
    'typeof READ_ONLY.name;',
    'const lookup = {};',
    'lookup[READ_ONLY] = 1;',
    'Object.assign({}, READ_ONLY);',
    'function assign() {}',
    'assign(READ_ONLY, {});',
  ].join('\n'),
);
write(
  'auth/default-routes.js',
  "export default { resetPassword: '/reset-password' };",
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
      {
        name: 'a plain digest of the body is no secret even when every comparison is reported',
        options: [{ reportUnverifiedComparisons: true }],
        code: `
          import { createHash } from 'node:crypto';
          function verify(req) {
            const v = createHash('sha256').update(req.body).digest('hex');
            return v === req.headers['content-sha256'];
          }
        `,
      },
      {
        name: 'the same digest through the crypto namespace',
        code: `
          import crypto from 'node:crypto';
          function verify(req) {
            return crypto.createHash('sha256').update(req.body).digest('hex') === req.headers['content-sha256'];
          }
        `,
      },
      {
        // @source Ghost ghost/core/server/auth/better-auth/plugins/staff-lifecycle.ts:162
        // @found real-source scan
        name: 'FP: a request path against a route in an imported object of literals',
        filename: service,
        code: `
          import { ROUTES } from '../auth/routes.js';
          export function isReset(req) {
            return req.path === ROUTES.resetPassword || req.path === ROUTES.nested.changePassword;
          }
        `,
      },
      {
        name: 'a default-exported object of literals is held by no variable, so nothing rewrites it',
        filename: service,
        code: `
          import ROUTES from '../auth/default-routes.js';
          export function isReset(req) {
            return req.path === ROUTES.resetPassword;
          }
        `,
      },
      {
        name: 'an imported object only read in its module keeps its literals',
        filename: service,
        code: `
          import { READ_ONLY } from '../auth/routes.js';
          export function check(req) {
            return req.headers['x-api-token'] === READ_ONLY.name;
          }
        `,
      },
      {
        name: "a literal joined to the body with + is still the caller's",
        code: `
          import { createHash } from 'node:crypto';
          function verify(req) {
            const v = createHash('sha256').update('v1:' + req.body).digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
      },
      {
        name: 'an empty update after the body adds nothing',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req) {
            const v = createHash('sha256').update(req.body).update().digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
      },
      {
        name: "a digest of the body joined with literals is still the caller's",
        code: `
          import { createHash } from 'node:crypto';
          function verify(req) {
            const v = createHash('sha256').update(\`v1:\${req.body}\`, 'utf8').digest('hex').toLowerCase();
            return v === req.headers['x-hash'];
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a placeholder overwritten from the environment in its module is not a constant',
        filename: service,
        code: `
          import { LATE } from '../auth/routes.js';
          export function check(req) {
            return req.headers['x-api-token'] === LATE.apiToken;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a nested placeholder of an object written later is not a constant',
        filename: service,
        code: `
          import { LATE } from '../auth/routes.js';
          export function check(req) {
            return req.headers['x-api-token'] === LATE.nested.key;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an object filled by Object.assign in its module is not a constant',
        filename: service,
        code: `
          import { MERGED } from '../auth/routes.js';
          export function check(req) {
            return req.headers['x-api-token'] === MERGED.apiToken;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a property deleted in its module is not a constant',
        filename: service,
        code: `
          import { DELETED } from '../auth/routes.js';
          export function check(req) {
            return req.headers['x-api-token'] === DELETED.apiToken;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a property updated in its module is not a constant',
        filename: service,
        code: `
          import { COUNTED } from '../auth/routes.js';
          export function check(req) {
            return req.headers['x-api-token'] === COUNTED.name;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a server value mixed into the body before hashing hides it',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req, pepper) {
            const v = createHash('sha256').update(req.body + pepper).digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a template that joins a server value hides it',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req, pepper) {
            const v = createHash('sha256').update(\`\${req.body}\${pepper}\`).digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an encoding argument is not an input, but a second update is',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req, pepper) {
            const v = createHash('sha256').update(req.body, 'utf8').update(pepper, 'utf8').digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a server value on either side of any operator is hidden by the digest',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req, pepper) {
            const v = createHash('sha256').update(req.body ^ pepper).digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a chain call this cannot read may add an input',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req, pepper) {
            const v = createHash('sha256').update(req.body).digest('hex').concat(pepper);
            return v === req.headers['x-hash'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an update with no argument adds nothing the caller does not know',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req, pepper) {
            const v = createHash('sha256').update().update(pepper).digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an imported object property read from the environment is not a constant',
        filename: service,
        code: `
          import { SECRETS } from '../auth/routes.js';
          export function check(req) {
            return req.headers['x-api-token'] === SECRETS.apiToken;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a property of this is not followed as an import',
        filename: service,
        code: `
          export class Check {
            run(req) {
              return req.headers['x-api-token'] === this.secrets.apiToken;
            }
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a hasher returned by a call is not known to take no key',
        code: `
          function verify(req) {
            const v = hasherFor(req.tenant)(req.body).digest('hex');
            return v === req.headers['x-signature'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a digest that mixes in a value the caller does not send hides it',
        code: `
          import { createHash } from 'node:crypto';
          function verify(req, pepper) {
            const v = createHash('sha256').update(req.body).update(pepper).digest('hex');
            return v === req.headers['x-hash'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an HMAC written inside the template it is compared as',
        code: `
          import { createHmac } from 'node:crypto';
          function verify(req, key) {
            return \`sha256=\${createHmac('sha256', key).update(req.body).digest('hex')}\` === req.headers['x-hub-signature-256'];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'only an imported binding is followed: a local let is judged as before',
        filename: service,
        code: `
          let apiToken = 'abc';
          export function check(req) {
            return req.headers['x-api-token'] === apiToken;
          }
        `,
        errors: unsafe,
      },
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

/**
 * A digest input is the caller's only when every part of it is. Request taint
 * is not that proof: `const payload = req.body + pepper` reads the request and
 * still hides the server's pepper (CodeRabbit review of #1723).
 */
const digestOf = (setup: string, input: string): string => `
  import { createHash } from 'node:crypto';
  async function verify(req, pepper) {
    ${setup}
    const v = createHash('sha256').update(${input}).digest('hex');
    return v === req.headers['x-hash'];
  }
`;

ruleTester.run(
  'no-timing-unsafe-compare: every part of a digest input must be the caller’s',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'a binding written once with the body',
        code: digestOf('const payload = req.body;', 'payload'),
      },
      {
        name: 'a binding of the stringified body',
        code: digestOf('const payload = JSON.stringify(req.body);', 'payload'),
      },
      {
        name: 'a field destructured from the request',
        code: digestOf('const { body } = req;', 'body'),
      },
      {
        name: 'an awaited body read',
        code: digestOf('', 'await req.text()'),
      },
      {
        name: 'String() of the body',
        code: digestOf('', 'String(req.body)'),
      },
      {
        name: 'Buffer.from of the body',
        code: digestOf('', "Buffer.from(req.body, 'utf8')"),
      },
      {
        name: 'a literal index into the body',
        code: digestOf('', "req.body['raw']"),
      },
    ],
    invalid: [
      {
        name: 'a binding that mixes a server value into the body',
        code: digestOf('const payload = req.body + pepper;', 'payload'),
        errors: unsafe,
      },
      {
        name: 'a binding written twice is not judged by either write',
        code: digestOf(
          'let payload = req.body; payload = payload + pepper;',
          'payload',
        ),
        errors: unsafe,
      },
      {
        name: 'a binding that reads itself stops',
        code: digestOf('let payload; payload = payload + req.body;', 'payload'),
        errors: unsafe,
      },
      {
        name: 'a binding never written is not the caller’s',
        code: digestOf('let salt;', 'req.body + salt'),
        errors: unsafe,
      },
      {
        name: 'an imported value joined to the body',
        code: `import { salt } from './salt';\n${digestOf('', 'req.body + salt')}`,
        errors: unsafe,
      },
      {
        name: 'an unknown function of the body may add a secret',
        code: digestOf('', 'pepperize(req.body)'),
        errors: unsafe,
      },
      {
        name: 'a method on a server object may add a secret',
        code: digestOf('', 'store.mix(req.body)'),
        errors: unsafe,
      },
      {
        name: 'a namespace function that is not a pass-through',
        code: digestOf('', 'JSON.parse(req.body)'),
        errors: unsafe,
      },
      {
        name: 'a callee that is neither a name nor a member',
        code: digestOf('', '(0, String)(req.body)'),
        errors: unsafe,
      },
      {
        name: 'a spread argument',
        code: digestOf('', 'String(...req.body)'),
        errors: unsafe,
      },
      {
        name: 'a server value as a computed index',
        code: digestOf('', 'req.body[pepper]'),
        errors: unsafe,
      },
      {
        name: 'a fallback to a server value',
        code: digestOf('', 'req.body || pepper'),
        errors: unsafe,
      },
    ],
  },
);
