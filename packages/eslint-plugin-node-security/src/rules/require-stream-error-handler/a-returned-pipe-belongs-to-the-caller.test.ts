/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `.pipe()` returns its destination. When that return value is the function's
 * own return value, the destination is the caller's to listen to.
 *
 * NestJS's Express and Node adapters (`platform-express/adapters/
 * express-adapter.ts:829`, `platform-node/adapters/node-adapter.ts:1080`) build
 * a checking `Transform` and `return stream.pipe(checked)`; the caller attaches
 * the error handler. The rule reported the Transform. A source the function
 * constructs is not handed back, so it still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireStreamErrorHandler } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const unhandled = [{ messageId: 'unhandledStreamError' as const }];

ruleTester.run(
  'a returned pipe belongs to the caller',
  requireStreamErrorHandler,
  {
    valid: [
      {
        // @source nestjs/nest packages/platform-express/adapters/express-adapter.ts:829
        // @found real-source scan
        name: 'FP: a checking Transform returned through pipe()',
        code: `
        import { Transform } from 'stream';
        function toWritableChunks(stream) {
          const checked = new Transform({ objectMode: true, transform(chunk, _e, cb) { cb(null, chunk); } });
          return stream.pipe(checked);
        }
      `,
      },
      {
        name: 'an arrow that returns the pipe',
        code: `
        import { PassThrough } from 'stream';
        const wrap = (src) => src.pipe(new PassThrough());
      `,
      },
      {
        name: 'a method that returns the pipe from inside a branch',
        code: `
        import { PassThrough } from 'stream';
        class Adapter {
          toStream(src, raw) {
            if (raw) {
              return src.pipe(new PassThrough());
            }
            return src;
          }
        }
      `,
      },
    ],
    invalid: [
      {
        name: 'a callback whose result forEach discards still reports',
        code: `
        import { createWriteStream } from 'node:fs';
        function copy(src, path) {
          [src].forEach(s => s.pipe(createWriteStream(path)));
        }
      `,
        errors: unhandled,
      },
      {
        name: 'a returned pipe inside a callback function still reports',
        code: `
        import { PassThrough } from 'stream';
        function copy(sources) {
          sources.forEach(function (s) { return s.pipe(new PassThrough()); });
        }
      `,
        errors: unhandled,
      },
      {
        name: 'a returned pipe inside a constructor callback still reports',
        code: `
        import { PassThrough } from 'stream';
        const done = new Promise(function (resolve) { return src.pipe(new PassThrough()); });
      `,
        errors: unhandled,
      },
      {
        name: 'the same pipe not returned still reports',
        code: `
        import { Transform } from 'stream';
        function send(stream, res) {
          const checked = new Transform({ transform(chunk, _e, cb) { cb(null, chunk); } });
          stream.pipe(checked);
          return res;
        }
      `,
        errors: unhandled,
      },
      {
        name: 'a source built here is not handed back, so it still reports',
        code: `
        import { PassThrough } from 'stream';
        function wrap(dest) {
          const src = new PassThrough();
          return src.pipe(dest);
        }
      `,
        errors: unhandled,
      },
    ],
  },
);
