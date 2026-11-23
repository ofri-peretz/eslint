/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `.pipe(dest)` returns `dest`, and `.on()` returns its emitter, so a chain
 * that ends in `.on('error', h)` has attached the listener to the stream the
 * chain last piped into. Found linting popular Node.js packages.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { requireStreamErrorHandler } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const reports = [{ messageId: 'unhandledStreamError' as const }];

describe('require-stream-error-handler — listener on the pipe result', () => {
  ruleTester.run('listener-on-the-pipe-result', requireStreamErrorHandler, {
    valid: [
      {
        // @source ZJONSSON/node-unzipper lib/PullStream.js:125
        // @found linting popular Node.js packages
        name: 'FP: the destination Transform is covered by the .on("error") that ends the chain',
        code: `
          import { Transform } from 'stream';
          function pull(self, eof, resolve, reject) {
            const concatStream = new Transform({ transform(d, e, cb) { cb(); } });
            return new Promise(function () {
              self.stream(eof)
                .on('error', reject)
                .pipe(concatStream)
                .on('finish', function () { resolve(1); })
                .on('error', reject);
            });
          }
        `,
      },
      {
        name: 'a listener straight after the pipe covers the destination',
        code: `
          const fs = require('fs');
          function copy(src, onError) {
            const out = fs.createWriteStream('/tmp/out');
            src.on('error', onError).pipe(out).on('error', onError);
          }
        `,
      },
      {
        // @source ZJONSSON/node-unzipper lib/Open/unzip.js:102
        // @found linting popular Node.js packages
        name: 'FP: a PassThrough built here, piped into, and returned to the caller who owns its listeners',
        code: `
          import { PassThrough } from 'stream';
          export default function unzip(source, offset) {
            const entry = new PassThrough();
            const req = source.stream(offset);
            req.on('error', (e) => entry.emit('error', e));
            req.pipe(entry);
            return entry;
          }
        `,
      },
      {
        name: 'a pipe into a call result is not a stream this rule can name, so it abstains',
        code: `
          function copy(src, onError) {
            src.on('error', onError).pipe(makeDestination()).on('error', onError);
          }
        `,
      },
      {
        // Review: the same listener on an inline destination.
        name: 'an inline destination covered by the listener that ends the chain',
        code: `
          const fs = require('fs');
          function copy(src, fail) {
            src.on('error', fail);
            src.pipe(fs.createWriteStream('output')).on('error', fail);
          }
        `,
      },
      {
        name: 'a pipe with no destination argument names nothing the listener could cover',
        code: `
          function copy(src, fail) {
            src.on('error', fail);
            src.pipe().on('error', fail);
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a chain whose listener is not on "error" leaves the destination unhandled',
        code: `
          import { Transform } from 'stream';
          function pull(self, eof, resolve, reject) {
            const concatStream = new Transform({ transform(d, e, cb) { cb(); } });
            self.stream(eof)
              .on('error', reject)
              .pipe(concatStream)
              .on('finish', function () { resolve(1); });
          }
        `,
        errors: reports,
      },
      {
        name: 'a listener on a different pipe in the chain does not cover this destination',
        code: `
          import { Transform } from 'stream';
          function pull(self, other, reject) {
            const first = new Transform({});
            const second = new Transform({});
            self.pipe(first).pipe(second).on('error', reject);
          }
        `,
        errors: reports,
      },
      {
        name: 'a stream piped into and never returned, passed on or listened to still reports',
        code: `
          import { PassThrough } from 'stream';
          export default function unzip(source, offset) {
            const entry = new PassThrough();
            const req = source.stream(offset);
            req.pipe(entry);
            return 1;
          }
        `,
        errors: reports,
      },
      {
        name: 'a same-named stream returned from a sibling function does not cover this one',
        code: `
          import { PassThrough } from 'stream';
          export function open(source) {
            const entry = new PassThrough();
            return entry;
          }
          export function copy(source) {
            const entry = new PassThrough();
            source.pipe(entry);
            return 1;
          }
        `,
        errors: reports,
      },
      {
        name: 'a stream declared in an inner scope is not the outer binding that is returned',
        code: `
          import { PassThrough } from 'stream';
          export function open(source) {
            const entry = new PassThrough();
            if (source) {
              const inner = new PassThrough();
              source.pipe(inner);
            }
            return entry;
          }
        `,
        errors: reports,
      },
      {
        name: 'returning an undeclared name proves nothing about any stream',
        code: `
          import { PassThrough } from 'stream';
          export function copy(source) {
            const entry = new PassThrough();
            source.pipe(entry);
            return elsewhere;
          }
        `,
        errors: reports,
      },
      {
        name: 'a name bound in another function and unbound here is still judged by name',
        code: `
          import { PassThrough } from 'stream';
          export function make() {
            const entry = new PassThrough();
            return entry;
          }
          export function copy(source) {
            source.pipe(entry);
          }
        `,
        errors: reports,
      },
      {
        name: 'the same inline destination without the final listener still reports',
        code: `
          const fs = require('fs');
          function copy(src, fail) {
            src.on('error', fail);
            src.pipe(fs.createWriteStream('output'));
          }
        `,
        errors: reports,
      },
      {
        // Review: an unrelated parameter that is returned does not cover a different binding.
        name: 'a parameter named like the stream, returned by an unrelated function, does not cover it',
        code: `
          const fs = require('fs');
          function identity(stream) { return stream; }
          const stream = fs.createReadStream('input');
          stream.pipe(res);
        `,
        errors: reports,
      },
      {
        name: 'returning a different stream does not cover this one',
        code: `
          import { PassThrough } from 'stream';
          export default function unzip(source, other) {
            const entry = new PassThrough();
            source.pipe(entry);
            return other;
          }
        `,
        errors: reports,
      },
      {
        name: 'a listener on a call result that is not a pipe or a listener chain covers nothing',
        code: `
          import { Transform } from 'stream';
          function pull(self, reject) {
            const sink = new Transform({});
            self.pipe(sink);
            makeEmitter().on('error', reject);
          }
        `,
        errors: reports,
      },
    ],
  });
});
