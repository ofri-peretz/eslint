/**
 * Tests for no-unbounded-decompression
 * CWE-409: Improper Handling of Highly Compressed Data (Decompression Bomb)
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const REQUIRE = `const zlib = require('zlib');\n`;

describe('no-unbounded-decompression', () => {
  ruleTester.run('no-unbounded-decompression', noUnboundedDecompression, {
    valid: [
      // benchmarks/corpus/CWE-409/safe/gunzip-limited.js — the cap is present.
      {
        name: 'maxOutputLength is set',
        code: `${REQUIRE}zlib.gunzip(reqBody, { maxOutputLength: MAX }, cb);`,
      },
      { code: `${REQUIRE}zlib.gunzipSync(body, { maxOutputLength: 1024 });` },
      { code: `${REQUIRE}zlib.gunzipSync(body, { 'maxOutputLength': 1024 });` },
      // Options this rule cannot read may already carry the cap.
      { code: `${REQUIRE}zlib.gunzip(body, opts, cb);` },
      { code: `${REQUIRE}zlib.gunzipSync(body, { ...defaults });` },
      { code: `${REQUIRE}zlib.gunzipSync(body, a, b);` },
      // Compression, not decompression — no bomb to absorb.
      { code: `${REQUIRE}zlib.gzip(body, cb);` },
      { code: `${REQUIRE}zlib.deflateSync(body);` },
      // Streaming factories belong to
      // `secure-coding/no-unlimited-resource-allocation` (rule partition).
      { code: `${REQUIRE}zlib.createGunzip();` },
      // A literal payload is not attacker-steerable.
      { code: `${REQUIRE}zlib.gunzipSync('H4sIAAAA');` },
      { code: `${REQUIRE}zlib.gunzipSync(Buffer.from('H4sIAAAA', 'base64'));` },
      // Not zlib: a local helper that merely reads like one.
      { code: `gunzip(body, cb);` },
      { code: `const zlib = require('fs'); zlib.gunzip(body, cb);` },
      { code: `const zlib = other('zlib'); zlib.gunzip(body, cb);` },
      { code: `const zlib = a.require('zlib'); zlib.gunzip(body, cb);` },
      { code: `const zlib = require(name); zlib.gunzip(body, cb);` },
      { code: `const zlib = require(1); zlib.gunzip(body, cb);` },
      { code: `const zlib = 5; zlib.gunzip(body, cb);` },
      { code: `let zlib; zlib.gunzip(body, cb);` },
      { code: `import fs from 'fs'; fs.gunzip(body, cb);` },
      { code: `import { constants } from 'zlib'; constants(body, cb);` },
      { code: `const [zlib] = require('zlib'); zlib.gunzip(body, cb);` },
      { code: `const { ...rest } = require('zlib'); rest.gunzip(body, cb);` },
      { code: `const { ['gunzip']: g } = require('zlib'); g(body, cb);` },
      { code: `const { gunzip: { g } } = require('zlib'); g(body, cb);` },
      // Not a resolvable callee shape: the method is named at runtime.
      { code: `${REQUIRE}zlib[method](body, cb);` },
      { code: `${REQUIRE}zlib[fn](body, cb);` },
      { code: `${REQUIRE}a.b.gunzip(body, cb);` },
      { code: `${REQUIRE}getZlib().gunzip(body, cb);` },
      // Malformed / non-API call shapes.
      { code: `${REQUIRE}zlib.gunzip(body);` },
      { code: `${REQUIRE}zlib.gunzipSync();` },
      // Payload shapes that are not literal blobs but also not Buffer.from().
      { code: `${REQUIRE}zlib.gunzipSync(Buffer.from(body), { maxOutputLength: 1 });` },
      { code: `${REQUIRE}zlib.gunzipSync(Buffer.from(), { maxOutputLength: 1 });` },
      { code: `${REQUIRE}zlib.gunzipSync(a.b.from('x'), { maxOutputLength: 1 });` },
      { code: `${REQUIRE}zlib.gunzipSync(other.from('x'), { maxOutputLength: 1 });` },
      { code: `${REQUIRE}zlib.gunzipSync(read(), { maxOutputLength: 1 });` },
      { code: `${REQUIRE}zlib.gunzipSync(body, { [key]: 1, maxOutputLength: 1 });` },
      // allowInTests bypass.
      {
        name: 'gunzip with no maxOutputLength cap',
        code: `${REQUIRE}zlib.gunzip(body, cb);`,
        options: [{ allowInTests: true }],
        filename: 'inflate.test.ts',
      },
    ],
    invalid: [
      // LOCK: benchmarks/corpus/CWE-409/vulnerable/gunzip-no-limit.js
      // `zlib.gunzip(reqBody, cb)` buffers the whole expansion — a few KB of
      // crafted gzip becomes gigabytes of heap.
      {
        name: 'gunzip on request bytes with no output limit',
        code: `${REQUIRE}zlib.gunzip(reqBody, (err, buf) => cb(err, buf));`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      { code: `${REQUIRE}zlib.gunzipSync(body);`, errors: [{ messageId: 'unboundedDecompression' }] },
      // Was pinned as valid — "not a resolvable callee shape". `zlib['gunzip']`
      // names `gunzip` and buffers the same uncapped output.
      {
        name: 'a subscripted gunzip is the same uncapped decompression',
        code: `${REQUIRE}zlib['gunzip'](body, cb);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      { code: `${REQUIRE}zlib.inflate(body, cb);`, errors: [{ messageId: 'unboundedDecompression' }] },
      { code: `${REQUIRE}zlib.brotliDecompressSync(body);`, errors: [{ messageId: 'unboundedDecompression' }] },
      // `node:zlib` is the same module.
      {
        code: `const z = require('node:zlib'); z.unzipSync(body);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      // Namespace and default imports.
      {
        code: `import zlib from 'zlib'; zlib.inflateRawSync(body);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      {
        code: `import * as zlib from 'node:zlib'; zlib.zstdDecompressSync(body);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      // Direct bindings — the local name is irrelevant, the export is not.
      {
        code: `import { gunzipSync as inflateIt } from 'zlib'; inflateIt(body);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      {
        code: `import { 'gunzipSync' as inflateIt } from 'zlib'; inflateIt(body);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      {
        code: `const { gunzip: gz } = require('zlib'); gz(body, cb);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      // Options present but carrying no ceiling.
      {
        code: `${REQUIRE}zlib.gunzip(body, { chunkSize: 4096 }, cb);`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      {
        code: `${REQUIRE}zlib.gunzipSync(body, { 'chunkSize': 4096 });`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      {
        code: `${REQUIRE}zlib.gunzipSync(body, { [key]: 4096 });`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      // The binding is declared AFTER the call site in source order — the
      // judgement runs at Program:exit precisely so this still resolves.
      {
        code: `function f(body) { return zlib.gunzipSync(body); }\n${REQUIRE}`,
        errors: [{ messageId: 'unboundedDecompression' }],
      },
      // allowInTests: true but NOT a test file — the bypass must not leak.
      {
        code: `${REQUIRE}zlib.gunzip(body, cb);`,
        options: [{ allowInTests: true }],
        filename: 'inflate.ts',
        errors: [{ messageId: 'unboundedDecompression' }],
      },
    ],
  });
});
