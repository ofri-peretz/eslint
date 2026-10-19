/**
 * no-arbitrary-file-access — promise-API sinks, later assignments, and a
 * safe-sounding parameter whose caller passes the request.
 *
 * Owner decisions of 2026-10-18 (benchmarks/audits/2026-10-18-fp-fn-quint-stryker.md):
 *
 *   - `fs.promises.*`, and the `fs/promises` module under any local name, are
 *     the same file system as `fs.*`;
 *   - `let f; f = req.query.x; fs.readFileSync(f)` is the declaration form
 *     written in two statements;
 *   - a parameter's name stops vouching for it once a caller in the same file
 *     passes request input straight into it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noArbitraryFileAccess } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const error = { messageId: 'violationDetected' as const };

ruleTester.run('promise-API sinks', noArbitraryFileAccess, {
  valid: [
    {
      name: 'a literal path through fs/promises',
      code: "import fsp from 'fs/promises';\nawait fsp.readFile('/etc/app.conf');",
    },
    {
      name: 'a readFile that is not the fs module',
      code: "import { readFile } from './storage';\nawait readFile(req.query.file);",
    },
    {
      name: 'a nested fs member other than promises is not one of the sinks',
      code: 'fs.realpath.native(req.query.p);',
    },
    {
      name: 'a method under an fs namespace other than promises is not a sink',
      code: 'fs.other.readFile(req.query.p);',
    },
    {
      name: 'a non-fs method on fs/promises',
      code: "import fsp from 'fs/promises';\nawait fsp.mkdtemp(req.query.prefix);",
    },
  ],
  invalid: [
    {
      name: 'fs.promises.readFile(req.query.file)',
      code: "import fs from 'fs';\nawait fs.promises.readFile(req.query.file);",
      errors: [error],
    },
    {
      name: 'fs.promises.writeFile on the bare fs global',
      code: 'await fs.promises.writeFile(req.body.path, data);',
      errors: [error],
    },
    {
      name: "a default import of 'fs/promises' named fsp",
      code: "import fsp from 'fs/promises';\nawait fsp.readFile(req.query.file);",
      errors: [error],
    },
    {
      name: "a namespace import of 'node:fs/promises'",
      code: "import * as files from 'node:fs/promises';\nawait files.readdir(req.params.dir);",
      errors: [error],
    },
    {
      name: "require('fs').promises bound to a name",
      code: "const fsp = require('fs').promises;\nawait fsp.stat(req.query.p);",
      errors: [error],
    },
    {
      name: "{ promises: fsp } destructured from 'fs'",
      code: "const { promises: fsp } = require('node:fs');\nawait fsp.appendFile(req.body.log, line);",
      errors: [error],
    },
    {
      name: "a named readFile imported from 'fs/promises'",
      code: "import { readFile } from 'fs/promises';\nawait readFile(req.query.file);",
      errors: [error],
    },
    {
      name: 'fs imported under another name',
      code: "import fileSystem from 'node:fs';\nfileSystem.readFileSync(req.query.file);",
      errors: [error],
    },
  ],
});

ruleTester.run('a later assignment', noArbitraryFileAccess, {
  valid: [
    {
      name: 'reading a variable inside a + is not assigning to it',
      code: "let f = '/srv/static/index.html';\nconst g = f + req.query.x;\nfs.readFileSync(f);",
    },
    {
      name: 'a later assignment of a constant',
      code: "let f;\nf = '/srv/static/index.html';\nfs.readFileSync(f);",
    },
  ],
  invalid: [
    {
      name: 'let f; f = req.query.x; fs.readFileSync(f)',
      code: 'let f;\nf = req.query.x;\nfs.readFileSync(f);',
      errors: [error],
    },
    {
      name: 'a request value assigned inside a branch',
      code: `export function read(req) {
  let target = '/srv/static/index.html';
  if (req.query.page) target = req.query.page;
  return fs.readFileSync(target);
}`,
      errors: [error],
    },
    {
      name: 'a safe-sounding name assigned a request value later',
      code: 'let safePath;\nsafePath = req.query.f;\nfs.readFileSync(safePath);',
      errors: [error],
    },
    {
      name: 'one sanitised write does not vouch for a direct one',
      code: 'let safePath = sanitizePath(req.query.a);\nsafePath = req.query.b;\nfs.readFileSync(safePath);',
      errors: [error],
    },
    {
      name: 'a later assignment reached through a template',
      code: 'let f;\nf = req.query.x;\nfs.readFileSync(`/srv/${f}`);',
      errors: [error],
    },
  ],
});

ruleTester.run(
  'a safe-sounding parameter and its caller',
  noArbitraryFileAccess,
  {
    valid: [
      {
        name: 'an imported safe-sounding name has no write here to contradict it',
        code: "import { safePath } from './paths';\nfs.readFileSync(safePath);",
      },
      {
        name: 'the caller sanitises before passing it',
        code: `function readSafe(safePath) { return fs.readFileSync(safePath); }
export function handler(req) { return readSafe(sanitizePath(req.query.file)); }`,
      },
      {
        name: 'the caller passes a constant',
        code: `function readSafe(safePath) { return fs.readFileSync(safePath); }
readSafe('/srv/static/index.html');`,
      },
    ],
    invalid: [
      {
        name: 'a call wrapping request input still carries it into a parameter',
        code: `function read(file) { return fs.readFileSync(file); }
export function handler(req) { return read(decodeURIComponent(req.query.f)); }`,
        errors: [error],
      },
      {
        name: 'the caller passes the request straight in',
        code: `function readSafe(safePath) { return fs.readFileSync(safePath); }
export function handler(req) { return readSafe(req.query.file); }`,
        errors: [error],
      },
      {
        name: 'an arrow helper whose caller passes a request field',
        code: `const load = (validatedPath) => fs.readFileSync(validatedPath);
export const handler = (req) => load(req.body.path);`,
        errors: [error],
      },
    ],
  },
);
