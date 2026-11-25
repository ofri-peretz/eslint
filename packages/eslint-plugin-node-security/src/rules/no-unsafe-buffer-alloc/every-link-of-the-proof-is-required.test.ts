/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-buffer-alloc: each check in a proof that clears a finding is
 * needed.
 *
 * Three proofs let a finding go: a file read that fills the buffer and is
 * read back only up to its count, fixed-width writes that cover a small
 * constant-sized buffer, and a guard that caps a size off the wire. Each one
 * is a chain of checks, and the cases below hold every link: drop one and a
 * case here starts passing that leaks memory or allocates what the peer asks.
 */
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

/** An invalid case whose one report offers the `Buffer.alloc` suggestion. */
const reports = (name: string, code: string) => ({
  name,
  code,
  errors: [
    {
      messageId: 'unsafeAlloc' as const,
      suggestions: [
        {
          messageId: 'useSafeAlloc' as const,
          output: code.replace('allocUnsafe(', 'alloc('),
        },
      ],
    },
  ],
});

const unbounded = [{ messageId: 'unboundedAllocation' as const }];

/** `fs.readSync` into the buffer, then `use` as the only look at it. */
const afterReadSync = (use: string, read = 'fs.readSync(fd, buf, 0, n, 0)') => `
import fs from 'node:fs';
export function head(fd, n, other, take, id) {
  const buf = Buffer.allocUnsafe(n);
  const bytesRead = ${read};
  return ${use};
}`;

/** An awaited `FileHandle.read` into the buffer, then `use`. */
const afterHandleRead = (
  read: string,
  use: string,
  opened = "await open(file, 'r')",
) => `
import { open } from 'node:fs/promises';
export async function head(file, n, other) {
  const handle = ${opened};
  const buf = Buffer.allocUnsafe(n);
  ${read}
  return ${use};
}`;

/** `fs.read(…)` with a callback, the callback being the only look. */
const afterCallbackRead = (call: string) => `
import fs from 'node:fs';
export function head(fd, n, other, done) {
  const buf = Buffer.allocUnsafe(n);
  ${call};
}`;

/** A buffer of `size` bytes stamped by `writes`, then returned. */
const header = (size: string, writes: string) => `
export function frame(table) {
  const buf = Buffer.allocUnsafe(${size});
  ${writes}
  return buf;
}`;

/** `count` doubles written back to back from offset 0. */
const doubles = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `buf.writeDoubleBE(0, ${index * 8});`,
  ).join(' ');

const handler = (body: string): string =>
  `function h(req) { const n = Number(req.query.n); ${body} }`;

