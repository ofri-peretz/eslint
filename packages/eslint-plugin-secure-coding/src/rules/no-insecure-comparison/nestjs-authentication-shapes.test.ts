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

ruleTester.run('re-encode and re-read edges', noInsecureComparison, {
  valid: [
    {
      name: 'a re-encoding reached through a parenthesised optional chain',
      code: `
        function check(signature) {
          const decoded = Buffer.from(signature, 'base64url');
          return (decoded?.toString)('base64url') !== signature;
        }
      `,
    },
    {
      name: 'reading a property of the original elsewhere does not change it',
      code: `
        function check(parts) {
          const decoded = Buffer.from(parts.signature, 'base64url');
          let seen;
          seen = parts.signature;
          void typeof parts.signature;
          return decoded.toString('base64url') !== parts.signature;
        }
      `,
    },
    {
      name: 'a store re-read through optional chains and a fixed index',
      code: `
        async function reencrypt(store, ids, user) {
          const record = await store.totp.get(ids[0], 'totp', user?.id);
          const latest = await store.totp.get(ids[0], 'totp', user?.id);
          if (latest?.secret !== record.secret) return false;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'a value re-encoded after the original was reassigned still reports',
      ...timing(
        `
        function check(presented, expectedSignature) {
          const signature = Buffer.from(presented, 'base64url');
          presented = expectedSignature;
          return signature.toString('base64url') === presented;
        }
      `,
        "signature.toString('base64url')",
        '===',
        'presented',
      ),
    },
    {
      name: 'a property of the original assigned before the comparison still reports',
      ...timing(
        `
        function check(parts, expectedSignature) {
          const signature = Buffer.from(parts.signature, 'base64url');
          parts.signature = expectedSignature;
          return signature.toString('base64url') === parts.signature;
        }
      `,
        "signature.toString('base64url')",
        '===',
        'parts.signature',
      ),
    },
    {
      name: 'a property of the original updated or deleted still reports',
      ...timing(
        `
        function check(msg) {
          const decoded = Buffer.from(msg.signature, 'base64url');
          msg.count++;
          delete msg.signature;
          return decoded.toString('base64url') !== msg.signature;
        }
      `,
        "decoded.toString('base64url')",
        '!==',
        'msg.signature',
      ),
    },
    {
      name: 'a buffer changed before the re-encoding still reports',
      ...timing(
        `
        function verify(presented, expectedSignature) {
          const signature = Buffer.from(presented, 'utf8');
          signature.set(Buffer.from(expectedSignature, 'utf8'));
          return signature.toString('utf8') === presented;
        }
      `,
        "signature.toString('utf8')",
        '===',
        'presented',
      ),
    },
    {
      name: 'a lookup and a trim are not a re-encoding',
      ...timing(
        `
        const readSecret = (_input) => process.env.API_SECRET;
        function check(presented) {
          const secret = readSecret(presented);
          return secret.trim() === presented;
        }
      `,
        'secret.trim()',
        '===',
        'presented',
      ),
    },
    {
      name: 'a round trip through two different encodings still reports',
      ...timing(
        `
        function check(signature) {
          const decoded = Buffer.from(signature, 'base64url');
          return decoded.toString('hex') !== signature;
        }
      `,
        "decoded.toString('hex')",
        '!==',
        'signature',
      ),
    },
    {
      name: 'a re-encoding of a global value still reports',
      ...timing(
        `
        function check() {
          const decoded = Buffer.from(globalSignature, 'base64url');
          return decoded.toString('base64url') !== globalSignature;
        }
      `,
        "decoded.toString('base64url')",
        '!==',
        'globalSignature',
      ),
    },
    {
      name: 'a re-encoding of a value read with a dynamic index still reports',
      ...timing(
        `
        function check(msg, i) {
          const decoded = Buffer.from(msg.signature[i], 'base64url');
          return decoded.toString('base64url') !== msg.signature[i];
        }
      `,
        "decoded.toString('base64url')",
        '!==',
        'msg.signature[i]',
      ),
    },
    {
      name: 'two reads of a store with an argument reassigned between them still report',
      ...timing(
        `
        async function check(store, userId, otherId) {
          const record = await store.getTotp(userId);
          userId = otherId;
          const latest = await store.getTotp(userId);
          return record.secret === latest.secret;
        }
      `,
        'record.secret',
        '===',
        'latest.secret',
      ),
    },
    {
      name: 'two reads of a store with a computed argument still report',
      ...timing(
        `
        async function check(store, userId) {
          const record = await store.getTotp(userId + 1);
          const latest = await store.getTotp(userId + 1);
          if (latest?.secret !== record.secret) return false;
        }
      `,
        'latest?.secret',
        '!==',
        'record.secret',
      ),
    },
    {
      name: 'a numeric toString is not a re-encoding',
      ...timing(
        `
        function check(signature) {
          const decoded = Buffer.from(signature, 'base64url');
          return decoded.toString(16) !== signature;
        }
      `,
        'decoded.toString(16)',
        '!==',
        'signature',
      ),
    },
    {
      name: 'two reads of a store picked by a dynamic key still report',
      ...timing(
        `
        async function check(stores, kind, userId) {
          const record = await stores[kind].getTotp(userId);
          const latest = await stores[kind].getTotp(userId);
          if (latest?.secret !== record.secret) return false;
        }
      `,
        'latest?.secret',
        '!==',
        'record.secret',
      ),
    },
    {
      name: 'bindings that refer to each other are not followed forever',
      ...timing(
        `
        async function check() {
          const record = latest.next;
          const latest = record.next;
          if (latest.secret !== record.secret) return false;
        }
      `,
        'latest.secret',
        '!==',
        'record.secret',
      ),
    },
    {
      name: 'a choice between two fields that no guard settles still reports',
      ...timing(
        `
        async function check(store, userId, useSecret) {
          const record = await store.get(userId);
          const candidate = useSecret ? record.secret : record.presented;
          return record.secret === candidate;
        }
      `,
        'record.secret',
        '===',
        'candidate',
      ),
    },
    {
      name: 'a guard on a different condition does not settle the choice',
      ...timing(
        `
        async function check(store, userId, a, b) {
          const record = await store.get(userId);
          const candidate = a ? record.secret : record.presented;
          if (b) return record.secret === candidate;
          return false;
        }
      `,
        'record.secret',
        '===',
        'candidate',
      ),
    },
    {
      name: 'the branch the guard picks is a different field',
      ...timing(
        `
        async function check(store, userId, useSecret) {
          const record = await store.get(userId);
          const candidate = useSecret ? record.secret : record.presented;
          if (useSecret) return false;
          else return record.secret === candidate;
        }
      `,
        'record.secret',
        '===',
        'candidate',
      ),
    },
    {
      name: 'two different fields of one store read still report',
      ...timing(
        `
        async function check(store, userId) {
          const record = await store.get(userId);
          return record.secret === record.presented;
        }
      `,
        'record.secret',
        '===',
        'record.presented',
      ),
    },
    {
      name: 'two different fields of one awaited record still report',
      ...timing(
        `
        async function check(secret, presented) {
          const record = await Promise.resolve({ secret, presented });
          return record.secret === record.presented;
        }
      `,
        'record.secret',
        '===',
        'record.presented',
      ),
    },
    {
      name: 'an awaited value that is not a call is not a store re-read',
      ...timing(
        `
        async function verify(store, pending) {
          const latest = await pending;
          const record = await store.getTotp();
          return latest.secret === record.secret;
        }
      `,
        'latest.secret',
        '===',
        'record.secret',
      ),
    },
    {
      name: 'a re-encoding whose chain does not start at a binding still reports',
      ...timing(
        "function check(signature) { return this.sig.toString('base64url') !== signature; }",
        "this.sig.toString('base64url')",
        '!==',
        'signature',
      ),
    },
    {
      name: 'a re-encoding of a parameter, not a local binding, still reports',
      ...timing(
        "function check(signature, decoded) { return decoded.toString('base64url') !== signature; }",
        "decoded.toString('base64url')",
        '!==',
        'signature',
      ),
    },
    {
      name: 'a re-encoding of a binding that is not a call still reports',
      ...timing(
        "function check(signature) { const decoded = signature.raw; return decoded.toString('base64url') !== signature; }",
        "decoded.toString('base64url')",
        '!==',
        'signature',
      ),
    },
    {
      name: 'a re-encoding of a call made with no arguments still reports',
      ...timing(
        "function check(signature) { const decoded = make(); return decoded.toString('base64url') !== signature; }",
        "decoded.toString('base64url')",
        '!==',
        'signature',
      ),
    },
    {
      name: 'options without recordMetadataTails keep the default tails',
      options: [{ allowInTests: false }],
      ...timing(
        'function find(token, secret) { return token.userId === secret; }',
        'token.userId',
        '===',
        'secret',
      ),
    },
  ],
});
