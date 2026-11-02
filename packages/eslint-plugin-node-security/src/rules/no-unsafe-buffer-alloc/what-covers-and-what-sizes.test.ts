/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Claims about the two halves of this rule that the main suite left unpinned:
 * which writes cover an `allocUnsafe` buffer before it is read (CWE-908), and
 * which expressions size an allocation off the wire (CWE-789).
 *
 * Every case states one claim in its `name`. The `FP:` / `FN:` cases were
 * wrong before the change that added them.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeBufferAlloc } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** Every fixed-width writer, laid end to end at literal offsets. */
const EVERY_FIXED_WIDTH_WRITER: readonly (readonly [string, number])[] = [
  ['writeUInt8', 1],
  ['writeInt8', 1],
  ['writeUInt16LE', 2],
  ['writeUInt16BE', 2],
  ['writeInt16LE', 2],
  ['writeInt16BE', 2],
  ['writeUInt32LE', 4],
  ['writeUInt32BE', 4],
  ['writeInt32LE', 4],
  ['writeInt32BE', 4],
  ['writeFloatLE', 4],
  ['writeFloatBE', 4],
  ['writeDoubleLE', 8],
  ['writeDoubleBE', 8],
  ['writeBigInt64LE', 8],
  ['writeBigInt64BE', 8],
  ['writeBigUInt64LE', 8],
  ['writeBigUInt64BE', 8],
];

function headerStampedByEveryWriter(): string {
  let offset = 0;
  const writes: string[] = [];
  for (const [method, width] of EVERY_FIXED_WIDTH_WRITER) {
    writes.push(`h.${method}(fields.${method}, ${offset});`);
    offset += width;
  }
  return `function header(fields) {
    const h = Buffer.allocUnsafe(${offset});
    ${writes.join('\n    ')}
    return h;
  }`;
}

/** `n = n + n`, repeated: each write reads the binding twice. */
function doubledInPlace(times: number): string {
  return `function grow(req) {
    let n = 1;
    ${'n = n + n;\n    '.repeat(times)}return Buffer.alloc(n);
  }`;
}