describe('no-unsafe-buffer-alloc — every link of the proof is required', () => {
  ruleTester.run(
    'a file read, then reads up to its count',
    noUnsafeBufferAlloc,
    {
      valid: [
        {
          // @found synthetic
          name: 'a loose == on the count selects the full buffer too',
          code: afterReadSync(
            'bytesRead == buf.length ? buf : buf.subarray(0, bytesRead)',
          ),
        },
        {
          // @found synthetic
          name: 'a loose != puts the full buffer in the else arm',
          code: afterReadSync(
            'bytesRead != buf.length ? buf.subarray(0, bytesRead) : buf',
          ),
        },
        {
          // @found synthetic
          name: 'fs.read with an arrow callback bounds by its count',
          code: afterCallbackRead(
            'fs.read(fd, buf, 0, n, 0, (err, bytesRead) => done(buf.subarray(0, bytesRead)))',
          ),
        },
        {
          // @found synthetic
          name: 'fs.read with a function callback bounds by its count',
          code: afterCallbackRead(
            "fs.read(fd, buf, 0, n, 0, function (err, bytesRead) { done(buf.toString('utf8', 0, bytesRead)); })",
          ),
        },
      ],
      invalid: [
        {
          name: 'copy from the count onward is the uninitialized tail',
          ...reports(
            'copy from the count onward is the uninitialized tail',
            afterReadSync('buf.copy(other, 0, bytesRead)'),
          ),
        },
        {
          name: 'toString from 0 with no end reads the whole buffer',
          ...reports(
            'toString from 0 with no end reads the whole buffer',
            afterReadSync("buf.toString('utf8', 0)"),
          ),
        },
        {
          name: 'subarray(0) with no end is the whole buffer',
          ...reports(
            'subarray(0) with no end is the whole buffer',
            afterReadSync('buf.subarray(0)'),
          ),
        },
        {
          name: 'a toString handed on with the count as an argument is not a bounded read',
          ...reports(
            'a toString handed on with the count as an argument is not a bounded read',
            afterReadSync('take(buf.toString, 0, bytesRead)'),
          ),
        },
        {
          name: 'the buffer passed to a call that is then called is a read',
          ...reports(
            'the buffer passed to a call that is then called is a read',
            afterReadSync('id(buf)(0, bytesRead)'),
          ),
        },
        {
          name: 'a count below the length does not select the full buffer',
          ...reports(
            'a count below the length does not select the full buffer',
            afterReadSync(
              'bytesRead < buf.length ? buf : buf.subarray(0, bytesRead)',
            ),
          ),
        },
        {
          name: 'the full buffer in the arm where the count differs',
          ...reports(
            'the full buffer in the arm where the count differs',
            afterReadSync(
              'bytesRead !== buf.length ? buf : buf.subarray(0, bytesRead)',
            ),
          ),
        },
        {
          name: 'a count compared with another buffer says nothing about this one',
          ...reports(
            'a count compared with another buffer says nothing about this one',
            afterReadSync(
              'bytesRead === other.length ? buf : buf.subarray(0, bytesRead)',
            ),
          ),
        },
        {
          name: 'a count compared with the byte offset is not the size',
          ...reports(
            'a count compared with the byte offset is not the size',
            afterReadSync(
              'bytesRead === buf.byteOffset ? buf : buf.subarray(0, bytesRead)',
            ),
          ),
        },
        {
          name: 'the length compared with something other than the count',
          ...reports(
            'the length compared with something other than the count',
            afterReadSync(
              'buf.length === n ? buf : buf.subarray(0, bytesRead)',
            ),
          ),
        },
        {
          name: 'a buffer passed as the position is not the buffer read into',
          ...reports(
            'a buffer passed as the position is not the buffer read into',
            afterReadSync(
              'buf.subarray(0, bytesRead)',
              'fs.readSync(fd, other, 0, n, buf)',
            ),
          ),
        },
        {
          name: 'a read whose count is dropped bounds nothing',
          ...reports(
            'a read whose count is dropped bounds nothing',
            `import fs from 'node:fs';
export function head(fd, n) {
  const buf = Buffer.allocUnsafe(n);
  fs.readSync(fd, buf, 0, n, 0);
  return buf.subarray(0, total);
}`,
          ),
        },
        {
          name: 'a defaulted destructured count gives no count to stop at',
          ...reports(
            'a defaulted destructured count gives no count to stop at',
            afterHandleRead(
              'const { bytesRead = 0 } = await handle.read(buf, 0, n, 0);',
              'buf.subarray(0, total)',
            ),
          ),
        },
        {
          name: 'fs.write sends the bytes; it does not fill them',
          ...reports(
            'fs.write sends the bytes; it does not fill them',
            afterCallbackRead(
              'fs.write(fd, buf, 0, n, 0, (err, written) => done(buf.subarray(0, written)))',
            ),
          ),
        },
        {
          name: 'a five-argument fs.read has no callback where the count is read',
          ...reports(
            'a five-argument fs.read has no callback where the count is read',
            afterCallbackRead(
              'fs.read(fd, buf, 0, n, (err, bytesRead) => done(buf.subarray(0, bytesRead)))',
            ),
          ),
        },
        {
          name: 'fs.read with the buffer as the position does not fill it',
          ...reports(
            'fs.read with the buffer as the position does not fill it',
            afterCallbackRead(
              'fs.read(fd, other, 0, n, buf, (err, bytesRead) => done(buf.subarray(0, bytesRead)))',
            ),
          ),
        },
        {
          name: 'a callback count reassigned before the bound',
          ...reports(
            'a callback count reassigned before the bound',
            afterCallbackRead(
              'fs.read(fd, buf, 0, n, 0, (err, bytesRead) => { bytesRead = n; done(buf.subarray(0, bytesRead)); })',
            ),
          ),
        },
        {
          name: 'handle.write is not a read',
          ...reports(
            'handle.write is not a read',
            afterHandleRead(
              'const r = await handle.write(buf, 0, n, 0);',
              'buf.subarray(0, r.bytesRead)',
            ),
          ),
        },
        {
          name: 'handle.read with the buffer as the position does not fill it',
          ...reports(
            'handle.read with the buffer as the position does not fill it',
            afterHandleRead(
              'const r = await handle.read(other, 0, n, buf);',
              'buf.subarray(0, r.bytesRead)',
            ),
          ),
        },
        {
          name: 'a rest pattern carries the whole buffer out',
          ...reports(
            'a rest pattern carries the whole buffer out',
            afterHandleRead(
              'const { ...rest } = await handle.read(buf, 0, n, 0);',
              'buf.subarray(0, rest.bytesRead)',
            ),
          ),
        },
        {
          name: 'the destructured buffer is not the count',
          ...reports(
            'the destructured buffer is not the count',
            afterHandleRead(
              'const { buffer: size } = await handle.read(buf, 0, n, 0);',
              'buf.subarray(0, size)',
            ),
          ),
        },
        {
          name: 'a handle awaited from a value, not an open() call',
          ...reports(
            'a handle awaited from a value, not an open() call',
            afterHandleRead(
              'const r = await handle.read(buf, 0, n, 0);',
              'buf.subarray(0, r.bytesRead)',
              'await other',
            ),
          ),
        },
        {
          name: 'bytesRead of another result does not bound this buffer',
          ...reports(
            'bytesRead of another result does not bound this buffer',
            afterHandleRead(
              'const r = await handle.read(buf, 0, n, 0); const s = await handle.read(other, 0, n, 0);',
              'buf.subarray(0, s.bytesRead)',
            ),
          ),
        },
      ],
    },
  );

  ruleTester.run(
    'fixed-width writes over a constant size',
    noUnsafeBufferAlloc,
    {
      valid: [
        {
          // @found synthetic
          name: 'the largest tracked size is still tracked',
          code: header('4096', doubles(512)),
        },
        {
          // @found synthetic
          name: 'a require() with no specifier is not node:buffer',
          code: 'export const b = require().Buffer.allocUnsafe(8);',
        },
        {
          // @found synthetic
          name: 'another export of node:buffer is not Buffer',
          code: "export const b = require('node:buffer').Blob.allocUnsafe(8);",
        },
      ],
      invalid: [
        {
          name: 'one byte past the tracked size is not tracked',
          ...reports(
            'one byte past the tracked size is not tracked',
            header('4097', `${doubles(512)} buf.writeUInt8(0, 4096);`),
          ),
        },
        {
          name: 'a fractional size is not tracked',
          ...reports(
            'a fractional size is not tracked',
            header('1.5', 'buf.writeUInt8(0, 0);'),
          ),
        },
        {
          name: 'a negative size is not tracked',
          ...reports(
            'a negative size is not tracked',
            header('-1', 'buf.writeUInt8(0, 0);'),
          ),
        },
        {
          name: 'using the buffer as a key reads it',
          ...reports(
            'using the buffer as a key reads it',
            header('1', 'table[buf] = 1; buf.writeUInt8(0, 0);'),
          ),
        },
        {
          name: 'an undeclared randomFillSync is not node:crypto',
          ...reports(
            'an undeclared randomFillSync is not node:crypto',
            header('4', 'randomFillSync(buf);'),
          ),
        },
        {
          name: 'a randomFillSync declared without a value is not node:crypto',
          ...reports(
            'a randomFillSync declared without a value is not node:crypto',
            `let randomFillSync;${header('4', 'randomFillSync(buf);')}`,
          ),
        },
        {
          name: 'a randomFillSync from a require() with no specifier is not node:crypto',
          ...reports(
            'a randomFillSync from a require() with no specifier is not node:crypto',
            `const { randomFillSync } = require();${header('4', 'randomFillSync(buf);')}`,
          ),
        },
        {
          name: 'an import-equals binds the module, not the filler',
          ...reports(
            'an import-equals binds the module, not the filler',
            `import randomFillSync = require('node:crypto');${header('4', 'randomFillSync(buf);')}`,
          ),
        },
      ],
    },
  );

  ruleTester.run('a guard that caps a size off the wire', noUnsafeBufferAlloc, {
    valid: [
      {
        // @found synthetic
        name: 'a rejecting block that ends in throw after other statements',
        code: handler(
          "if (n > 4096) { log(n); log(n); throw new Error('too big'); } return Buffer.alloc(n);",
        ),
      },
      {
        // @found synthetic
        name: 'FP: a ternary on size <= MAX bounds its consequent',
        code: handler('return n <= 4096 ? Buffer.alloc(n) : null;'),
      },
      {
        // @found synthetic
        name: 'FP: a ternary on size > MAX bounds its alternate',
        code: handler('return n > 4096 ? null : Buffer.alloc(n);'),
      },
    ],
    invalid: [
      {
        name: 'a guard on another expression does not cap a computed size',
        code: "function h(req) { const frame = req.body; if (frame.length > 4096) throw new Error('too big'); return Buffer.alloc(frame.readUInt32BE(0)); }",
        errors: unbounded,
      },
      {
        name: 'a min() on something other than Math is not a clamp',
        code: handler('return Buffer.alloc(Limits.min(n, 4096));'),
        errors: unbounded,
      },
      {
        name: 'an unbraced if (size > 0) is a lower bound',
        code: handler('if (n > 0) return Buffer.alloc(n);'),
        errors: unbounded,
      },
      {
        name: 'the ternary arm where size > MAX is unbounded',
        code: handler('return n > 4096 ? Buffer.alloc(n) : null;'),
        errors: unbounded,
      },
      {
        name: 'a guard outside an arrow does not cap a size rewritten inside it',
        code: "function h(req, emitter) { let n = Number(req.query.n); if (n > 4096) throw new Error('too big'); emitter.on('data', (chunk) => { n = chunk.readUInt32BE(0); return Buffer.alloc(n); }); }",
        errors: unbounded,
      },
      {
        name: 'a guard outside a function expression does not cap it either',
        code: "function h(req, emitter) { let n = Number(req.query.n); if (n > 4096) throw new Error('too big'); emitter.on('data', function (chunk) { n = chunk.readUInt32BE(0); return Buffer.alloc(n); }); }",
        errors: unbounded,
      },
      {
        name: 'nor a nested function declaration',
        code: "function h(req, emitter) { let n = Number(req.query.n); if (n > 4096) throw new Error('too big'); function onData(chunk) { n = chunk.readUInt32BE(0); return Buffer.alloc(n); } emitter.on('data', onData); }",
        errors: unbounded,
      },
      {
        name: 'an empty guard block leaves nothing',
        code: handler('if (n > 4096) {} return Buffer.alloc(n);'),
        errors: unbounded,
      },
      {
        name: 'an && of two non-caps is not a cap',
        code: handler('if (ready && n > 0) return Buffer.alloc(n);'),
        errors: unbounded,
      },
      {
        name: 'a rejecting && guard skips the cap when the flag is off',
        code: handler(
          "if (strict && n > 4096) throw new Error('too big'); return Buffer.alloc(n);",
        ),
        errors: unbounded,
      },
      {
        name: 'a rejecting || of two non-caps is not a cap',
        code: handler(
          "if (a || b) throw new Error('bad'); return Buffer.alloc(n);",
        ),
        errors: unbounded,
      },
      {
        name: 'a guard on another variable does not cap this one',
        code: handler(
          "if (m > 4096) throw new Error('too big'); return Buffer.alloc(n);",
        ),
        errors: unbounded,
      },
      {
        name: 'rejecting small sizes lets large ones through',
        code: handler(
          "if (n < 4096) throw new Error('too small'); return Buffer.alloc(n);",
        ),
        errors: unbounded,
      },
    ],
  });
});
