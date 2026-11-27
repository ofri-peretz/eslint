/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The most frequent false positive this rule produced on real repositories
 * (adoption scans, 2026-11-26): a comparison against a member of an enum or a
 * value typed with a literal union, reported because the MEMBER's name carries
 * a secret word.
 *
 * - Logto, 27 of 29 reports: `event !== InteractionEvent.ForgotPassword`,
 *   `configKey === LogtoOidcConfigKey.PrivateKeys`.
 * - Infisical, 18 reports: `event.type === WebhookEvents.SecretModified`,
 *   `req.body.grant_type === OauthGrantType.AuthorizationCode`.
 * - Langfuse: `if-none-match` against `"${sha256(file).slice(0, 32)}"`, an
 *   entity tag cut to a prefix.
 *
 * An enum member is a value the declaration writes out, exactly as a string
 * literal is, so the comparison cannot be a secret against attacker input.
 * What can be proven is proven from the declaration, in this file or in a
 * module imported by a relative path. An enum that arrives from a package or
 * a path alias cannot be opened, and keeps reporting: nothing is proven there,
 * and a name is not evidence.
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

const root = mkdtempSync(join(tmpdir(), 'timing-unsafe-enums-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const write = (name: string, text: string): void => {
  const file = join(root, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
// TypeScript sources: the linting parser reads these, the fallback does not.
write(
  'webhook/webhook-types.ts',
  [
    'export enum WebhookEvents {',
    "  SecretModified = 'secret.modified',",
    "  HoneyTokenTriggered = 'honey-token.triggered',",
    '  SecretCounted,',
    '  TokenOffset = 1 + 2,',
    '  TokenNegative = -1,',
    '  Computed = readPin(),',
    '}',
  ].join('\n'),
);
write('webhook/index.ts', "export * from './webhook-types';");
write(
  'webhook/vault.ts',
  [
    'export const Vault = { Token: loadToken() };',
    "export const Kinds = { Secret: 'secret' } as const;",
  ].join('\n'),
);
const handler = join(root, 'service/handler.ts');

ruleTester.run(
  'a declared enum or union is not a secret',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        // @source Infisical backend/src/services/webhook/webhook-fns.ts:159
        // @found real-source scan
        name: 'FP: an event type against a member of an enum imported by a relative path',
        filename: handler,
        code: `
          import { WebhookEvents } from '../webhook/webhook-types.js';
          export function onEvent(req) {
            if (req.body.type === WebhookEvents.SecretModified) return true;
            return false;
          }
        `,
      },
      {
        name: 'the same enum read through an export-star barrel',
        filename: handler,
        code: `
          import { WebhookEvents } from '../webhook';
          export function onEvent(event) {
            return event.type === WebhookEvents.HoneyTokenTriggered;
          }
        `,
      },
      {
        name: 'members with no initializer and with a literal expression count as written out',
        filename: handler,
        code: `
          import { WebhookEvents } from '../webhook/webhook-types';
          export function a(event) { return event.type === WebhookEvents.SecretCounted; }
          export function b(event) { return event.type === WebhookEvents.TokenOffset; }
          export function c(event) { return event.type === WebhookEvents.TokenNegative; }
        `,
      },
      {
        name: 'a member written as a template literal with nothing interpolated',
        code: `
          enum Grant { Token = \`token\` }
          export function route(req) {
            return req.body.token === Grant.Token;
          }
        `,
      },
      {
        // @source Logto packages/core/src/routes/interaction/index.ts:228
        // @found real-source scan
        name: 'FP: an interaction event against a member of an enum declared in the file',
        code: `
          enum InteractionEvent { SignIn = 'SignIn', ForgotPassword = 'ForgotPassword' }
          export function route(ctx) {
            const { event } = ctx.guard.body;
            if (event !== InteractionEvent.ForgotPassword) return 1;
            return 0;
          }
        `,
      },
      {
        name: 'the enum on the left and a loose comparison',
        code: `
          enum Grant { AuthorizationCode = 'authorization_code' }
          export function route(req) {
            return Grant.AuthorizationCode != req.body.grant_token;
          }
        `,
      },
      {
        name: 'a const enum, read by its quoted member name',
        code: `
          const enum Kind { 'api-token' = 'api-token' }
          export function route(req) {
            return req.body.token === Kind['api-token'];
          }
        `,
      },
      {
        name: 'a member of an object this file declares as const',
        code: `
          const Role = { Secret: 'secret', Admin: 'admin' } as const;
          export function route(req) {
            return req.body.token === Role.Secret;
          }
        `,
      },
      {
        name: 'an enum member of an object imported as const from a relative module',
        filename: handler,
        code: `
          import { Kinds } from '../webhook/vault';
          export function route(req) {
            return req.body.token === Kinds.Secret;
          }
        `,
      },
      {
        // @source okta-auth-js lib/oidc/dpop.ts:185, now with the union in a parameter
        name: 'a parameter typed with a literal union holds one of the listed values',
        code: `
          export function check(req, expected: 'access' | 'refresh') {
            return req.headers['x-token'] === expected;
          }
        `,
      },
      {
        name: 'a union that includes null and undefined is still a listed set',
        code: `
          export function check(req, expected: 'access' | null | undefined) {
            return req.headers['x-token'] === expected;
          }
        `,
      },
      {
        name: 'a parameter typed with an enum declared in the file',
        code: `
          enum Kind { Access, Refresh }
          export function check(req, expected: Kind) {
            return req.headers['x-token'] === expected;
          }
        `,
      },
      {
        name: 'a parameter typed with an enum imported by a relative path',
        filename: handler,
        code: `
          import { WebhookEvents } from '../webhook/webhook-types';
          export function check(req, expected: WebhookEvents) {
            return req.headers['x-token'] === expected;
          }
        `,
      },
      {
        name: 'a parameter typed with an alias of a literal union written in the file',
        code: `
          type Kind = 'access' | 'refresh';
          export function check(req, expected: Kind) {
            return req.headers['x-token'] === expected;
          }
        `,
      },
      {
        name: 'an alias chain four hops deep still ends in the listed values',
        code: `
          type A = B;
          type B = C;
          type C = D;
          type D = 'access' | 'refresh';
          export function check(req, expected: A) {
            return req.headers['x-token'] === expected;
          }
        `,
      },
      {
        name: 'a local variable typed with a literal union',
        code: `
          export function check(req) {
            const expected: 'access' | 'refresh' = pick();
            return expected === req.headers['x-token'];
          }
        `,
      },
      {
        name: 'typeof against a name that reads like a secret is a type tag',
        code: `
          export function check(req, tokenKind) {
            return typeof req.body.token === 'string' && tokenKind === 'string';
          }
        `,
      },
      {
        // @source Langfuse web/src/pages/api/workers/elk-worker.ts:62
        // @found real-source scan
        name: 'FP: If-None-Match against an entity tag cut to a prefix of a content digest',
        code: `
          import { createHash } from 'crypto';
          const etag = \`"\${createHash('sha256').update(file).digest('hex').slice(0, 32)}"\`;
          export default function handler(req, res) {
            if (req.headers['if-none-match'] === etag) return res.status(304).end();
          }
        `,
      },
      {
        name: 'an entity tag cut with substring',
        code: `
          import { createHash } from 'crypto';
          const etag = createHash('md5').update(file).digest('hex').substring(0, 16);
          export default function handler(req) {
            return req.headers['if-none-match'] === etag;
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'an enum from a package cannot be opened, so nothing is proven about it',
        code: `
          import { InteractionEvent } from '@logto/schemas';
          export function route(ctx) {
            const { event } = ctx.guard.body;
            if (event !== InteractionEvent.ForgotPassword) return 1;
            return 0;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an object that only looks like an enum, filled by a call, is a secret',
        filename: handler,
        code: `
          import { Vault } from '../webhook/vault';
          export function route(req) {
            return req.body.token === Vault.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a plain object in the file is not an enum, whatever its members are called',
        code: `
          const Vault = { Token: process.env.API_TOKEN };
          export function route(req) {
            return req.body.token === Vault.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an object declared as const but filled from the environment is a secret',
        code: `
          const Vault = { Token: process.env.API_TOKEN } as const;
          export function route(req) {
            return req.body.token === Vault.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a computed enum member holds what a call returned',
        filename: handler,
        code: `
          import { WebhookEvents } from '../webhook/webhook-types';
          export function route(req) {
            return req.body.token === WebhookEvents.Computed;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a computed enum member declared in the file',
        code: `
          enum Pins { Token = readPin() }
          export function route(req) {
            return req.body.token === Pins.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a template member that interpolates a call holds what the call returned',
        code: `
          enum Pins { Token = \`\${readPin()}\` }
          export function route(req) {
            return req.body.token === Pins.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a member that mixes a literal with a call holds what the call returned',
        code: `
          enum Pins { Token = 1 + readPin() }
          export function route(req) {
            return req.body.token === Pins.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a member that mixes a call with a literal holds what the call returned',
        code: `
          enum Pins { Token = readPin() + 1 }
          export function route(req) {
            return req.body.token === Pins.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a member that negates a call holds what the call returned',
        code: `
          enum Pins { Token = -readPin() }
          export function route(req) {
            return req.body.token === Pins.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an object asserted to another type is not asserted const',
        code: `
          const Role = { Secret: 'secret' } as Record<string, string>;
          export function route(req) {
            return req.body.token === Role.Secret;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an object asserted to a qualified type is not asserted const',
        code: `
          const Role = { Secret: 'secret' } as Roles.Table;
          export function route(req) {
            return req.body.token === Role.Secret;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a let binding of a const-asserted object can be reassigned elsewhere',
        code: `
          let Role = { Secret: 'secret' } as const;
          export function route(req) {
            return req.body.token === Role.Secret;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an object root that is not declared anywhere is not a constant',
        code: `
          export function route(req) {
            return req.body.token === Vault.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a type that is not declared anywhere lists nothing',
        code: `
          export function check(req, expected: Unknown) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an alias chain five hops deep is not followed to its end',
        code: `
          type A = B;
          type B = C;
          type C = D;
          type D = E;
          type E = 'access' | 'refresh';
          export function check(req, expected: A) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a digest cut by a computed length is not a known prefix',
        code: `
          import { createHash } from 'crypto';
          export function handler(req, n) {
            const expectedToken = createHash('sha256').update(secretSalt).digest('hex').slice(0, n);
            return req.headers['x-token'] === expectedToken;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a member the enum does not declare is not a constant',
        code: `
          enum Grant { Code = 'code' }
          export function route(req) {
            return req.body.token === Grant.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a class static that is spelled like an enum member is a secret',
        code: `
          class Keys { static Token = process.env.API_TOKEN; }
          export function route(req) {
            return req.body.token === Keys.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a parameter that shadows the enum is a value, not the enum',
        code: `
          enum Grant { Token = 'token' }
          export function route(req, Grant) {
            return req.body.token === Grant.Token;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an enum member read by a computed key is not named',
        code: `
          enum Grant { Token = 'token' }
          export function route(req, which) {
            return req.body.token === Grant[which];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a secret parameter typed string is not a listed set',
        code: `
          export function check(req, expected: string) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a union that also admits string lists nothing',
        code: `
          export function check(req, expected: 'access' | string) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an alias of string lists nothing',
        code: `
          type Credential = string;
          export function check(req, expected: Credential) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a type imported from a package may be anything',
        code: `
          import type { Kind } from '@scope/types';
          export function check(req, expected: Kind) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a qualified type name is not read',
        code: `
          export function check(req, expected: Scope.Kind) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a name declared twice has no single type',
        code: `
          export function check(req) {
            var expected: 'a' | 'b' = pick();
            var expected: string = process.env.API_TOKEN;
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an alias that names itself does not loop and lists nothing',
        code: `
          type Loop = Loop | 'a';
          export function check(req, expected: Loop) {
            return req.headers['x-token'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a cut of a keyed digest is still the signature the caller must not time',
        code: `
          import { createHmac } from 'crypto';
          export function verify(req, secret) {
            const expected = createHmac('sha256', secret).update(req.body).digest('hex').slice(0, 32);
            return req.headers['x-signature'] === expected;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a cut by a computed length is not read as a prefix',
        code: `
          import { createHmac } from 'crypto';
          export function verify(req, secret, n) {
            const expected = createHmac('sha256', secret).update(req.body).digest('hex').slice(0, n);
            return req.headers['x-signature'] === expected;
          }
        `,
        errors: unsafe,
      },
    ],
  },
);
