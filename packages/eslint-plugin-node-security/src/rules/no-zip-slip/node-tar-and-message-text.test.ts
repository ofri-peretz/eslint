/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two shapes that cannot write outside a directory, each with the lookalike
 * that still can.
 *
 * - node-tar's `extract` strips `..` and absolute paths itself. That is a
 *   property of the library, visible from the module binding and the options,
 *   and `preservePaths: true` switches it off. 4 of 8 findings on
 *   budibase/budibase.
 * - A joined path that only ever becomes message text opens no file. 1 of 1 on
 *   steipete/oracle: `path.resolve(cwd, attachment.path)` in an error.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noZipSlip } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-zip-slip — node-tar sanitises, and a path that is only text', () => {
  ruleTester.run('node-tar-and-message-text', noZipSlip, {
    valid: [
      {
        // @source budibase/budibase packages/server/src/sdk/workspace/backups/imports.ts:154
        // @found real-source scan
        name: 'FP: tar.extract with an options literal that leaves preservePaths off',
        code: `import * as tar from 'tar';
          export async function restore(file, dest) { await tar.extract({ file, cwd: dest }); }`,
      },
      {
        name: 'the x alias of node-tar',
        code: `import tar from 'tar';
          export async function restore(file, dest) { await tar.x({ file, cwd: dest }); }`,
      },
      {
        name: 'a named import of extract from node-tar piped from a stream',
        code: `import { extract } from 'tar';
          export function restore(stream, dest) { return stream.pipe(extract({ cwd: dest })); }`,
      },
      {
        name: 'preservePaths explicitly false',
        code: `const tar = require('tar');
          exports.restore = (file, dest) => tar.extract({ file, cwd: dest, preservePaths: false });`,
      },
      {
        // @source steipete/oracle src/browser/prompt.ts:252
        // @found real-source scan
        name: 'FP: a resolved path formatted into a thrown error message',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function check(cwd, attachment) {
            const abs = path.resolve(cwd, attachment.path);
            throw new Error('collision at ' + abs);
          }
          export const build = () => new JSZip();`,
      },
      {
        name: 'a path inside a template passed straight to an Error constructor',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function check(cwd, attachment) {
            throw new TypeError(\`bad \${path.join(cwd, attachment.path)}\`);
          }
          export const build = () => new JSZip();`,
      },
      {
        name: 'a path only written to the console',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function check(cwd, attachment) {
            console.warn('skipping', path.join(cwd, attachment.path));
          }
          export const build = () => new JSZip();`,
      },
      {
        name: 'a path thrown directly as the message',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function check(cwd, attachment) { throw path.join(cwd, attachment.path); }
          export const build = () => new JSZip();`,
      },
    ],
    invalid: [
      {
        name: 'node-tar with preservePaths: true, which turns the protection off',
        code: `import * as tar from 'tar';
          export async function restore(file, dest) { await tar.extract({ file, cwd: dest, preservePaths: true }); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'node-tar with preservePaths decided at runtime',
        code: `import * as tar from 'tar';
          export async function restore(file, dest, keep) { await tar.extract({ file, cwd: dest, preservePaths: keep }); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'node-tar with options held in a variable, which may set preservePaths',
        code: `import * as tar from 'tar';
          export async function restore(opts) { await tar.extract(opts); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'node-tar with a spread in the options',
        code: `import * as tar from 'tar';
          export async function restore(opts) { await tar.extract({ ...opts, cwd: '.' }); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'node-tar with a computed option key that could be preservePaths',
        code: `import * as tar from 'tar';
          export async function restore(k) { await tar.extract({ [k]: true, cwd: '.' }); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'an extract method on an object that merely holds a variable named tar',
        code: `export async function restore(tar, file, dest) { await tar.extract({ file, cwd: dest }); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'a different tar library, whose protection is not assumed',
        code: `import * as tar from 'tar-stream';
          export async function restore(file, dest) { await tar.extract({ file, cwd: dest }); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'another export of node-tar that is not extraction',
        code: `import * as tar from 'tar';
          import AdmZip from 'adm-zip';
          export function f(zip, dest) { new AdmZip(zip).extractAllTo(dest); tar.list({ file: zip }); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'a resolved path that is also used to open a file',
        code: `import path from 'path'; import fs from 'fs'; import JSZip from 'jszip';
          export function save(cwd, attachment, data) {
            const abs = path.resolve(cwd, attachment.path);
            fs.writeFileSync(abs, data);
            throw new Error('wrote ' + abs);
          }
          export const build = () => new JSZip();`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a path passed to a function that is not an Error constructor',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function save(cwd, attachment, write) {
            write(path.join(cwd, attachment.path));
          }
          export const build = () => new JSZip();`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'an Error constructor shadowed by a local function',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function save(cwd, attachment) {
            const Error = (p) => fs.writeFileSync(p, 'x');
            Error(path.join(cwd, attachment.path));
          }
          export const build = () => new JSZip();`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a path text built from a call result and returned',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function save(cwd, attachment) {
            return path.join(cwd, attachment.path);
          }
          export const build = () => new JSZip();`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a path bound to a const that is also read outside text',
        code: `import path from 'path'; import fs from 'fs'; import JSZip from 'jszip';
          export function save(cwd, attachment, data) {
            const abs = path.join(cwd, attachment.path);
            console.log(abs);
            fs.writeFileSync(abs, data);
          }
          export const build = () => new JSZip();`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a path bound to a name that appears in its own initialiser',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function save(cwd, attachment) {
            const abs = path.join(cwd, attachment.path) + abs;
          }
          export const build = () => new JSZip();`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a path bound to a let that is exported, so its readers are unknown',
        code: `import path from 'path'; import JSZip from 'jszip';
          export function save(cwd, attachment) {
            const abs = path.join(cwd, attachment.path);
            return { abs };
          }
          export const build = () => new JSZip();`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});
