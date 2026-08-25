/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `let buf; buf = Buffer.allocUnsafe(n)` is the same buffer as `const buf =`.
 *
 * Hand-verification run 2026-08-24 against
 * mariadb-corporation/mariadb-connector-nodejs — 38 findings, the single
 * largest block in that scan, and every one of them a buffer the
 * covering-write analysis would have cleared.
 *
 * `lib/cmd/encoder/binary-encoder.js` declares `geoBuff` once and assigns it in
 * each geometry arm:
 *
 *   geoBuff = Buffer.allocUnsafe(9 + size);
 *   geoBuff.writeInt8(0x01, 0);
 *   geoBuff.writeInt32LE(3, 1);
 *   geoBuff.writeInt32LE(numRings, 5);
 *   pos = 9;
 *   for (…) { geoBuff.writeInt32LE(lineString.length, pos); pos += 4; … }
 *
 * Fixed offsets covering 0–8, then a moving-offset loop covering the rest —
 * both shapes the rule already recognises. It never looked, because
 * `isCoveredBeforeRead` accepted only a `VariableDeclarator`, and an
 * allocation inside a branch is written as an assignment to a binding declared
 * above it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeBufferAlloc } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-unsafe-buffer-alloc — an assigned binding is still a binding',
  noUnsafeBufferAlloc,
  {
    valid: [
      // The corpus shape.
      `function encode(value) {
         let geoBuff, pos;
         geoBuff = Buffer.allocUnsafe(9 + size);
         geoBuff.writeInt8(0x01, 0);
         geoBuff.writeInt32LE(3, 1);
         geoBuff.writeInt32LE(numRings, 5);
         pos = 9;
         for (const ring of value.coordinates) {
           geoBuff.writeInt32LE(ring.length, pos);
           pos += 4;
         }
         return geoBuff;
       }`,
      // An index-assignment loop is the same walk `writeUInt8(v, pos)`
      // performs — mariadb's native-password and sha256 auth XOR loops.
      `function f(stage1, digest) {
         let returnBytes = Buffer.allocUnsafe(digest.length);
         for (let i = 0; i < digest.length; i++) {
           returnBytes[i] = stage1[i] ^ digest[i];
         }
         return returnBytes;
       }`,
      // A whole-buffer copy through an assigned binding.
      `function f(src) { let b; b = Buffer.allocUnsafe(src.length); src.copy(b); return b; }`,
    ],
    invalid: [
      // The real defect is unchanged: a fixed-offset write leaving the rest
      // uninitialized, on an assigned binding as much as a declared one.
      {
        code: `function f() { let header; header = Buffer.allocUnsafe(16); header.writeUInt32BE(len, 0); socket.write(header); }`,
        errors: 1,
      },
      // A LITERAL index is one byte stamped, not a walk — still partial.
      {
        code: `function f() { const b = Buffer.allocUnsafe(16); b[0] = 1; socket.write(b); }`,
        errors: 1,
      },
      // And an index assignment outside a loop is a single byte too.
      {
        code: `function f(i) { const b = Buffer.allocUnsafe(16); b[i] = 1; socket.write(b); }`,
        errors: 1,
      },
      // An assignment to a name with no binding in scope — an implicit global
      // — resolves to nothing, so there are no references to walk and the
      // allocation cannot be cleared.
      {
        code: `function f() { undeclaredBuf = Buffer.allocUnsafe(16); socket.write(undeclaredBuf); }`,
        errors: 1,
      },
      // Writes BEFORE the allocation belong to the previous value and must not
      // clear this one.
      {
        code: `function f(src) { let b = Buffer.alloc(4); src.copy(b); b = Buffer.allocUnsafe(64); socket.write(b); }`,
        errors: 1,
      },
    ],
  },
);