ruleTester.run(
  'no-unsafe-buffer-alloc — what covers a buffer',
  noUnsafeBufferAlloc,
  {
    valid: [
      {
        name: 'a header stamped with every fixed-width writer at literal offsets is covered',
        code: headerStampedByEveryWriter(),
      },
      {
        name: 'a one-argument writeUInt32BE on a four-byte buffer writes all four bytes',
        code: `function frame(len) { const h = Buffer.allocUnsafe(4); h.writeUInt32BE(len); return h; }`,
      },
      {
        // @found mutation testing
        name: 'FP: a header stamped at named constant offsets is as decidable as at literal ones',
        code: `const TYPE_OFFSET = 0;
       const LENGTH_OFFSET = 4;
       function header(type, len) {
         const h = Buffer.allocUnsafe(8);
         h.writeUInt32BE(type, TYPE_OFFSET);
         h.writeUInt32BE(len, LENGTH_OFFSET);
         return h;
       }`,
      },
      {
        // @found mutation testing
        name: 'FP: write(s, encoding) starts at offset 0, the same as the one-argument idiom',
        code: `function encode(s) { const b = Buffer.allocUnsafe(Buffer.byteLength(s, 'utf8')); b.write(s, 'utf8'); return b; }`,
      },
      {
        // @found mutation testing
        name: 'FP: fill(v, encoding) fills to the end, the same as fill(v)',
        code: `function pad(n) { const b = Buffer.allocUnsafe(n); b.fill('00', 'hex'); return b; }`,
      },
      {
        name: 'a do-while loop at a moving offset walks the buffer',
        code: `function pack(values) {
         const out = Buffer.allocUnsafe(values.length);
         let i = 0;
         do { out.writeUInt8(values[i], i); i++; } while (i < values.length);
         return out;
       }`,
      },
      {
        name: 'a for-in loop at a moving offset walks the buffer',
        code: `function pack(fields, size) {
         const out = Buffer.allocUnsafe(size);
         let pos = 0;
         for (const key in fields) { out.writeUInt32BE(fields[key], pos); pos += 4; }
         return out;
       }`,
      },
      {
        // @found mutation testing
        name: 'FP: getRandomValues imported from node:crypto fills its argument',
        code: `import { getRandomValues } from 'node:crypto';
       export function nonce() { const n = Buffer.allocUnsafe(12); getRandomValues(n); return n; }`,
      },
      {
        // @found mutation testing
        name: 'FP: crypto.getRandomValues fills its argument',
        code: `export function iv() { const v = Buffer.allocUnsafe(16); crypto.getRandomValues(v); return v; }`,
      },
      {
        // @found mutation testing
        name: 'FP: a lazily created scratch buffer (??=) is judged by its first use like any assignment',
        code: `let scratch;
       export function bits(v) {
         scratch ??= Buffer.allocUnsafe(8);
         scratch.writeDoubleBE(v, 0);
         return scratch.readBigUInt64BE(0);
       }`,
      },
      {
        name: 'an assignment in one branch is not a read of the allocation in the other',
        code: `function encode(kind) {
         let buf;
         if (kind === 'point') { buf = Buffer.allocUnsafe(4); buf.fill(0); }
         else { buf = Buffer.allocUnsafe(8); buf.fill(0); }
         return buf;
       }`,
      },
      {
        name: 'calling an alias of Buffer as a function is not allocUnsafe',
        code: `const LegacyBuffer = Buffer; export const zeroed = LegacyBuffer(16);`,
      },
      {
        name: 'a Buffer hanging off a polyfill object is out of scope',
        code: `import polyfill from 'buffer-polyfill'; export const b = polyfill.Buffer.allocUnsafe(8);`,
      },
      {
        name: 'a Buffer off a module loaded by something other than require is out of scope',
        code: `export const b = loadPolyfill('buffer').Buffer.allocUnsafe(8);`,
      },
    ],
    invalid: [
      {
        // @found mutation testing
        name: 'FN: fill from an offset leaves the bytes before it uninitialized',
        code: `function f(socket) { const b = Buffer.allocUnsafe(16); b.fill(0, 4); socket.write(b); }`,
        errors: 1,
      },
      {
        name: 'a one-argument writeUInt32BE on a sixteen-byte header writes only four bytes',
        code: `function f(len, socket) { const h = Buffer.allocUnsafe(16); h.writeUInt32BE(len); socket.write(h); }`,
        errors: 1,
      },
      {
        name: 'a four-byte write leaves the fifth byte of a five-byte buffer uninitialized',
        code: `function f(len, socket) { const h = Buffer.allocUnsafe(5); h.writeUInt32BE(len, 0); socket.write(h); }`,
        errors: 1,
      },
      {
        name: 'a literal offset inside a loop stamps the same field on every pass',
        code: `function f(msgs, sock) {
         for (const m of msgs) { const h = Buffer.allocUnsafe(16); h.writeUInt32BE(m.len, 0); sock.write(h); }
       }`,
        errors: 1,
      },
      {
        name: 'a string written at a literal offset inside a loop leaves the bytes before it',
        code: `function f(names, out) {
         for (const s of names) { const b = Buffer.allocUnsafe(64); b.write(s, 2); out.push(b); }
       }`,
        errors: 1,
      },
      {
        name: 'a literal index inside a loop stamps one byte on every pass',
        code: `function f(msgs, sock) {
         for (const m of msgs) { const b = Buffer.allocUnsafe(4); b[0] = m.type; sock.write(b); }
       }`,
        errors: 1,
      },
      {
        name: 'a write at a computed offset covers no decidable bytes',
        code: `function f(len, pos, type, socket) {
         const h = Buffer.allocUnsafe(4);
         h.writeUInt32BE(len, pos);
         h.writeUInt8(type, 0);
         socket.write(h);
       }`,
        errors: 1,
      },
      {
        name: 'a copy into the middle of a header leaves its start uninitialized',
        code: `function f(src, socket) { const b = Buffer.allocUnsafe(8); src.copy(b, 4); socket.write(b); }`,
        errors: 1,
      },
      {
        name: 'summing the bytes in a loop reads them',
        code: `function checksum(n) {
         const b = Buffer.allocUnsafe(n);
         let sum = 0;
         for (let i = 0; i < n; i++) sum = b[i] + sum;
         return sum;
       }`,
        errors: 1,
      },
      {
        name: 'assigning a byte to a variable in a loop reads it',
        code: `function lastByte(n) {
         const b = Buffer.allocUnsafe(n);
         let last;
         for (let i = 0; i < n; i++) last = b[i];
         return last;
       }`,
        errors: 1,
      },
      {
        name: 'createSecretKey from node:crypto reads its argument',
        code: `import { createSecretKey } from 'node:crypto';
       const raw = Buffer.allocUnsafe(32);
       export const key = createSecretKey(raw);`,
        errors: 1,
      },
      {
        name: 'a local function that happens to be called randomFillSync is not the crypto filler',
        code: `function randomFillSync(b) { log(b.toString('hex')); }
       const id = Buffer.allocUnsafe(16);
       randomFillSync(id);
       send(id);`,
        errors: 1,
      },
      {
        name: 'a randomFillSync built by a factory is not the crypto filler',
        code: `const randomFillSync = makeFiller();
       const id = Buffer.allocUnsafe(16);
       randomFillSync(id);
       send(id);`,
        errors: 1,
      },
      {
        name: 'a randomFillSync destructured off a non-module binding is not the crypto filler',
        code: `const { randomFillSync } = cryptoShim;
       const id = Buffer.allocUnsafe(16);
       randomFillSync(id);
       send(id);`,
        errors: 1,
      },
      {
        name: 'a randomFillSync off a module loaded by something other than require is not the crypto filler',
        code: `const { randomFillSync } = loadPolyfill('crypto');
       const id = Buffer.allocUnsafe(16);
       randomFillSync(id);
       send(id);`,
        errors: 1,
      },
    ],
  },
);

