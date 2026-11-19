/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A buffer filled by a file read and then read only up to `bytesRead`.
 *
 * `fs.readSync(fd, buf, 0, n)` and `handle.read(buf, 0, n)` write bytes
 * `[0, bytesRead)` from offset 0. A buffer then taken only through
 * `buf.subarray(0, bytesRead)`, `buf.slice(0, bytesRead)` or
 * `buf.toString(enc, 0, bytesRead)` exposes exactly the bytes the read wrote;
 * the uninitialized tail is never looked at. That is the reason to choose
 * `allocUnsafe` for a read buffer, and tolaria's MCP server does exactly this.
 *
 * The bound has to be THAT read's count — the `const` the call returned, or
 * `.bytesRead` off the `const` its awaited result was bound to — and the read
 * has to start at offset 0. Anything else (a different count, a literal
 * length, a read at an offset, any other use) is still a read of unknown
 * bytes and still reports.
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

describe('no-unsafe-buffer-alloc — read only up to bytesRead', () => {
  ruleTester.run('bytes-read', noUnsafeBufferAlloc, {
    valid: [
      {
        // @source refactoringhq/tolaria mcp-server/vault.js:492
        // @found real-source scan
        name: 'FP: handle.read into the buffer, then subarray(0, readResult.bytesRead)',
        code: `
          import { open } from 'node:fs/promises';
          async function readUtf8FilePrefix(filePath, byteLimit) {
            const handle = await open(filePath, 'r');
            try {
              const buffer = Buffer.allocUnsafe(byteLimit);
              const readResult = await handle.read(buffer, 0, byteLimit, 0);
              const stats = await handle.stat();
              return {
                text: buffer.subarray(0, readResult.bytesRead).toString('utf-8'),
                truncated: stats.size > readResult.bytesRead,
              };
            } finally {
              await handle.close();
            }
          }
        `,
      },
      {
        name: 'fs.readSync returns the count; toString reads up to it',
        code: `
          import fs from 'node:fs';
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            const bytesRead = fs.readSync(fd, buf, 0, n, 0);
            return buf.toString('utf8', 0, bytesRead);
          }
        `,
      },
      {
        name: 'a destructured bytesRead, then slice(0, bytesRead)',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const { bytesRead } = await handle.read(buf, 0, n, 0);
            return buf.slice(0, bytesRead);
          }
        `,
      },
      {
        name: 'a bare readSync with the offset omitted starts at 0',
        code: `
          import { readSync } from 'node:fs';
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            const count = readSync(fd, buf);
            return buf.subarray(0, count);
          }
        `,
      },
      {
        name: 'metadata reads between the read and the bounded read disclose nothing',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, buf.length, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
      },
      {
        name: 'zeroing the tail after the read is a write, not a read',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, n, 0);
            buf.fill(0, r.bytesRead);
            return buf.subarray(0, r.bytesRead);
          }
        `,
      },
      {
        name: 'a renamed destructured count is the same count',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const { bytesRead: got } = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, got);
          }
        `,
      },
      {
        name: 'fs.promises.open through the fs namespace is the same FileHandle',
        code: `
          import fs from 'node:fs';
          export async function head(file, n) {
            const handle = await fs.promises.open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
      },
      {
        name: 'copying the count out of the result is a read of it',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            let got;
            got = r.bytesRead;
            log(got);
            return buf.subarray(0, r.bytesRead);
          }
        `,
      },
      {
        name: 'testing the count is a read of it',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            if (typeof r.bytesRead !== 'number') throw new Error('short');
            return buf.subarray(0, r.bytesRead);
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'nor one bumped',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            r.bytesRead++;
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(16);
            const r = await handle.read(buf, 0, 16, 0);
            r.bytesRead++;
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a handle reached through this is not one this file opened',
        code: `
          class Reader {
            async head() {
              const buf = Buffer.allocUnsafe(16);
              const r = await this.handle.read(buf, 0, 16, 0);
              return buf.subarray(0, r.bytesRead);
            }
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          class Reader {
            async head() {
              const buf = Buffer.alloc(16);
              const r = await this.handle.read(buf, 0, 16, 0);
              return buf.subarray(0, r.bytesRead);
            }
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a local object with a read method is not a FileHandle (raised by CodeRabbit on #1581)',
        code: `
          const reader = { async read() { return { bytesRead: 16 }; } };
          export async function head() {
            const buf = Buffer.allocUnsafe(16);
            const r = await reader.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          const reader = { async read() { return { bytesRead: 16 }; } };
          export async function head() {
            const buf = Buffer.alloc(16);
            const r = await reader.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: "a local readSync is not Node's",
        code: `
          function readSync() { return 16; }
          export function head(fd) {
            const buf = Buffer.allocUnsafe(16);
            const count = readSync(fd, buf, 0, 16, 0);
            return buf.subarray(0, count);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          function readSync() { return 16; }
          export function head(fd) {
            const buf = Buffer.alloc(16);
            const count = readSync(fd, buf, 0, 16, 0);
            return buf.subarray(0, count);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a handle that was not opened in this file proves nothing',
        code: `
          export async function head(handle, n) {
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          export async function head(handle, n) {
            const buf = Buffer.alloc(n);
            const r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the result carries the whole buffer out as r.buffer',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, n, 0);
            return r.buffer;
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const r = await handle.read(buf, 0, n, 0);
            return r.buffer;
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'destructuring the buffer next to the count hands it out under a second name',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const { bytesRead, buffer } = await handle.read(buf, 0, n, 0);
            send(buffer);
            return buf.subarray(0, bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const { bytesRead, buffer } = await handle.read(buf, 0, n, 0);
            send(buffer);
            return buf.subarray(0, bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a bytesRead overwritten after the read is not the count',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            r.bytesRead = 16;
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(16);
            const r = await handle.read(buf, 0, 16, 0);
            r.bytesRead = 16;
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'nor one deleted',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            delete r.bytesRead;
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(16);
            const r = await handle.read(buf, 0, 16, 0);
            delete r.bytesRead;
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a let handle can be swapped for another object',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            let handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            let handle = await open(file, 'r');
            const buf = Buffer.alloc(16);
            const r = await handle.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a handle from a call that is not fs open is not a FileHandle',
        code: `
          export async function head(file) {
            const handle = await openSomething(file);
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          export async function head(file) {
            const handle = await openSomething(file);
            const buf = Buffer.alloc(16);
            const r = await handle.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a handle that is not awaited is a promise',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = open(file, 'r');
            const buf = Buffer.allocUnsafe(16);
            const r = await handle.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file) {
            const handle = open(file, 'r');
            const buf = Buffer.alloc(16);
            const r = await handle.read(buf, 0, 16, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a reader reached through a call names no read this rule knows',
        code: `
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            const count = pickReader()(fd, buf, 0, n, 0);
            return buf.subarray(0, count);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          export function head(fd, n) {
            const buf = Buffer.alloc(n);
            const count = pickReader()(fd, buf, 0, n, 0);
            return buf.subarray(0, count);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'one byte past the count is one uninitialized byte',
        code: `
          import fs from 'node:fs';
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            const count = fs.readSync(fd, buf, 0, n, 0);
            return buf.subarray(0, count + 1);
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
          export function head(fd, n) {
            const buf = Buffer.alloc(n);
            const count = fs.readSync(fd, buf, 0, n, 0);
            return buf.subarray(0, count + 1);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'readSync at an offset leaves the bytes before it uninitialized',
        code: `
          import fs from 'node:fs';
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            const count = fs.readSync(fd, buf, 4, n - 4, 0);
            return buf.subarray(0, count);
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
          export function head(fd, n) {
            const buf = Buffer.alloc(n);
            const count = fs.readSync(fd, buf, 4, n - 4, 0);
            return buf.subarray(0, count);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'destructuring only the buffer gives no count to stop at',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const { buffer } = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, buffer.length);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const { buffer } = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, buffer.length);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a let result can be rebound before .bytesRead is read',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            let r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            let r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a defaulted count is not followed',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const { bytesRead = n } = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const { bytesRead = n } = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the result object itself is not the count',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.buffer.length);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.buffer.length);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'toString with no bound reads the whole buffer',
        code: `
          import fs from 'node:fs';
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            const count = fs.readSync(fd, buf, 0, n, 0);
            log(count);
            return buf.toString('utf8');
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
          export function head(fd, n) {
            const buf = Buffer.alloc(n);
            const count = fs.readSync(fd, buf, 0, n, 0);
            log(count);
            return buf.toString('utf8');
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'passing the method on is not a bounded read',
        code: `
          import fs from 'node:fs';
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            const count = fs.readSync(fd, buf, 0, n, 0);
            return [buf.subarray, count];
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
          export function head(fd, n) {
            const buf = Buffer.alloc(n);
            const count = fs.readSync(fd, buf, 0, n, 0);
            return [buf.subarray, count];
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the whole buffer is returned after a read: the tail is uninitialized',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            await handle.read(buf, 0, n, 0);
            return buf;
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            await handle.read(buf, 0, n, 0);
            return buf;
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a bound that is not the read count is not a bound',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, n);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const r = await handle.read(buf, 0, n, 0);
            return buf.subarray(0, n);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a read at an offset leaves bytes before it uninitialized',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 4, n - 4, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const r = await handle.read(buf, 4, n - 4, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a count from a DIFFERENT read does not bound this buffer',
        code: `
          import fs from 'node:fs';
          export function head(fd, n, other) {
            const buf = Buffer.allocUnsafe(n);
            const theirs = fs.readSync(fd, other, 0, n, 0);
            fs.readSync(fd, buf, 0, n, 0);
            return buf.subarray(0, theirs);
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
          export function head(fd, n, other) {
            const buf = Buffer.alloc(n);
            const theirs = fs.readSync(fd, other, 0, n, 0);
            fs.readSync(fd, buf, 0, n, 0);
            return buf.subarray(0, theirs);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a bounded read followed by an unbounded one still reports',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = await handle.read(buf, 0, n, 0);
            log(buf.subarray(0, r.bytesRead));
            return buf;
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const r = await handle.read(buf, 0, n, 0);
            log(buf.subarray(0, r.bytesRead));
            return buf;
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'a let count can be reassigned before the bound reads it',
        code: `
          import fs from 'node:fs';
          export function head(fd, n) {
            const buf = Buffer.allocUnsafe(n);
            let count = fs.readSync(fd, buf, 0, n, 0);
            count = n;
            return buf.subarray(0, count);
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
          export function head(fd, n) {
            const buf = Buffer.alloc(n);
            let count = fs.readSync(fd, buf, 0, n, 0);
            count = n;
            return buf.subarray(0, count);
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: 'the read result is not awaited: .bytesRead off a promise is undefined',
        code: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.allocUnsafe(n);
            const r = handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.bytesRead);
          }
        `,
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: `
          import { open } from 'node:fs/promises';
          export async function head(file, n) {
            const handle = await open(file, 'r');
            const buf = Buffer.alloc(n);
            const r = handle.read(buf, 0, n, 0);
            return buf.subarray(0, r.bytesRead);
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
