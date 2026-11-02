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