ruleTester.run(
  'no-unsafe-buffer-alloc — what sizes an allocation',
  noUnsafeBufferAlloc,
  {
    valid: [
      {
        name: 'a guard clause in an arrow handler bounds the size',
        code: `app.get('/a', (req, res) => {
         const n = Number(req.query.n);
         if (n > 1024) return res.end();
         res.send(Buffer.alloc(n));
       });`,
      },
      {
        name: 'a guard clause in a function-expression handler bounds the size',
        code: `app.get('/a', function (req, res) {
         const n = Number(req.query.n);
         if (n > 1024) return res.end();
         res.send(Buffer.alloc(n));
       });`,
      },
      {
        name: 'an enclosing comparison nested below the function body bounds the size',
        code: `function h(req) {
         const n = Number(req.query.n);
         if (req.method === 'POST') { if (n <= 4096) { return Buffer.alloc(n); } }
       }`,
      },
      {
        name: 'a write after the allocation does not size it',
        code: `function h(req) {
         let cap = 1024;
         const b = Buffer.alloc(cap);
         cap = Number(req.query.cap);
         return b;
       }`,
      },
      {
        name: 'a payload passed through a decoder named mid-word is copied, not sized',
        code: `function f(chunk) { return new Uint8Array(base64Decode(chunk)); }`,
      },
      {
        name: 'copying a sub-view of a wire buffer is not an allocation size',
        code: `function f(chunk) { return new Uint8Array(chunk.subarray(4)); }`,
      },
      {
        name: 'a cast payload is copied, not sized',
        code: `function f(chunk: Buffer) { return new Uint8Array(chunk as Uint8Array); }`,
      },
      {
        name: 'a wire value passed in one parameter does not taint a sibling parameter',
        code: `function alloc(header, n) { return new Array(n); }
       function decode(chunk) { return alloc(chunk.readUInt32BE(0), 16); }`,
      },
      {
        name: 'the configured global Buffer is the namespace, not wire data',
        code: `function f(json) { return Buffer.alloc(Buffer.byteLength(json)); }`,
        languageOptions: { globals: { Buffer: 'readonly' } },
      },
      {
        // @found mutation testing
        name: 'FP: a wire-named let assigned a local value is followed, not trusted by its name',
        code: `function build(meta) { let chunk; chunk = encodeChunk(meta); return new Uint8Array(chunk.length + 12); }`,
      },
      {
        name: 'a value doubled in place many times is resolved in linear time',
        code: doubledInPlace(40),
      },
    ],
    invalid: [
      {
        name: 'a chunk iterated off a stream is wire data: its origin is the stream’s elements',
        code: `async function decode(socket) {
         for await (const chunk of socket) { return new Array(chunk.readUInt32BE(0)); }
       }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'Math.max is a floor, not a clamp',
        code: `function h(req) { return Buffer.alloc(Math.max(Number(req.query.n), 16)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'Math.max of a length prefix sizes an array',
        code: `function decode(chunk) { return new Array(Math.max(chunk.readUInt32BE(0), 1)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'parseInt of a query parameter is not a clamp',
        code: `function h(req) { return Buffer.alloc(parseInt(req.query.n, 10)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'a spread operand proves no bound: the array may be empty',
        code: `function h(req, limits) { return Buffer.alloc(Math.min(...limits, Number(req.query.n))); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'an unrelated logical test is not a guard on the size',
        code: `function h(req) {
         const n = Number(req.query.n);
         if (debug && verbose) log(n);
         return Buffer.alloc(n);
       }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'a module-level allocation sized off an imported frame is not clamped',
        code: `import { frame } from './connection.js';
       const len = frame.readUInt32BE(0);
       export const body = Buffer.alloc(len);`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'a size read off a URL built from the request is the peer’s',
        code: `function h(req) {
         const url = new URL(req.url, 'http://localhost');
         const size = Number(url.searchParams.get('size'));
         return Buffer.alloc(size);
       }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'a pre-class constructor function receives the length through new',
        code: `function Frame(len) { this.items = new Array(len); }
       function decode(chunk) { return new Frame(chunk.readUInt32BE(0)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        // @found mutation testing
        name: 'FN: a class constructor receives the length through new',
        code: `class Frame { constructor(len) { this.items = new Array(len); } }
       function decode(chunk) { return new Frame(chunk.readUInt32BE(0)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        // @found mutation testing
        name: 'FN: an anonymous class constructor is called by the binding it is assigned to',
        code: `const Frame = class { constructor(len) { this.items = new Array(len); } };
       function decode(chunk) { return new Frame(chunk.readUInt32BE(0)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'a named function expression is called by its binding name',
        code: `const decodeItems = function decodeItemsImpl(len) { return new Array(len); };
       function decode(chunk) { return decodeItems(chunk.readUInt32BE(0)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        // @found mutation testing
        name: 'FN: a parameter with a default value still receives the wire length',
        code: `function alloc(len = 16) { return new Array(len); }
       function decode(chunk) { return alloc(chunk.readUInt32BE(0)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        // @found mutation testing
        name: 'FN: Array(n) called without new allocates the same as new Array(n)',
        code: `function decode(chunk) { return Array(chunk.readUInt32BE(0)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: "a length prefix read through a computed key chunk['readUInt32BE'](0) is the same read",
        code: `function decode(chunk) { return new Array(chunk['readUInt32BE'](0)); }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        name: 'a length prefix read through a template-literal key is the same read',
        code: 'function decode(chunk) { return new Array(chunk[`readUInt32BE`](0)); }',
        errors: [{ messageId: 'unboundedAllocation' }],
      },
      {
        // @found mutation testing
        name: 'FN: a size passed through twelve local bindings is still the peer’s',
        code: `function h(req) {
         const a1 = req.query.size; const a2 = a1; const a3 = a2; const a4 = a3;
         const a5 = a4; const a6 = a5; const a7 = a6; const a8 = a7;
         const a9 = a8; const a10 = a9; const a11 = a10; const a12 = a11;
         return Buffer.alloc(a12);
       }`,
        errors: [{ messageId: 'unboundedAllocation' }],
      },
    ],
  },
);
