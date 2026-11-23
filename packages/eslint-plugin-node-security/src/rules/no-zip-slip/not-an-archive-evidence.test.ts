/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Three shapes that are not an archive entry reaching a path join, found
 * linting popular Node.js packages, each with a lookalike that still reports.
 *
 * - `zlib.createGzip()` compresses ONE stream and carries no entry names, so
 *   it is not archive context (winston's file transport).
 * - A call to a function the project imports from a RELATIVE module is the
 *   project's own code; the sink is judged where it is written.
 * - The extraction DESTINATION a caller passes in (`opts.path`) is the base
 *   other code joins an entry onto, not an entry.
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

describe('no-zip-slip — not an archive entry', () => {
  ruleTester.run('not-an-archive-evidence', noZipSlip, {
    valid: [
      {
        // @source winstonjs/winston lib/winston/transports/file.js:294,437,619
        // @found linting popular Node.js packages
        name: 'FP: this.dirname + this.filename joined in a file that only gzips a log stream',
        code: `
          const path = require('path');
          const fs = require('fs');
          const zlib = require('zlib');
          class File {
            constructor(options) {
              this.dirname = options.dirname;
              this.filename = options.filename;
            }
            _createStream(source) {
              const fullpath = path.join(this.dirname, this.filename);
              return fs.createWriteStream(fullpath);
            }
            _compress(src, dest) {
              const gzip = zlib.createGzip();
              gzip.on('error', () => {});
              src.pipe(gzip).pipe(dest);
            }
          }
        `,
      },
      {
        // @source winstonjs/winston lib/winston/transports/file.js:787
        // @found linting popular Node.js packages
        name: 'FP: a gunzip stream is one stream, not an archive',
        code: `
          const path = require('path');
          const zlib = require('zlib');
          function open(options) {
            const gunzip = zlib.createGunzip();
            gunzip.on('error', () => {});
            return path.join(options.dirname, options.filename);
          }
        `,
      },
      {
        // @source ZJONSSON/node-unzipper lib/Open/directory.js:157,238
        // @found linting popular Node.js packages
        name: 'FP: the caller-supplied destination is normalized, then used as the base of the entry join; the call is to a project-local ./unzip module',
        code: `
          import path from 'path';
          import unzip from './unzip.js';
          function open(source, vars, _password) {
            vars.stream = function (password) {
              return unzip(source, vars.offsetToLocalFileHeader, password, vars, 100);
            };
            vars.extract = async function (opts) {
              if (!opts || !opts.path) throw new Error('PATH_MISSING');
              opts.path = path.resolve(path.normalize(opts.path));
              return Promise.all(vars.files.map(async function (entry) {
                const extractPath = path.join(opts.path, entry.path.replace(/\\\\/g, '/'));
                const rel = path.relative(opts.path, extractPath);
                if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return;
                return extractPath;
              }));
            };
          }
        `,
      },
      {
        // @source ZJONSSON/node-unzipper lib/Open/directory.js:238
        // @found linting popular Node.js packages
        name: 'FP: a CommonJS require of a relative module is project-local too',
        code: `
          const unzip = require('./unzip');
          function stream(source, vars, password) {
            return unzip(source, vars.offset, password, vars, 100);
          }
        `,
      },
      {
        // @source ZJONSSON/node-unzipper lib/Open/directory.js:157
        // @found linting popular Node.js packages
        name: 'FP: the destination is normalized and used as the join base, with no containment guard to excuse it',
        code: `
          import path from 'path';
          import AdmZip from 'adm-zip';
          function make(vars) {
            vars.extract = async function (opts) {
              opts.path = path.resolve(path.normalize(opts.path));
              return vars.files.map(function (entry) {
                return path.join(opts.path, entry.path.replace(/\\\\/g, '/'));
              });
            };
          }
        `,
      },
      {
        name: 'a property of a relative require is project-local too',
        code: `
          const unzip = require('./helpers').unzip;
          function stream(source, vars, password) {
            return unzip(source, vars.offset, password, vars, 100);
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'the same join in a file that imports an archive library still reports',
        code: `
          const path = require('path');
          const AdmZip = require('adm-zip');
          class File {
            constructor(options) {
              this.dirname = options.dirname;
              this.filename = options.filename;
            }
            open() {
              return path.join(this.dirname, this.filename);
            }
          }
        `,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'a gunzip piped into a tar extractor is still an archive',
        code: `
          const path = require('path');
          const zlib = require('zlib');
          function extract(input, dest) {
            const tarStream = makeTar();
            input.pipe(zlib.createGunzip()).pipe(tarStream.extract());
            tarStream.on('entry', (header) => {
              const target = path.join(dest, header.name);
              return target;
            });
          }
        `,
        errors: [
          { messageId: 'unsafeArchiveExtraction' },
          { messageId: 'unvalidatedArchivePath' },
        ],
      },
      {
        name: 'a bare unzip imported from a package (not a relative module) still reports',
        code: `
          import unzip from 'some-unzip-lib';
          unzip(upload, destination);
        `,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'a relative require that is reassigned is not proven project-local',
        code: `
          let unzip = require('./unzip');
          unzip = require('some-unzip-lib');
          unzip(upload, destination);
        `,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      {
        name: 'a path normalized and never used as the base of an entry join still reports',
        code: `
          import path from 'path';
          import AdmZip from 'adm-zip';
          function extract(opts) {
            return path.resolve(path.normalize(opts.path));
          }
        `,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'the entry itself is not a destination: its own field used as a join base still reports',
        code: `
          import path from 'path';
          import AdmZip from 'adm-zip';
          function extract(entry) {
            return path.join(entry.path, entry.name);
          }
        `,
        errors: [
          { messageId: 'unvalidatedArchivePath' },
          { messageId: 'unvalidatedArchivePath' },
        ],
      },
      {
        name: 'a join base with a runtime-decided key proves nothing about the destination',
        code: `
          import path from 'path';
          import AdmZip from 'adm-zip';
          function extract(opts, key, entry) {
            return path.join(opts[key], entry.path);
          }
        `,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'an entry reached through a runtime index has no binding key, so it still reports',
        code: `
          import path from 'path';
          import AdmZip from 'adm-zip';
          function extract(dest, entries, i) {
            return path.join(dest, entries[i].path);
          }
        `,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      {
        name: 'an entry read from an undeclared global has no binding, so it still reports',
        code: `
          import path from 'path';
          import AdmZip from 'adm-zip';
          function extract(dest) {
            return path.join(dest, currentEntry.path.replace('x', 'y'));
          }
          function plain(dest) {
            return path.join(dest, currentEntry.path);
          }
        `,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});
