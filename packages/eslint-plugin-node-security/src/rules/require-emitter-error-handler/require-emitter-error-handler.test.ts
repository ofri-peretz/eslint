/**
 * @fileoverview Tests for require-emitter-error-handler (CWE-248)
 *
 * The two headline invalid cases are real production crashes found on
 * 2026-11-24: parse-server's GraphQL file upload and Eleventy's spawn helper.
 * `exec` and `execFile` are valid on purpose: Node attaches its own 'error'
 * listener inside both.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireEmitterErrorHandler, EMITTER_FACTORIES } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const bad = [{ messageId: 'unhandledEmitterError' as const }];

describe('require-emitter-error-handler', () => {
  ruleTester.run('require-emitter-error-handler', requireEmitterErrorHandler, {
    valid: [
      {
        name: 'a request with an error listener is handled',
        code: `import http from 'node:http';
export function f(u: string) { const req = http.request(u); req.on('error', log); req.end(); }`,
      },
      {
        name: 'once and addListener register the same handler',
        code: `import http from 'http';
const a = http.get(u); a.once('error', log);
const b = http.get(u); b.addListener('error', log);
const c = http.get(u); c['on']('error', log);`,
      },
      {
        name: 'an inline chain that ends in an error listener is handled',
        code: `import https from 'https';
https.get(u, cb).on('error', log);
https.get(u).setTimeout(5, t).on('error', log);`,
      },
      {
        name: 'the listener may be attached after the first use',
        code: `import { spawn } from 'node:child_process';
const child = spawn('git', ['log']); child.stdout.on('data', d); child.on('error', log);`,
      },
      {
        name: 'a listener attached from a closure still counts',
        code: `import { spawn } from 'child_process';
const child = spawn('git'); setup(() => child.on('error', log));`,
      },
      {
        name: 'a non-null assertion or cast around the emitter does not hide its listener',
        code: `import http from 'http';
const a = http.get(u); a!.on('error', log);
const b = http.get(u); (b as any).on('error', log);`,
      },
      {
        name: 'an emitter that is returned escapes to the caller',
        code: `import http from 'http';
export function open(u: string) { const req = http.request(u); return req; }
export const direct = (u: string) => http.get(u);
export function inline(u: string) { return http.get(u); }`,
      },
      {
        name: 'an emitter passed to another function escapes (ceiling)',
        code: `import { spawn } from 'child_process';
const child = spawn('git'); attachHandlers(child);`,
      },
      {
        name: 'an emitter stored on an object escapes (ceiling)',
        code: `import http from 'http';
class C { open(u) { const req = http.get(u); this.req = req; } }`,
      },
      {
        name: 'events.once wraps the emitter and surfaces the error',
        code: `import { once } from 'node:events';
import { spawn } from 'node:child_process';
const child = spawn('git'); await once(child, 'exit');`,
      },
      {
        name: 'stream.pipeline and finished take the emitter',
        code: `import { pipeline, finished } from 'node:stream';
import http from 'http';
const req = http.request(u); pipeline(src, req, done);
const r2 = http.request(u); finished(r2, done);`,
      },
      {
        name: 'inline emitter passed straight to pipeline escapes',
        code: `import { pipeline } from 'node:stream/promises';
import http from 'http';
await pipeline(src, http.request(u));`,
      },
      {
        name: 'exec with a callback: the callback receives the error',
        code: `import { exec } from 'node:child_process';
exec('ls', (err, out) => done(err, out));`,
      },
      {
        name: 'exec and execFile never throw an unhandled error event: Node listens itself',
        code: `import { exec, execFile } from 'node:child_process';
const a = exec('ls'); const b = execFile('git', ['log']);`,
      },
      {
        name: 'a promisified exec is not the callback form and resolves to no module',
        code: `import { promisify } from 'node:util';
import { exec } from 'node:child_process';
const run = promisify(exec);
await run('ls');
await promisify(exec)('ls');`,
      },
      {
        name: 'synchronous variants have no emitter',
        code: `import { spawnSync, execSync } from 'node:child_process';
spawnSync('git'); execSync('ls');`,
      },
      {
        name: 'a local function named request is not http.request',
        code: `function request(u) { return u; }
const req = request(u); const spawn = (c) => c; spawn('git');`,
      },
      {
        name: 'a method named request on another object is not http.request',
        code: `const client = makeClient(); const r = client.request(u); const s = axios.get(u);`,
      },
      {
        name: 'a local require shadow is not the node loader',
        code: `function f(require) { const http = require('http'); http.get(u); }`,
      },
      {
        name: 'a reassigned binding is not provably the emitter',
        code: `import http from 'http';
let req = http.get(u); req = other();`,
      },
      {
        name: 'a destructured emitter binding abstains',
        code: `import http from 'http';
const { socket } = http.get(u);`,
      },
    ],
    invalid: [
      {
        // @source parse-community/parse-server src/GraphQL/loaders/filesMutations.js:24-47
        // @found real-source scan
        name: 'FN: parse-server — request piped into, no error listener, try/catch cannot catch it',
        code: `import http from 'http';
export function handleUpload(stream: any, url: string) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST' }, (res) => resolve(res));
    stream.pipe(req);
  });
}`,
        errors: bad,
      },
      {
        // @source 11ty/eleventy src/Util/spawn.js:6
        // @found real-source scan
        name: 'FN: Eleventy — spawn of a binary that may be missing, listeners for stdout and close only',
        code: `import { spawn } from 'node:child_process';
export default function spawnAsync(command: string, args: string[], options: object) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    child.stdout.on('data', (d: string) => { stdout += d; });
    child.on('close', (code: number) => (code ? reject(code) : resolve(stdout)));
  });
}`,
        errors: bad,
      },
      {
        name: 'a close listener is not an error listener',
        code: `import { spawn } from 'child_process';
const c = spawn('git'); c.on('close', done);`,
        errors: bad,
      },
      {
        name: 'an inline request with no chain is reported',
        code: `import http from 'http'; http.get(u, cb);`,
        errors: bad,
      },
      {
        name: 'an inline chain that never reaches an error listener is reported',
        code: `import https from 'https'; https.get(u).on('response', cb);`,
        errors: bad,
      },
      {
        name: 'being the destination of pipe is not a listener',
        code: `import https from 'https'; src.pipe(https.request(u));`,
        errors: bad,
      },
      {
        name: 'the emitter used as a pipe source is not a listener',
        code: `import { spawn } from 'child_process';
const c = spawn('ls'); c.stdout.pipe(out); c.pipe(sink);`,
        errors: bad,
      },
      {
        name: 'a listener on a different emitter does not cover this one',
        code: `import http from 'http';
const req = http.request(u); other.on('error', log);`,
        errors: bad,
      },
      {
        name: 'an optional-call chain without an error listener is reported',
        code: `import http from 'http'; http.get(u)?.on('response', cb);`,
        errors: bad,
      },
      {
        name: 'a non-null assertion does not hide a missing listener',
        code: `import http from 'http'; http.get(u)!.on('response', cb);`,
        errors: bad,
      },
      {
        name: 'a cast request with no listener is reported',
        code: `import http from 'http'; (http.get(u) as any).end();`,
        errors: bad,
      },
      {
        name: 'one finding per unhandled emitter',
        code: `import http from 'http';
import { spawn } from 'child_process';
const a = http.get(u); const b = spawn('git'); b.on('error', log);`,
        errors: bad,
      },
      // Aliasing, destructuring, node: specifiers, require.
      {
        name: 'a renamed default import is still http',
        code: `import h from 'node:http'; h.request(u);`,
        errors: bad,
      },
      {
        name: 'a namespace import',
        code: `import * as https from 'node:https'; https.get(u);`,
        errors: bad,
      },
      {
        name: 'a destructured named import with an alias',
        code: `import { request as send } from 'http'; send(u);`,
        errors: bad,
      },
      {
        name: 'a destructured require with an alias',
        code: `const { spawn: run } = require('node:child_process'); run('git');`,
        errors: bad,
      },
      {
        name: 'a required module object',
        code: `const cp = require('child_process'); cp.fork('./worker.js');`,
        errors: bad,
      },
      {
        name: 'a direct require call',
        code: `require('node:https').request(u);`,
        errors: bad,
      },
      {
        name: 'a computed property spelling',
        code: `import http from 'http'; http['get'](u);`,
        errors: bad,
      },
      // One invalid case per table entry: removing the entry turns it red.
      {
        name: 'table entry http.request is an unhandled emitter',
        code: `import m from 'http'; const e = m.request(a);`,
        errors: bad,
      },
      {
        name: 'table entry http.get is an unhandled emitter',
        code: `import m from 'http'; const e = m.get(a);`,
        errors: bad,
      },
      {
        name: 'table entry https.request is an unhandled emitter',
        code: `import m from 'https'; const e = m.request(a);`,
        errors: bad,
      },
      {
        name: 'table entry https.get is an unhandled emitter',
        code: `import m from 'https'; const e = m.get(a);`,
        errors: bad,
      },
      {
        name: 'table entry child_process.spawn is an unhandled emitter',
        code: `import m from 'child_process'; const e = m.spawn(a);`,
        errors: bad,
      },
      {
        name: 'table entry child_process.fork is an unhandled emitter',
        code: `import m from 'child_process'; const e = m.fork(a);`,
        errors: bad,
      },
    ],
  });

  describe('the factory table', () => {
    it('lists exactly the proven emitters', async () => {
      const { expect } = await import('vitest');
      expect(
        Object.fromEntries(
          Object.entries(EMITTER_FACTORIES).map(([k, v]) => [k, [...v].sort()]),
        ),
      ).toEqual({
        http: ['get', 'request'],
        https: ['get', 'request'],
        child_process: ['fork', 'spawn'],
      });
    });
  });
});
