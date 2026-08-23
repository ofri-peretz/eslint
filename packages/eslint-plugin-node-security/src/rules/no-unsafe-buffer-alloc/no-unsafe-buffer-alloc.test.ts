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
      // A bare `allocUnsafe` whose binding this file cannot see is unresolved,
      // which is not the same as safe — but it is not evidence either.
      { code: 'allocUnsafe(64)' },
      { code: 'const { allocUnsafe } = pool;\nallocUnsafe(64);' },
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
      {
        code: 'const b = Buffer.allocUnsafe(src.length); src.copy(b); send(b);',
      },
      { code: 'const b = Buffer.allocUnsafe(n); b.set(src); send(b);' },
      { code: 'const b = Buffer.allocUnsafe(n); b.fill(0); send(b);' },
      {
        code: 'const b = Buffer.allocUnsafe(n); crypto.randomFillSync(b); send(b);',
      },
      // A moving offset inside a `while` covers the buffer just as a `for` does.
      {
        code: 'const b = Buffer.allocUnsafe(n); let o = 0; while (o < n) { b.write(s, o); o += 1; } send(b);',
      },
      // Metadata reads disclose nothing, so they do not end the scan.
      {
        code: 'const b = Buffer.allocUnsafe(n); log(b.length); src.copy(b); send(b);',
      },
      // A partial write is not a read either — it keeps the scan going until a
      // covering write settles it.
      {
        code: 'const b = Buffer.allocUnsafe(n); b.writeUInt8(1, 0); src.copy(b); send(b);',
      },
      {
        code: 'const b = Buffer.allocUnsafe(n); b[0] = 1; src.copy(b); send(b);',
      },
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
        stillReports(
          'const header = Buffer.allocUnsafe(16); header.writeUInt32BE(len, 0); socket.write(header);',
        ),
        // A moving offset, but not in a loop — one write, one place.
        stillReports(
          'const b = Buffer.allocUnsafe(n); b.write(s, off); send(b);',
        ),
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
        stillReports(
          'class C { #x; m() { const b = Buffer.allocUnsafe(n); return b.#x; } }',
        ),
        // First argument of a call that does not write through it.
        stillReports('const b = Buffer.allocUnsafe(n); hash.update(b);'),
        stillReports('const b = Buffer.allocUnsafe(n); send(b);'),
        stillReports('const b = Buffer.allocUnsafe(n); obj[m](b);'),
        // Not the first argument, so not the destination of a copy either.
        stillReports('const b = Buffer.allocUnsafe(n); send(x, b);'),
        // `copy` at a fixed destination offset covers one fixed slice.
        stillReports(
          'const b = Buffer.allocUnsafe(n); src.copy(b, 0, 0, 4); send(b);',
        ),

        // ── rule-corpus regression: the OMITTED offset ────────────────────
        // `writeUInt32BE(value)` defaults to offset 0 and still writes four
        // bytes. It was waved through by "a one-argument write covers the
        // buffer", a rule meant for `buf.write(str)` / `src.copy(dst)`.
        // benchmarks/rule-corpus/…/vulnerable/13-implicit-offset-partial-write.js
        stillReports(
          'const header = Buffer.allocUnsafe(16); header.writeUInt32BE(len); socket.write(header);',
        ),
        // Fixed offsets that do NOT add up: 4 of 16 bytes.
        stillReports(
          'const h = Buffer.allocUnsafe(16); h.writeUInt32BE(a, 0); socket.write(h);',
        ),
        // Fixed offsets, but the allocation size is not a resolvable constant,
        // so there is nothing to compare the covered bytes against.
        stillReports(
          'const h = Buffer.allocUnsafe(size); h.writeUInt32BE(a, 0); h.writeUInt32BE(b, 4); socket.write(h);',
        ),
        // A write that runs PAST the end must not be able to finish the
        // coverage of the allocation it overflows.
        stillReports(
          'const h = Buffer.allocUnsafe(8); h.writeUInt32BE(a, 0); h.writeBigUInt64BE(b, 4); socket.write(h);',
        ),
        // A computed offset leaves the span unknown.
        stillReports(
          'const h = Buffer.allocUnsafe(8); h.writeUInt32BE(a, 0); h.writeUInt32BE(b, off); socket.write(h);',
        ),
        // An allocation too large to track byte by byte.
        stillReports(
          'const h = Buffer.allocUnsafe(1000000); h.writeUInt32BE(a, 0); socket.write(h);',
        ),
        // byteMapFor: sizes there is nothing to map — absent, spread, zero,
        // fractional, and a string that is not a byte count at all.
        stillReports('const b = Buffer.allocUnsafe(); send(b);'),
        stillReports('const b = Buffer.allocUnsafe(...args); send(b);'),
        stillReports('const b = Buffer.allocUnsafe(0); send(b);'),
        stillReports('const b = Buffer.allocUnsafe(1.5); send(b);'),
        stillReports('const b = Buffer.allocUnsafe("8"); send(b);'),
        // A partial write whose span is NOT fixed-width — `write` runs for a
        // runtime length, so it contributes no decidable coverage even with a
        // byte map in hand.
        stillReports(
          'const b = Buffer.allocUnsafe(8); b.write(s, 0); send(b);',
        ),
      ],
    });
  });

  // ── The allocator is reached by resolution, not by spelling ────────────
  //
  // `Buffer["allocUnsafe"](64)` sat in `valid` above, annotated "computed
  // access is not resolved (documented false negative)". Documenting a defect
  // is not mitigating it: a config-driven pool picks its allocator exactly
  // that way, and a hot-path serializer destructures it.
  describe('Allocator resolution', () => {
    ruleTester.run(
      'computed and destructured allocators',
      noUnsafeBufferAlloc,
      {
        valid: [
          // The key resolves to the SAFE allocator.
          { code: "const M = 'alloc';\nconst b = Buffer[M](64);\nsend(b);" },
          // A computed key this file cannot resolve is not evidence.
          { code: 'const b = Buffer[pick()](64);\nsend(b);' },
          // Destructured off something that is not `Buffer`.
          { code: 'const { allocUnsafe } = pool;\nsend(allocUnsafe(64));' },
          // Destructured, but not an unsafe allocator.
          { code: 'const { alloc } = Buffer;\nsend(alloc(64));' },
          // A computed destructuring key is not read.
          { code: 'const { [k]: make } = Buffer;\nsend(make(64));' },
          // A non-computed property that is not an Identifier.
          {
            code: 'class C { static #allocUnsafe; m() { return Buffer.#allocUnsafe(4); } }',
          },
          // A parameter binding has no initializer to resolve.
          { code: 'function f(allocUnsafe) { return allocUnsafe(64); }' },
          // Neither a member expression nor an identifier.
          { code: 'send((0, Buffer.alloc)(64));' },
        ],
        invalid: [
          // vulnerable/08 — computed member with a `const` string key. The
          // suggestion is withheld: `Buffer[alloc](n)` would not compile.
          {
            code: "const ALLOCATOR = 'allocUnsafe';\nconst slot = Buffer[ALLOCATOR](64);\nsend(slot);",
            errors: [{ messageId: 'unsafeAlloc' }],
          },
          {
            code: 'const slot = Buffer["allocUnsafeSlow"](64);\nsend(slot);',
            errors: [{ messageId: 'unsafeAllocSlow' }],
          },
          // vulnerable/09 — destructured off `Buffer`, and off the required
          // module object.
          {
            code: 'const { allocUnsafe } = Buffer;\nconst p = allocUnsafe(64);\nsend(p);',
            errors: [{ messageId: 'unsafeAlloc' }],
          },
          {
            code: "const { allocUnsafeSlow } = require('node:buffer').Buffer;\nconst p = allocUnsafeSlow(64);\nsend(p);",
            errors: [{ messageId: 'unsafeAllocSlow' }],
          },
        ],
      },
    );
  });

  // ── Coverage evidence the rule was blind to ───────────────────────────
  describe('Covering writes reached by resolution', () => {
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

    ruleTester.run('covering writes', noUnsafeBufferAlloc, {
      valid: [
        // `Buffer.byteLength(json)` sizes an allocation from a value already in
        // memory. `buffer` is in WIRE_NAMES as a conventional PARAMETER name,
        // which made every `Buffer.*`-sized allocation read as wire-derived.
        // benchmarks/rule-corpus/…/safe/07-alloc-from-bytelength.js
        {
          code: 'const b = Buffer.alloc(Buffer.byteLength(json, "utf8")); b.write(json, 0);',
        },
        {
          code: "import { Buffer } from 'node:buffer';\nconst b = Buffer.alloc(Buffer.byteLength(json, 'utf8'));\nb.write(json, 0);",
        },
        // A `let` whose every write is a numeric literal this module chose.
        // benchmarks/rule-corpus/…/safe/10-let-numeric-writes.js
        {
          code: 'function reserve(fast) { let capacity = 1024; if (fast) { capacity = 65536; } return Buffer.alloc(capacity); }',
        },
        // Nothing in this file writes the size, so there is no evidence.
        { code: 'const b = Buffer.alloc(sizeFromElsewhere);' },
        // A spread into `Math.min` is not counted as a bound, but `readsWire`
        // does not walk spread arguments either, so the whole expression is
        // unresolved rather than clamped. Documented, not claimed as safe.
        {
          code: 'function reserve(req) { return Buffer.alloc(Math.min(...req.body.sizes)); }',
        },
        // byteMapFor: no size argument, and a spread size argument.
        { code: 'const b = Buffer.alloc(); send(b);' },
        { code: 'const b = Buffer.alloc(...args); send(b);' },
        // A NAMED IMPORT of `randomFillSync` fills the buffer exactly as
        // `crypto.randomFillSync` does. Insisting on a member expression made
        // the one idiom where `allocUnsafe` is unambiguously right a finding.
        // benchmarks/rule-corpus/…/safe/05-covered-by-randomfill.js
        {
          code: "import { randomFillSync } from 'node:crypto';\nexport function nonce(size) { const v = Buffer.allocUnsafe(size); randomFillSync(v); return v; }",
        },
        {
          code: "const { randomFillSync } = require('crypto');\nfunction nonce(size) { const v = Buffer.allocUnsafe(size); randomFillSync(v); return v; }",
        },
        // Fixed offsets that DO add up: bytes 0..7 of an eight-byte header.
        // benchmarks/rule-corpus/…/safe/12-fixed-offsets-fully-covering.js
        {
          code: 'const h = Buffer.allocUnsafe(8); h.writeUInt32BE(a, 0); h.writeUInt32BE(b, 4); socket.write(h);',
        },
        // …including through a `const` size alias.
        {
          code: 'const N = 4;\nconst h = Buffer.allocUnsafe(N); h.writeUInt16BE(a, 0); h.writeUInt16BE(b, 2); socket.write(h);',
        },
        // A moving offset in a loop still covers a fixed-width writer.
        {
          code: 'const b = Buffer.allocUnsafe(n); for (let i = 0; i < n; i++) { b.writeUInt8(src[i], i); } send(b);',
        },
        // Overlapping fixed writes: the second re-covers bytes the first
        // already had, and only the new bytes count towards completion.
        {
          code: 'const h = Buffer.allocUnsafe(4); h.writeUInt16BE(a, 0); h.writeUInt32BE(b, 0); socket.write(h);',
        },
        // The depth cap terminates a long member chain rather than the walk
        // running away. `new Array(a.b.….length)` is eleven hops.
        {
          code: 'function d(chunk) { return new Array(a.b.c.d.e.f.g.h.i.j.k.length); }',
        },
      ],
      invalid: [
        // The same free-function shape, NOT resolved to node:crypto.
        stillReports(
          'function nonce(size) { const v = Buffer.allocUnsafe(size); randomFillSync(v); return v; }',
        ),
        stillReports(
          "import { randomFillSync } from './my-rng';\nfunction nonce(size) { const v = Buffer.allocUnsafe(size); randomFillSync(v); return v; }",
        ),
        stillReports(
          "const { randomFillSync } = require('./my-rng');\nfunction nonce(size) { const v = Buffer.allocUnsafe(size); randomFillSync(v); return v; }",
        ),
        // markFixedWrite: a `partial` use whose write is not a method call at
        // all — a computed byte assignment — and one whose parent IS the call
        // (`src.copy(b, …)`). Neither contributes coverage.
        stillReports('const b = Buffer.allocUnsafe(8); b[i] = 1; send(b);'),
        stillReports(
          'const b = Buffer.allocUnsafe(8); src.copy(b, 0, 0, 4); send(b);',
        ),
        // The `let` whose last write before the sink comes off the request.
        // benchmarks/rule-corpus/…/vulnerable/11-let-reassigned-from-request.js
        {
          code: 'function reserve(req) { let capacity = 1024; if (req.query.capacity) { capacity = Number(req.query.capacity); } return Buffer.alloc(capacity); }',
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // `Math.min` between two values the SAME peer supplies is not a clamp.
        // benchmarks/rule-corpus/…/vulnerable/12-math-min-against-attacker.js
        {
          code: 'function reserve(req) { const a = Number(req.body.want); const b = Number(req.body.max); return Buffer.alloc(Math.min(a, b)); }',
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // A LOCAL binding spelled `Buffer` is not the namespace — here it is a
        // decoder parameter holding bytes off the wire, and the length read out
        // of it is the peer's.
        {
          code: 'function decode(Buffer) { return new Uint8Array(Buffer.length); }',
          errors: [{ messageId: 'unboundedAllocation' }],
        },
        // TypeScript: the cast a decoder must write to compile used to fall
        // through `readsWire`'s switch and silence the whole arm.
        // benchmarks/rule-corpus/…/vulnerable/07-decoder-length-prefix.ts
        {
          code: 'function decode(chunk: Buffer) { const count = chunk.readUInt32BE(0) as number; return new Uint8Array(count); }',
          errors: [{ messageId: 'unboundedAllocation' }],
        },
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

describe('a visible origin beats a wire-shaped name', () => {
  /**
   * Provenance: IGNF/cartes.gouv.fr-entree-carto — a French government mapping
   * site running this plugin — src/components/carte/control/printUtils/png.js,
   * three findings on a PNG writer that never touches a socket.
   *
   * `data` left WIRE_NAMES for the reason `bytes` did: it is the most generic
   * parameter name in JavaScript and denotes a buffer only sometimes. And where
   * an identifier resolves to a local variable, the initializer is visible, so
   * the rule follows it instead of trusting the spelling.
   */
  ruleTester.run('valid - locally built buffers', noUnsafeBufferAlloc, {
    valid: [
      // The parameter is named `data`, and the only call passes local metadata.
      `function buildPngChunk(type, data) {
         const crcInput = new Uint8Array(4 + data.length);
         return crcInput;
       }
       const chunk = buildPngChunk('pHYs', new Uint8Array(9));`,
      // `chunk` resolves to a local whose initializer is a local call.
      `function build() { return new Uint8Array(8); }
       const chunk = build();
       const result = new Uint8Array(chunk.length);`,
    ],
    invalid: [],
  });

  /** The name still carries where the origin is genuinely invisible. */
  ruleTester.run('invalid - the origin is off the wire', noUnsafeBufferAlloc, {
    valid: [],
    invalid: [
      {
        // Follows the initializer to the request rather than stopping at `chunk`.
        code: `function handler(req) {
                 const chunk = req.body.raw;
                 return new Uint8Array(chunk.length);
               }`,
        errors: 1,
      },
      {
        // A parameter: nothing local to follow, so the name is the evidence.
        code: `function decode(chunk) { return new Uint8Array(chunk.readUInt32BE(0)); }`,
        errors: 1,
      },
      {
        // Never declared in this file — the purest "origin invisible" case, and
        // the one the name list exists for.
        code: `const result = new Uint8Array(chunk.length);`,
        errors: 1,
      },
    ],
  });
});
