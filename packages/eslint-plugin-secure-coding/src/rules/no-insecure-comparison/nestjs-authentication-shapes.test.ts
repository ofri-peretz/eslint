/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found running the rule on `nestjs/authentication`, where it reported eight
 * comparisons and none was a timing oracle:
 *
 * - `token.userId === userId`, `record.userId === userId`: an id field of a
 *   token record, named after its container.
 * - `signature.toString('base64url') !== parts[2]`: a signature checked against
 *   its own re-encoding, a canonical-form check.
 * - `latest.secret === record.secret`: two reads of the same store call,
 *   compared to notice a concurrent change.
 *
 * Each exemption has a lookalike that still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureComparison } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** The one finding, with the rule's timingSafeEqual suggestion applied to `left op right`. */
const timing = (code: string, left: string, op: string, right: string) => ({
  code,
  errors: [
    {
      messageId: 'timingUnsafeComparison' as const,
      suggestions: [
        {
          messageId: 'useTimingSafeEqual' as const,
          output: code.replace(
            `${left} ${op} ${right}`,
            `crypto.timingSafeEqual(Buffer.from(${left}), Buffer.from(${right}))`,
          ),
        },
      ],
    },
  ],
});

ruleTester.run('nestjs-authentication-shapes', noInsecureComparison, {
  valid: [
    {
      // @source nestjs/authentication lib/account/in-memory-email-token.store.ts:55
      // @found real-source scan
      name: 'FP: an id and a purpose field of a token record',
      code: `
        function find(tokens, userId, purpose) {
          for (const token of tokens) {
            if (token.userId === userId && token.purpose === purpose) return token;
          }
        }
      `,
    },
    {
      // @source nestjs/authentication lib/jwt/in-memory-refresh-token.store.ts:43
      // @found real-source scan
      name: 'FP: the user id of a refresh-token row',
      code: `
        function revoke(tokens, userId) {
          for (const record of tokens.values()) {
            if (record.userId === userId) return record.familyId;
          }
        }
      `,
    },
    {
      // @source nestjs/authentication lib/jwt/jws.util.ts:306
      // @found real-source scan
      name: 'FP: a signature against its own re-encoding',
      code: `
        function decode(token) {
          const parts = token.split('.');
          const signature = Buffer.from(parts[2], 'base64url');
          if (signature.toString('base64url') !== parts[2]) throw new Error('malformed token');
        }
      `,
    },
    {
      // @source nestjs/authentication lib/mfa/mfa.service.ts:187, :214
      // @found real-source scan
      name: 'FP: a stored secret against a re-read of the same store',
      code: `
        async function reencrypt(store, userId) {
          const record = await store.getTotp(userId);
          const latest = await store.getTotp(userId);
          if (latest?.secret !== record.secret) return false;
        }
      `,
    },
    {
      // @source nestjs/authentication lib/mfa/mfa.service.ts:161
      // @found real-source scan
      name: 'FP: a candidate chosen from one read, against the next read',
      code: `
        async function confirm(store, userId) {
          const record = await store.getTotp(userId);
          const candidate = record?.confirmed ? record.pendingSecret : record?.secret;
          const latest = await store.getTotp(userId);
          return record.confirmed ? latest.pendingSecret === candidate : latest.secret === candidate;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'the token VALUE of a record still reports',
      ...timing(
        'function check(token, presented) { return token.value === presented.tokenValue; }',
        'token.value',
        '===',
        'presented.tokenValue',
      ),
    },
    {
      name: 'a signature re-encoded and compared with a different value still reports',
      ...timing(
        `
        function verify(parts, expected) {
          const signature = Buffer.from(parts[2], 'base64url');
          return signature.toString('base64url') !== expected;
        }
      `,
        "signature.toString('base64url')",
        '!==',
        'expected',
      ),
    },
    {
      name: 'a stored secret against the caller’s input still reports',
      ...timing(
        `
        async function verify(store, userId, presentedSecret) {
          const record = await store.getTotp(userId);
          return record.secret === presentedSecret;
        }
      `,
        'record.secret',
        '===',
        'presentedSecret',
      ),
    },
    {
      name: 'two different store calls are not one re-read',
      ...timing(
        `
        async function verify(store, userId, otherId) {
          const a = await store.getTotp(userId);
          const b = await store.getTotp(otherId);
          return a.secret === b.secret;
        }
      `,
        'a.secret',
        '===',
        'b.secret',
      ),
    },
  ],
});

ruleTester.run('record-metadata-tails option', noInsecureComparison, {
  valid: [],
  invalid: [
    {
      name: 'an empty recordMetadataTails judges token.userId by its container again',
      options: [{ recordMetadataTails: [] }],
      ...timing(
        'function find(token, userId) { return token.userId === userId; }',
        'token.userId',
        '===',
        'userId',
      ),
    },
  ],
});
