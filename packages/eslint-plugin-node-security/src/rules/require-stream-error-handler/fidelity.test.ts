/**
 * require-stream-error-handler — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/require_stream_error_handler.qnt),
 * and the doc's self-contradictory helper section.
 *
 *   - `new PassThrough()` (and the other `node:stream` classes) was not a
 *     stream constructor, so an unhandled one was silent inline and named;
 *   - a stream handed to a helper that registers its listener was reported,
 *     while the doc filed that shape under "not detected".
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireStreamErrorHandler } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const STREAM = "import { PassThrough } from 'node:stream';";

describe('require-stream-error-handler fidelity', () => {
  ruleTester.run('stream classes and helpers', requireStreamErrorHandler, {
    valid: [
      {
        name: 'a Readable.fromWeb source with an error listener is fine',
        code: `import { Readable } from 'node:stream';
export function save(body: any, res: any) { const r = Readable.fromWeb(body); r.on('error', () => res.end()); r.pipe(res); }`,
      },
      {
        name: 'a Readable.fromWeb from a package that is not node:stream is not a node stream',
        code: `import { Readable } from 'readable-stream-lookalike';
export function save(body: any, res: any) { Readable.fromWeb(body).pipe(res); }`,
      },
      {
        name: 'an inherited fromWeb with an error listener on the stream is fine',
        code: `import { PassThrough } from 'node:stream';
export function save(body: any, res: any) { const s = PassThrough.fromWeb(body); s.on('error', () => res.end()); s.pipe(res); }`,
      },
      {
        name: 'fromWeb on a local class that shares the name is not a node stream',
        code: `class PassThrough { static fromWeb(body: any) { return body; } }
export function save(body: any, res: any) { PassThrough.fromWeb(body).pipe(res); }`,
      },
      {
        name: 'Readable.from is not Readable.fromWeb and is left alone',
        code: `import { Readable } from 'node:stream';
export function save(items: any, res: any) { Readable.from(items).pipe(res); }`,
      },
      {
        name: 'a call through Readable.fromWeb.call is not followed',
        code: `import { Readable } from 'node:stream';
export function save(body: any, res: any) { Readable.fromWeb.call(null, body).pipe(res); }`,
      },
      {
        name: 'a local Readable class with a fromWeb method is not a node stream',
        code: `const Readable = { fromWeb(x: unknown) { return x; } };
export function save(body: any, res: any) { Readable.fromWeb(body).pipe(res); }`,
      },
      {
        name: 'a named PassThrough with an error listener is fine',
        code: `${STREAM}
export function send(res: any) { const stream = new PassThrough(); stream.on('error', () => res.end()); stream.pipe(res); }`,
      },
      {
        name: 'a stream handed to a helper that may attach the listener is not reported',
        code: `import fs from 'node:fs';
declare function attachStandardHandlers(s: unknown): void;
export function send(p: string, res: any) { const s = fs.createReadStream(p); attachStandardHandlers(s); s.pipe(res); }`,
      },
      {
        name: 'a local class named PassThrough is not a node stream',
        code: `class PassThrough { pipe(d: unknown) { return d; } }
export function send(res: any) { new PassThrough().pipe(res); }`,
      },
    ],
    invalid: [
      {
        name: 'FN: PassThrough inherits Duplex.fromWeb, so its stream is a node stream with no listener',
        code: `import { PassThrough } from 'node:stream';
export function save(body: any, res: any) { PassThrough.fromWeb(body).pipe(res); }`,
        errors: [{ messageId: 'unhandledStreamError', line: 2, column: 45 }],
      },
      {
        name: 'FN: Transform inherits Duplex.fromWeb too',
        code: `import { Transform } from 'node:stream';
export function save(body: any, res: any) { Transform.fromWeb(body).pipe(res); }`,
        errors: [{ messageId: 'unhandledStreamError', line: 2, column: 45 }],
      },
      {
        // @source mockoon/mockoon update download, Readable.fromWeb(...).pipe(ws)
        // @found real-source scan
        name: 'FN: Readable.fromWeb source is reported, not the destination',
        code: `import { Readable } from 'node:stream';
import fs from 'node:fs';
export function save(body: any, p: string) { Readable.fromWeb(body).pipe(fs.createWriteStream(p)); }`,
        errors: [{ messageId: 'unhandledStreamError', line: 3, column: 46 }],
      },
      {
        // @found real-source scan
        name: 'FN: a Readable.fromWeb source is reported when the destination is a bare name',
        code: `import { Readable } from 'node:stream';
export function save(body: any, res: any) { Readable.fromWeb(body).pipe(res); }`,
        errors: [{ messageId: 'unhandledStreamError', line: 2, column: 45 }],
      },
      {
        // @found real-source scan
        name: 'FN: a Writable.fromWeb destination is reported',
        code: `import { Writable } from 'node:stream';
export function save(src: any, web: any) { src.pipe(Writable.fromWeb(web)); }`,
        errors: [{ messageId: 'unhandledStreamError' }],
      },
      {
        // @found real-source scan
        name: 'FN: a Duplex.fromWeb from a namespace import is reported',
        code: `import * as stream from 'node:stream';
export function save(web: any, res: any) { stream.Duplex.fromWeb(web).pipe(res); }`,
        errors: [{ messageId: 'unhandledStreamError' }],
      },
      {
        name: 'an inline PassThrough source is reported',
        code: `${STREAM}
export function send(res: any) { new PassThrough().pipe(res); }`,
        errors: [{ messageId: 'unhandledStreamError' }],
      },
      {
        name: 'an inline PassThrough destination is reported',
        code: `${STREAM}
export function send(file: any) { file.pipe(new PassThrough()); }`,
        errors: [{ messageId: 'unhandledStreamError' }],
      },
      {
        name: 'a named PassThrough with only a close listener is reported',
        code: `${STREAM}
export function send(res: any) { const stream = new PassThrough(); stream.on('close', () => res.end()); stream.pipe(res); }`,
        errors: [{ messageId: 'unhandledStreamError' }],
      },
      {
        name: 'a Transform from a namespace import is reported',
        code: `import * as stream from 'node:stream';
export function send(res: any) { new stream.Transform().pipe(res); }`,
        errors: [{ messageId: 'unhandledStreamError' }],
      },
    ],
  });
});
