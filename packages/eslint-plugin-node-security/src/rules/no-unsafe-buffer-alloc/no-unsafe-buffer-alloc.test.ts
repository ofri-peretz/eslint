import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeBufferAlloc } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-unsafe-buffer-alloc', () => {
  ruleTester.run('no-unsafe-buffer-alloc', noUnsafeBufferAlloc, {
    valid: [
      // The safe allocator.
      { code: 'Buffer.alloc(1024)' },
      { code: 'Buffer.from("hello")' },
      { code: 'Buffer.concat([a, b])' },
      // Structural exemption: zeroed in the same expression.
      { code: 'const buf = Buffer.allocUnsafe(64).fill(0);' },
      { code: 'Buffer.allocUnsafeSlow(64).fill(0);' },
      // Not the global Buffer.
      { code: 'pool.allocUnsafe(64)' },
      { code: 'allocUnsafe(64)' },
      // Computed access is not resolved (documented false negative).
      { code: 'Buffer["allocUnsafe"](64)' },
      // Member read without a call.
      { code: 'const fn = Buffer.allocUnsafe;' },
      // Unrelated Buffer members.
      { code: 'Buffer.byteLength("hi")' },
      { code: 'Buffer.isBuffer(x)' },

      // ── FP lock: covered before it is ever read ──────────────────────────
      //
      // Corpus: redis/ioredis `lib/Command.ts:667`
      //   const result = Buffer.allocUnsafe(this.length);
      //   let offset = 0;
      //   for (const item of this.items) { … item.copy(result, offset) … }
      //   return result;
      //
      // `this.length` is maintained as the exact byte sum of `this.items`, so
      // the loop writes every byte before `result` escapes. On the OLD
      // predicate — which had no variable tracking at all and exempted only a
      // same-expression `.fill()` — every case below reported.
      {
        code: `
          class MixedBuffers {
            toBuffer() {
              const result = Buffer.allocUnsafe(this.length);
              let offset = 0;
              for (const item of this.items) {
                const length = Buffer.byteLength(item);
                Buffer.isBuffer(item)
                  ? item.copy(result, offset)
                  : result.write(item, offset, length);
                offset += length;
              }
              return result;
            }
          }
        `,
      },
      // The whole-buffer copy idiom, with and without a receiver form.
      { code: 'const b = Buffer.allocUnsafe(src.length); src.copy(b); send(b);' },
      { code: 'const b = Buffer.allocUnsafe(n); b.set(src); send(b);' },
      { code: 'const b = Buffer.allocUnsafe(n); b.fill(0); send(b);' },
      { code: 'const b = Buffer.allocUnsafe(n); crypto.randomFillSync(b); send(b);' },
      // A moving offset inside a `while` covers the buffer just as a `for` does.
      {
        code: 'const b = Buffer.allocUnsafe(n); let o = 0; while (o < n) { b.write(s, o); o += 1; } send(b);',
      },
      // Metadata reads disclose nothing, so they do not end the scan.
      { code: 'const b = Buffer.allocUnsafe(n); log(b.length); src.copy(b); send(b);' },
      // A partial write is not a read either — it keeps the scan going until a
      // covering write settles it.
      { code: 'const b = Buffer.allocUnsafe(n); b.writeUInt8(1, 0); src.copy(b); send(b);' },
      { code: 'const b = Buffer.allocUnsafe(n); b[0] = 1; src.copy(b); send(b);' },
    ],
    invalid: [
      {
        code: 'const buf = Buffer.allocUnsafe(1024);',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'const buf = Buffer.alloc(1024);',
              },
            ],
          },
        ],
      },
      {
        code: 'Buffer.allocUnsafe(userSize)',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              { messageId: 'useSafeAlloc', output: 'Buffer.alloc(userSize)' },
            ],
          },
        ],
      },
      {
        code: 'const buf = Buffer.allocUnsafeSlow(64);',
        errors: [
          {
            messageId: 'unsafeAllocSlow',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'const buf = Buffer.alloc(64);',
              },
            ],
          },
        ],
      },
      // `.fill` referenced but not invoked — the buffer is never zeroed.
      {
        code: 'const f = Buffer.allocUnsafe(64).fill;',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'const f = Buffer.alloc(64).fill;',
              },
            ],
          },
        ],
      },
      // `.fill` passed around instead of invoked.
      {
        code: 'schedule(Buffer.allocUnsafe(64).fill);',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'schedule(Buffer.alloc(64).fill);',
              },
            ],
          },
        ],
      },
      // Computed `.fill` access does not exempt.
      {
        code: 'Buffer.allocUnsafe(64)["fill"](0);',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'Buffer.alloc(64)["fill"](0);',
              },
            ],
          },
        ],
      },
      // A different chained method is not `.fill`.
      {
        code: 'Buffer.allocUnsafe(64).write("hi");',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'Buffer.alloc(64).write("hi");',
              },
            ],
          },
        ],
      },
      // `.fill` on the *argument* position, not the object.
      {
        code: 'target.fill(Buffer.allocUnsafe(64));',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'target.fill(Buffer.alloc(64));',
              },
            ],
          },
        ],
      },
      // No arguments at all.
      {
        code: 'Buffer.allocUnsafe();',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              { messageId: 'useSafeAlloc', output: 'Buffer.alloc();' },
            ],
          },
        ],
      },
    ],
  });

  // ── The covered-before-read exemption must not become a blanket pass ───
  //
  // Every case here has a write in it. None of them proves coverage, so all of
  // them still report — this is the FN guard on the FP fix above, and it is
  // the difference between "some byte is written" and "every byte is".
  describe('Covered Before Read — the cases that are NOT covered', () => {
    /** One `unsafeAlloc` report whose suggestion swaps in the safe allocator. */
    const stillReports = (code: string) => ({
      code,
      errors: [
        {
          messageId: 'unsafeAlloc' as const,
          suggestions: [
            {
              messageId: 'useSafeAlloc' as const,
              output: code.replace('allocUnsafe', 'alloc'),
            },
          ],
        },
      ],
    });

    ruleTester.run('partial and unresolved writes', noUnsafeBufferAlloc, {
      valid: [],
      invalid: [
        // The docs' own ❌ example: 4 of 16 bytes written at a FIXED offset,
        // then the whole thing goes out on the wire.
        stillReports('const header = Buffer.allocUnsafe(16); header.writeUInt32BE(len, 0); socket.write(header);'),
        // A moving offset, but not in a loop — one write, one place.
        stillReports('const b = Buffer.allocUnsafe(n); b.write(s, off); send(b);'),
        // Read first, written after: the disclosure has already happened.
        stillReports('const b = Buffer.allocUnsafe(n); send(b); src.copy(b);'),
        // Allocated and never touched again.
        stillReports('const b = Buffer.allocUnsafe(n);'),
        // Not a local binding at all — the buffer leaves this file's view.
        stillReports('this.buf = Buffer.allocUnsafe(n);'),
        stillReports('function f() { return Buffer.allocUnsafe(n); }'),
        stillReports('const [b] = [Buffer.allocUnsafe(n)]; src.copy(b);'),
        // A method call that is not a write, and a computed read.
        stillReports('const b = Buffer.allocUnsafe(n); b.toString("hex");'),
        stillReports('const b = Buffer.allocUnsafe(n); send(b[0]);'),
        // A write METHOD referenced without being invoked.
        stillReports('const b = Buffer.allocUnsafe(n); schedule(b.fill);'),
        // A private-name member, which is not an Identifier property.
        stillReports('class C { #x; m() { const b = Buffer.allocUnsafe(n); return b.#x; } }'),
        // First argument of a call that does not write through it.
        stillReports('const b = Buffer.allocUnsafe(n); hash.update(b);'),
        stillReports('const b = Buffer.allocUnsafe(n); send(b);'),
        stillReports('const b = Buffer.allocUnsafe(n); obj[m](b);'),
        // Not the first argument, so not the destination of a copy either.
        stillReports('const b = Buffer.allocUnsafe(n); send(x, b);'),
        // `copy` at a fixed destination offset covers one fixed slice.
        stillReports('const b = Buffer.allocUnsafe(n); src.copy(b, 0, 0, 4); send(b);'),
      ],
    });
  });

  // ── FALSE NEGATIVE CLOSED: CWE-789 ─────────────────────────────────────
  // `redis/ioredis` `lib/resp/decoder.ts:669,735,803` allocates an array whose
  // length is a RESP length prefix — a number the peer chose — and nothing in
  // the file bounds it. It was unreported: at the allocation the size is only a
  // parameter, so seeing it needs one hop back to the call site.
  describe('Allocation Sized By The Wire', () => {
    ruleTester.run('unbounded allocation', noUnsafeBufferAlloc, {
      valid: [
        // A literal size is chosen by the author.
        'const a = new Array(16);',
        'const b = Buffer.alloc(1024);',
        // Clamped outright.
        'function decode(chunk) { const length = readLen(chunk); return new Array(Math.min(length, MAX)); }',
        // Clamped by a guard clause on the same identifier.
        `function decodeArrayWithLength(length, chunk) {
           if (length > MAX_LENGTH) throw new Error('too long');
           return new Array(length);
         }
         function decodeArray(chunk) { return decodeArrayWithLength(readLen(chunk), chunk); }`,
        // A local array whose size comes from the program, not the connection.
        'function build(items) { return new Array(items.length); }',
        // Mutually-recursive bindings terminate at the depth limit instead of
        // blowing the stack. Following a size through locals is what makes the
        // HTTP fixtures reachable, and it is what makes a cycle possible.
        'const a = b; const b = a; Buffer.alloc(a);',
        // looksNumeric: every shape that is NOT a count.
        'function d(chunk) { return new Array(chunk); }',
        'function d(chunk) { return new Array("8"); }',
        'function d(chunk) { return new Array(chunk === 1); }',
        'function d(chunk) { return new Array(chunk.payload); }',
        'function d(chunk) { return new Array(chunk[0]); }',
        'function d(chunk) { return new Array(wrap(chunk)); }',
        'function d(chunk) { return new Array(chunk ? 1 : 2); }',
        // allocationSize: no argument at all, a spread argument, a constructor
        // that is not an allocator, and a Buffer method that is not an alloc.
        'function d(chunk) { return new Array(); }',
        'function d(chunk) { return new Array(...chunk); }',
        'function d(chunk) { return new Widget(chunk.length); }',
        'function d(chunk) { return Buffer.concat(chunk.length); }',
        'function d(chunk) { return Other.alloc(chunk.length); }',
        'function d(chunk) { return Buffer[kind](chunk.length); }',
        // recordCallSite: a callee with no readable name, and a spread argument.
        'function d(chunk) { return fns[0](chunk); }',
        'function d(chunk) { return wrap(...chunk); }',
        // readsWire: a node type the reader does not model, and the depth cap.
        'function d(chunk) { return new Array(cond ? 1 : 2); }',
        // isClamped: `Math.max` is not a clamp, so the size is judged normally
        // and is not wire-derived here anyway.
        'function d(items) { return new Array(Math.max(items.length, 1)); }',
        // isClamped: guarded by a comparison inside a logical test — once on
        // the LEFT of the `||`, once on the right.
        `function decodeWithLength(length, chunk) {
           if (length < 0 || other > MAX) throw new Error('bad');
           return new Array(length);
         }
         function decode(chunk) { return decodeWithLength(readLen(chunk), chunk); }`,
        `function decodeWithLength2(length, chunk) {
           if (other > 1 || length > MAX) throw new Error('bad');
           return new Array(length);
         }
         function decode2(chunk) { return decodeWithLength2(readLen(chunk), chunk); }`,
        // isClamped: the guard is an ANCESTOR `if`, not an earlier sibling.
        `function sized(length, chunk) {
           if (length < MAX) { return new Array(length); }
           return [];
         }
         function go(chunk) { return sized(readLen(chunk), chunk); }`,
        // isClamped: an arrow function body that is not a block.
        `const decodeWithLength = (length, chunk) => new Array(Math.min(length, MAX));
         const decode = (chunk) => decodeWithLength(readLen(chunk), chunk);`,
        // declaredName: a method with a computed key has no readable name.
        `class D { [dyn](length) { return new Array(length); } }`,
        // declaredName: a declarator whose id is a PATTERN has no single name.
        `const [sized] = function (length) { return new Array(length); };`,
        // readsWire depth cap: six member hops exhaust the walk.
        `function d(chunk) { return new Array(a.b.c.d.e.f.length); }`,
        // paramIndexOf: an identifier that is NOT a parameter of a function
        // whose parameters do carry wire data.
        `function sized(length) { const n = other; return new Array(n); }
         function go(chunk) { return sized(readLen(chunk)); }`,
        // A module-scope allocation has no enclosing function at all.
        `const pool = new Array(length);`,
        // Shopify/cli .../bulk-operations/stage-file.ts:112 — `new Uint8Array(x)`
        // over an array-like COPIES it. The size is whatever the caller already
        // holds, so there is nothing for a peer to inflate.
        `async function upload(fileContents, filename) {
           form.append('file', new Blob([new Uint8Array(fileContents)], {type: 'text/jsonl'}), filename);
         }`,
      ],
      invalid: [
        // The ioredis shape, reduced: the length is produced by a helper handed
        // the wire buffer, and passed one hop into the allocating function.
        {
          code: `class Decoder {
                   decodeArray(typeMapping, chunk) {
                     return this.decodeArrayWithLength(this.decodeUnsignedNumber(0, chunk), typeMapping, chunk);
                   }
                   decodeArrayWithLength(length, typeMapping, chunk) {
                     return this.decodeArrayItems(new Array(length), 0, typeMapping, chunk);
                   }
                 }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // Directly, with no hop — a length read off the chunk in place.
        {
          code: `function decode(chunk) { return new Array(chunk.readUInt32BE(0)); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // --- The peer is an HTTP client, not a protocol decoder -------------
        // benchmarks/corpus/CWE-770/vulnerable/array-length-user.js. The wire
        // names were all decoder vocabulary (`chunk`, `payload`, `frame`), so
        // a length the peer sent over HTTP — the commonest spelling of this
        // bug — was invisible. `req` is as much "off the wire" as `chunk`.
        {
          code: `function buildSlots(req, res) {
                   const n = Number(req.body.count);
                   const slots = new Array(n).fill(null);
                   res.json({ length: slots.length });
                 }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // benchmarks/corpus/CWE-770/vulnerable/buffer-alloc-user.js. Two hops
        // this time: the size is bound to a local, and the request has been
        // through `new URL(req.url, base)` before the size is read off it.
        {
          code: `const server = http.createServer((req, res) => {
                   const url = new URL(req.url, 'http://localhost');
                   const size = Number(url.searchParams.get('size'));
                   const buf = Buffer.alloc(size);
                   res.end(\`allocated \${buf.length} bytes\`);
                 });`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // The same hazard through Buffer.alloc and a typed array.
        {
          code: `function decode(payload) { return Buffer.alloc(payload.length * 2); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        {
          code: `function decode(chunk) { return new Uint8Array(chunk.readUInt16BE(0)); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // isClamped: an `if` on a DIFFERENT identifier does not clamp this one,
        // and the walk continues past it to the function boundary.
        {
          code: `function decodeWithLength(length, other, chunk) {
                   if (other > MAX) throw new Error('bad');
                   return new Array(length);
                 }
                 function decode(chunk) { return decodeWithLength(readLen(chunk), 1, chunk); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // isClamped: an equality test is not a bound.
        {
          code: `function decodeWithLength(length, chunk) {
                   if (length === 0) return [];
                   return new Array(length);
                 }
                 function decode(chunk) { return decodeWithLength(readLen(chunk), chunk); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // declaredName / paramIndexOf: the hop through an arrow bound to a
        // `const`, with the wire argument in a non-zero position.
        {
          code: `const decodeWithLength = (chunk, length) => new Array(length);
                 const decode = (chunk) => decodeWithLength(chunk, readLen(chunk));`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // declaredName: an object-literal method.
        {
          code: `const d = {
                   sized(length) { return new Array(length); },
                   go(chunk) { return this.sized(readLen(chunk)); },
                 };`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // isClamped: an enclosing `if` that is not a comparison at all leaves
        // the size unclamped, and the walk continues to the function boundary.
        {
          code: `function sized(length, flag) { if (flag) { return new Array(length); } }
                 function go(chunk) { return sized(readLen(chunk), true); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // readsWire: taint on the LEFT of a binary expression.
        {
          code: `function decode(chunk) { return new Array(1 + chunk.length); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // readsWire: the size is a binary expression over wire data.
        {
          code: `function decode(chunk) { return new Array(chunk.length * 2); }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // A private-method hop, the spelling ioredis actually uses.
        {
          code: `class D {
                   #a(chunk) { return this.#b(this.#len(0, chunk)); }
                   #b(length) { return new Array(length); }
                 }`,
          errors: [{ messageId: 'unboundedAllocation' }],
        },
      ],
    });
  });
});
