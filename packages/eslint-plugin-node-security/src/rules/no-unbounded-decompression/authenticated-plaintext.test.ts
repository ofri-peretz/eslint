/**
 * no-unbounded-decompression: a payload that came out of an AEAD decipher
 * whose `final()` ran was sealed by someone holding the key.
 *
 * nestjs/workflows `aes-gcm-payload.codec.ts:110` inflates a stored payload
 * only after `Buffer.concat([decipher.update(…), decipher.final()])` on an
 * `aes-256-gcm` decipher with its tag set. `final()` throws unless the tag
 * verifies, so a decompression bomb needs the codec's key. The invalid half
 * keeps every link of that chain required: an unauthenticated mode, no tag,
 * no `final()`, a second decipher, another write, or another module.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnboundedDecompression } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const HEAD = `import { createDecipheriv } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
`;
const codec = ({
  algorithm = 'aes-256-gcm',
  tag = 'decipher.setAuthTag(bytes.subarray(bytes.length - 16));',
  parts = 'decipher.update(bytes.subarray(28, bytes.length - 16)), decipher.final()',
  extra = '',
} = {}) => `${HEAD}export function decode(bytes: Buffer, key: Buffer) {
  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv('${algorithm}', key, bytes.subarray(16, 28));
    ${tag}
    plaintext = Buffer.concat([${parts}]);
  } catch {
    throw new Error('failed authentication');
  }
  ${extra}
  const body = plaintext.subarray(1);
  return inflateRawSync(body);
}`;

const bomb = [{ messageId: 'unboundedDecompression' as const }];

ruleTester.run('authenticated plaintext', noUnboundedDecompression, {
  valid: [
    {
      // @source nestjs/workflows lib/core/codecs/aes-gcm-payload.codec.ts:110
      // @found real-source scan
      name: 'FP: inflate after an aes-256-gcm decipher with its tag set',
      code: codec(),
    },
    {
      // @found synthetic
      name: 'FP: chacha20-poly1305, final alone, sliced',
      code: codec({
        algorithm: 'chacha20-poly1305',
        parts: 'decipher.final()',
      }),
    },
  ],
  invalid: [
    {
      name: 'an unauthenticated mode still reports',
      code: codec({ algorithm: 'aes-256-cbc' }),
      errors: bomb,
    },
    {
      name: 'a dynamic algorithm still reports',
      code: codec({ algorithm: "' + alg + '" }),
      errors: bomb,
    },
    {
      name: 'no setAuthTag still reports',
      code: codec({ tag: 'decipher.setAAD(aad); decipher.setAuthTag;' }),
      errors: bomb,
    },
    {
      name: 'update without final still reports',
      code: codec({ parts: 'decipher.update(bytes)' }),
      errors: bomb,
    },
    {
      name: 'a part that is not a decipher step still reports',
      code: codec({ parts: 'decipher.final(), extra' }),
      errors: bomb,
    },
    {
      name: 'a hole in the parts still reports',
      code: codec({ parts: ', decipher.final()' }),
      errors: bomb,
    },
    {
      name: 'a step that is not update or final still reports',
      code: codec({ parts: 'decipher.final(), decipher.getAuthTag()' }),
      errors: bomb,
    },
    {
      name: 'a call on a member receiver still reports',
      code: codec({ parts: 'this.d.final(), decipher.final()' }),
      errors: bomb,
    },
    {
      name: 'a final() from a second decipher still reports',
      code: codec({
        parts: 'other.update(bytes), decipher.final()',
        tag: 'decipher.setAuthTag(t); const other = createDecipheriv("aes-256-gcm", key, iv); other.setAuthTag(t);',
      }),
      errors: bomb,
    },
    {
      name: 'a later write of raw bytes still reports',
      code: codec({ extra: 'if (raw) plaintext = bytes;' }),
      errors: bomb,
    },
    {
      name: 'a decipher reassigned still reports',
      code: codec({
        tag: 'decipher.setAuthTag(t); decipher = makeDecipher();',
      }).replace('const decipher', 'let decipher'),
      errors: bomb,
    },
    {
      name: 'a createDecipheriv that is not node:crypto still reports',
      code: codec().replace("from 'node:crypto'", "from './crypto'"),
      errors: bomb,
    },
    {
      name: 'a Buffer.concat of a non-array still reports',
      code: codec({ extra: 'plaintext = Buffer.concat(list);' }),
      errors: bomb,
    },
    {
      name: 'another call on the plaintext still reports',
      code: codec({ extra: 'plaintext = plaintext.reverse();' }),
      errors: bomb,
    },
    {
      name: 'a write read from a cache still reports',
      code: codec({ extra: 'plaintext = cache[k];' }),
      errors: bomb,
    },
    {
      name: 'a plain function call still reports',
      code: codec({ extra: 'plaintext = load();' }),
      errors: bomb,
    },
    {
      name: 'a parameter is never authenticated',
      code: `${HEAD}export function f(body: Buffer) { return inflateRawSync(body); }`,
      errors: bomb,
    },
    {
      name: 'a declared but never written binding is not authenticated',
      code: `${HEAD}export function f() { let body; return inflateRawSync(body); }`,
      errors: bomb,
    },
    {
      name: 'a decipher that is a parameter still reports',
      code: `${HEAD}export function f(d) { d.setAuthTag(t); const body = Buffer.concat([d.final()]); return inflateRawSync(body); }`,
      errors: bomb,
    },
    {
      name: 'a decipher built by a non-call still reports',
      code: `${HEAD}export function f() { const d = cache.d; d.setAuthTag(t); const body = Buffer.concat([d.final()]); return inflateRawSync(body); }`,
      errors: bomb,
    },
    {
      name: 'a decipher with no algorithm argument still reports',
      code: `${HEAD}export function f() { const d = createDecipheriv(); d.setAuthTag(t); const body = Buffer.concat([d.final()]); return inflateRawSync(body); }`,
      errors: bomb,
    },
    {
      name: 'a chain past the walk depth still reports',
      code: `${HEAD}export function f(p) { const a = p; const b = a; const c = b; const d = c; const e = d; const g = e; const h = g; const i = h; const j = i; return inflateRawSync(j); }`,
      errors: bomb,
    },
  ],
});
