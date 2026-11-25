/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `Buffer.allocUnsafe` whose every byte is written before anything reads it.
 *
 * Two shapes that cannot leak an uninitialized byte:
 *
 *   1. `fs.read(fd, buf, 0, n, pos, (err, bytesRead) => buf.slice(0, bytesRead))`,
 *      the callback spelling of a read that is consumed only up to its count,
 *      provided the callback's third parameter (which aliases the whole buffer)
 *      is absent or never read;
 *   2. `count === buf.byteLength ? buf : buf.subarray(0, count)`, where the
 *      whole buffer is handed out only when the read filled all of it.
 *
 * The invalid cases include shapes a review showed to LOOK covered and are not:
 * a copy whose source can be shorter than its range, `start + 8` when `start`
 * is a string, a property assignment that can run a setter, `byteLength` on a
 * multi-byte typed array, and a callback that aliases the buffer. Each must
 * still report.
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
const reports = (code: string) => {
  const slow = code.includes('allocUnsafeSlow(');
  return {
    code,
    errors: [
      {
        messageId: slow
          ? ('unsafeAllocSlow' as const)
          : ('unsafeAlloc' as const),
        suggestions: [
          {
            messageId: 'useSafeAlloc' as const,
            output: code.replace(/allocUnsafe(?:Slow)?\(/, 'alloc('),
          },
        ],
      },
    ],
  };
};

describe('no-unsafe-buffer-alloc — fully overwritten before use', () => {
  ruleTester.run('fully-overwritten', noUnsafeBufferAlloc, {
    valid: [
      {
        name: 'a third callback parameter that is never read cannot alias the buffer out',
        code: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.allocUnsafe(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead, unused) {
              self.push(buffer.slice(0, bytesRead));
            });
          }
        `,
      },
      {
        // @source thejoshwolfe/yauzl fd-slicer.js:84
        // @found linting popular Node.js packages
        name: 'FP: fs.read callback, then buffer.slice(0, bytesRead)',
        code: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.allocUnsafe(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
              if (err) {
                self.destroy(err);
              } else if (bytesRead === 0) {
                self.push(null);
              } else {
                self.push(buffer.slice(0, bytesRead));
              }
            });
          }
        `,
      },
      {
        // @source isaacs/node-tar src/list.ts:70
        // @found linting popular Node.js packages
        name: 'FP: count === buf.byteLength ? buf : buf.subarray(0, count)',
        code: `
          import fs from 'node:fs';
          function listFileSync(fd, size, parser) {
            const buf = Buffer.allocUnsafe(size);
            const read = fs.readSync(fd, buf, 0, size, 0);
            parser.end(read === buf.byteLength ? buf : buf.subarray(0, read));
          }
        `,
      },
      {
        name: 'the unequal spelling: count !== buf.length ? buf.subarray(0, count) : buf',
        code: `
          import fs from 'node:fs';
          function head(fd, size) {
            const buf = Buffer.allocUnsafe(size);
            const n = fs.readSync(fd, buf, 0, size, 0);
            return n !== buf.length ? buf.subarray(0, n) : buf;
          }
        `,
      },
      {
        name: 'the unequal-length test with its operands swapped: buf.byteLength === count ? buf : ...',
        code: `
          import fs from 'node:fs';
          function head(fd, size) {
            const buf = Buffer.allocUnsafe(size);
            const n = fs.readSync(fd, buf, 0, size, 0);
            return buf.byteLength === n ? buf : buf.subarray(0, n);
          }
        `,
      },
    ],
    invalid: [
      // ── review regressions: each one is a buffer that still leaks ──────────
      {
        name: 'a copy whose source is shorter than the range copies fewer bytes (data.copy(out, 0, 0, 8) from one byte)',
        ...reports(
          'function f(sink) { const data = Buffer.from([1]); const out = Buffer.allocUnsafe(8); data.copy(out, 0, 0, 8); sink(out); }',
        ),
      },
      {
        name: 'start + 8 is string concatenation when start is a string, so the range copies nothing',
        ...reports(
          "function f(data, sink) { const start = '0.5'; const out = Buffer.allocUnsafe(8); data.copy(out, 0, start, start + 8); sink(out); }",
        ),
      },
      {
        name: 'the fs.read callback hands out the whole buffer through its third parameter',
        ...reports(
          "var fs = require('fs'); function r(self, send) { var b = Buffer.allocUnsafe(8); fs.read(self.fd, b, 0, 8, 0, function(err, n, result) { if (!err) send(result); }); }",
        ),
      },
      {
        name: 'the fs.read callback destructures its third parameter, which can alias the whole buffer',
        ...reports(
          "var fs = require('fs'); function r(self, send) { var b = Buffer.allocUnsafe(8); fs.read(self.fd, b, 0, 8, 0, function(err, n, { length }) { send(b.slice(0, n)); }); }",
        ),
      },
      {
        name: 'an assignment to a property can run a setter that sends the buffer before it is filled',
        ...reports(
          'function f(box, src) { box.msg = Buffer.allocUnsafeSlow(src.length); box.msg.set(src); }',
        ),
      },
      {
        name: 'byteLength counts bytes, but TypedArray.set copies elements: a Uint16Array leaves bytes behind',
        ...reports(
          'function f(box) { const src = new Uint16Array([1, 2]); box.msg = Buffer.allocUnsafeSlow(src.byteLength); box.msg.set(src); }',
        ),
      },
      {
        name: 'a [0, expression) range is not the allocation size',
        ...reports(
          'function f(data, size, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, 0, size + 1); sink(b); }',
        ),
      },
      {
        name: 'copy with three arguments has no source end',
        ...reports(
          'function f(data, size, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, 1); sink(b); }',
        ),
      },
      {
        name: 'an allocation with no size argument proves no range',
        ...reports(
          'function f(data, sink) { const b = Buffer.allocUnsafe(); data.copy(b, 0, 0, 4); sink(b); }',
        ),
      },
      {
        name: 'a copy end that is not start + SIZE',
        ...reports(
          'function f(data, start, end, size, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, start, end); sink(b); }',
        ),
      },
      {
        name: 'a range start that is a property read is not a plain binding',
        ...reports(
          'function f(data, o, size, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, o.start, o.start + size); sink(b); }',
        ),
      },
      {
        name: 'the start of the range and the added start are different bindings',
        ...reports(
          'function f(data, a, c, size, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, a, c + size); sink(b); }',
        ),
      },
      {
        name: 'literal starts that differ',
        ...reports(
          'function f(data, size, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, 4, 5 + size); sink(b); }',
        ),
      },
      {
        name: 'a literal size and a different literal range end',
        ...reports(
          'function f(data, sink) { const b = Buffer.allocUnsafe(8); data.copy(b, 0, 0, 4); sink(b); }',
        ),
      },
      {
        name: 'a literal range end against an identifier size',
        ...reports(
          'function f(data, size, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, 0, 8); sink(b); }',
        ),
      },
      {
        name: 'a [0, SIZE) range sized by a different binding',
        ...reports(
          'function f(data, size, other, sink) { const b = Buffer.allocUnsafe(size); data.copy(b, 0, 0, other); sink(b); }',
        ),
      },
      {
        name: 'fs.read at a non-zero offset does not fill from the front',
        ...reports(
          `var fs = require('fs'); function r(self, n) { var b = Buffer.allocUnsafe(n); fs.read(self.fd, b, 4, n, 0, function(err, got) { self.push(b.slice(0, got)); }); }`,
        ),
      },
      {
        name: 'fs.read whose callback is not written out cannot be followed',
        ...reports(
          `var fs = require('fs'); function r(self, n, cb) { var b = Buffer.allocUnsafe(n); fs.read(self.fd, b, 0, n, 0, cb); }`,
        ),
      },
      {
        name: 'fs.read callback with no count parameter',
        ...reports(
          `var fs = require('fs'); function r(self, n) { var b = Buffer.allocUnsafe(n); fs.read(self.fd, b, 0, n, 0, function(err) { self.push(b); }); }`,
        ),
      },
      {
        name: 'the property is assigned under an if with no block',
        ...reports(
          'function f(ws, reason) { if (reason) ws.msg = Buffer.allocUnsafeSlow(reason.length); ws.msg.set(reason); }',
        ),
      },
      {
        name: 'the allocation is an argument, not a statement of its own',
        ...reports(
          'function f(ws, reason) { keep(ws.msg = Buffer.allocUnsafeSlow(reason.length)); ws.msg.set(reason); }',
        ),
      },
      {
        name: 'the property is sized by something that is not a length',
        ...reports(
          'function f(ws, reason, n) { ws.msg = Buffer.allocUnsafeSlow(n); ws.msg.set(reason); }',
        ),
      },
      {
        name: 'the property is sized by a computed length',
        ...reports(
          "function f(ws, reason) { ws.msg = Buffer.allocUnsafeSlow(reason['length']); ws.msg.set(reason); }",
        ),
      },
      {
        name: 'the property is sized by a member that is not length',
        ...reports(
          'function f(ws, reason) { ws.msg = Buffer.allocUnsafeSlow(reason.size); ws.msg.set(reason); }',
        ),
      },
      {
        name: 'copy range shorter than the allocation leaves the tail uninitialized',
        code: `
          function f(data, start, actualLen, sink) {
            const chunk = Buffer.allocUnsafe(actualLen);
            data.copy(chunk, 0, start, start + 1);
            sink(chunk);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function f(data, start, actualLen, sink) {
            const chunk = Buffer.alloc(actualLen);
            data.copy(chunk, 0, start, start + 1);
            sink(chunk);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'copy into a later offset does not start at the front',
        code: `
          function f(data, start, actualLen, sink) {
            const chunk = Buffer.allocUnsafe(actualLen);
            data.copy(chunk, 4, start, start + actualLen);
            sink(chunk);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function f(data, start, actualLen, sink) {
            const chunk = Buffer.alloc(actualLen);
            data.copy(chunk, 4, start, start + actualLen);
            sink(chunk);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'copy range sized by a reassigned variable proves nothing',
        code: `
          function f(data, start, sink) {
            let actualLen = data.length;
            const chunk = Buffer.allocUnsafe(actualLen);
            actualLen = 1;
            data.copy(chunk, 0, start, start + actualLen);
            sink(chunk);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function f(data, start, sink) {
            let actualLen = data.length;
            const chunk = Buffer.alloc(actualLen);
            actualLen = 1;
            data.copy(chunk, 0, start, start + actualLen);
            sink(chunk);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a zero offset with a length that stops short is partial: write(s, 0, 4)',
        code: 'function f(s, n, sink) { const b = Buffer.allocUnsafe(n); b.write(s, 0, 4); sink(b); }',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output:
                  'function f(s, n, sink) { const b = Buffer.alloc(n); b.write(s, 0, 4); sink(b); }',
              },
            ],
          },
        ],
      },
      {
        name: 'the property is sized by something other than the source it is filled from',
        code: `
          function f(ws, reason) {
            ws.msg = Buffer.allocUnsafeSlow(reason.length + 1);
            ws.msg.set(reason);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAllocSlow',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function f(ws, reason) {
            ws.msg = Buffer.alloc(reason.length + 1);
            ws.msg.set(reason);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the property is sent before it is filled',
        code: `
          function f(ws, reason) {
            ws.msg = Buffer.allocUnsafeSlow(reason.length);
            send(ws.msg);
            ws.msg.set(reason);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAllocSlow',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function f(ws, reason) {
            ws.msg = Buffer.alloc(reason.length);
            send(ws.msg);
            ws.msg.set(reason);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the property is filled from a different source than the one that sized it',
        code: `
          function f(ws, reason, other) {
            ws.msg = Buffer.allocUnsafeSlow(reason.length);
            ws.msg.set(other);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAllocSlow',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function f(ws, reason, other) {
            ws.msg = Buffer.alloc(reason.length);
            ws.msg.set(other);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the property is filled at an offset, which leaves the front',
        code: `
          function f(ws, reason) {
            ws.msg = Buffer.allocUnsafeSlow(reason.length);
            ws.msg.set(reason, 2);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAllocSlow',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function f(ws, reason) {
            ws.msg = Buffer.alloc(reason.length);
            ws.msg.set(reason, 2);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'fs.read callback, but the whole buffer is handed out regardless of the count',
        code: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.allocUnsafe(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
              self.push(buffer);
            });
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.alloc(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
              self.push(buffer);
            });
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'fs.read callback, but the buffer is used before the read has completed',
        code: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.allocUnsafe(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
              self.push(buffer.slice(0, bytesRead));
            });
            return buffer;
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.alloc(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
              self.push(buffer.slice(0, bytesRead));
            });
            return buffer;
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'fs.read callback whose count is reassigned before the slice',
        code: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.allocUnsafe(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
              bytesRead = toRead;
              self.push(buffer.slice(0, bytesRead));
            });
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          var fs = require('fs');
          function read(self, toRead) {
            var buffer = Buffer.alloc(toRead);
            fs.read(self.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
              bytesRead = toRead;
              self.push(buffer.slice(0, bytesRead));
            });
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the whole buffer is handed out on the arm where the count did NOT match its length',
        code: `
          import fs from 'node:fs';
          function f(fd, size, parser) {
            const buf = Buffer.allocUnsafe(size);
            const read = fs.readSync(fd, buf, 0, size, 0);
            parser.end(read === buf.byteLength ? buf.subarray(0, read) : buf);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import fs from 'node:fs';
          function f(fd, size, parser) {
            const buf = Buffer.alloc(size);
            const read = fs.readSync(fd, buf, 0, size, 0);
            parser.end(read === buf.byteLength ? buf.subarray(0, read) : buf);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the length test compares a different number than the read count',
        code: `
          import fs from 'node:fs';
          function f(fd, size, other, parser) {
            const buf = Buffer.allocUnsafe(size);
            const read = fs.readSync(fd, buf, 0, size, 0);
            parser.end(other === buf.byteLength ? buf : buf.subarray(0, read));
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import fs from 'node:fs';
          function f(fd, size, other, parser) {
            const buf = Buffer.alloc(size);
            const read = fs.readSync(fd, buf, 0, size, 0);
            parser.end(other === buf.byteLength ? buf : buf.subarray(0, read));
          }
        `,
              },
            ],
          },
        ],
      },
    ],
  });
});
