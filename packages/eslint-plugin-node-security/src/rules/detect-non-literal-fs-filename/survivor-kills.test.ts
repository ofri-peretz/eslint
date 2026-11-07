/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Cases written against surviving Stryker mutants of this rule. Each states the
 * behaviour it pins; every one was checked to fail with its mutant applied.
 * `BUG:` cases failed against the rule as it stood, and the rule was fixed.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralFsFilename, generateRefactoringSteps } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const UNRESOLVED = [{ reportUnresolvedPaths: true }];
const ERR = [{ messageId: 'fsPathTraversal' as const }];

/** `fs.<method>(<fixed first argument>, <argv-composed second argument>)`. */
const TWO_PATH_METHODS = [
  'copyFile',
  'copyFileSync',
  'cp',
  'cpSync',
  'rename',
  'renameSync',
  'link',
  'linkSync',
  'symlink',
  'symlinkSync',
];

describe('detect-non-literal-fs-filename — survivor kills', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      // ── BUG: guard clauses outside a function body ──────────────────────
      {
        name: 'BUG: a guard clause at the top level of a CLI script clears the path after it',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
if (!ALLOWED.includes(name)) throw new Error('unknown file');
fs.readFileSync('/srv/data/' + name);`,
      },
      {
        name: 'BUG: a guard clause inside a nested block clears the path after it',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
export function load(opts) {
  if (opts.enabled) {
    if (!ALLOWED.includes(name)) throw new Error('unknown file');
    return fs.readFileSync('/srv/data/' + name);
  }
  return null;
}`,
      },
      {
        name: 'BUG: a guard before a returned callback covers the callback block body',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
export function loader() {
  if (!ALLOWED.includes(name)) throw new Error('unknown file');
  return () => {
    return fs.readFileSync('/srv/data/' + name);
  };
}`,
      },
      // ── guard clause shapes ─────────────────────────────────────────────
      {
        name: "a guard rejecting '..' with includes clears the path",
        code: `import fs from 'fs';
const name = process.argv[2];
export function load() {
  if (name.includes('..')) throw new Error('traversal');
  return fs.readFileSync('/srv/data/' + name);
}`,
      },
      {
        name: 'a regex allowlist test clears the path',
        code: `import fs from 'fs';
const name = process.argv[2];
export function load() {
  if (!/^[\\w-]+\\.json$/.test(name)) throw new Error('bad name');
  return fs.readFileSync('/srv/data/' + name);
}`,
      },
      {
        name: 'an allowlisted name interpolated into a template is guarded',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
export function load() {
  if (!ALLOWED.includes(name)) throw new Error('unknown file');
  return fs.readFileSync(\`/srv/data/\${name}\`);
}`,
      },
      {
        name: 'an allowlisted name with a suffix appended is guarded',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a', 'b'];
export function load() {
  if (!ALLOWED.includes(name)) throw new Error('unknown file');
  return fs.readFileSync(name + '.json');
}`,
      },
      {
        name: 'a guard block that logs before it throws still exits',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
export function load() {
  if (!ALLOWED.includes(name)) {
    console.error('unknown file', name);
    throw new Error('unknown file');
  }
  return fs.readFileSync('/srv/data/' + name);
}`,
      },
      {
        name: 'a guard inside a function-expression body clears the path after it',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
export const load = function () {
  if (!ALLOWED.includes(name)) throw new Error('unknown file');
  return fs.readFileSync('/srv/data/' + name);
};`,
      },
      // ── sanitisers and constants ────────────────────────────────────────
      {
        name: 'path.basename on an undeclared path global sanitises',
        code: `import fs from 'fs';
fs.readFileSync('/srv/data/' + path.basename(process.argv[2]));`,
      },
      {
        name: 'a whole env value read through a destructured const is still whole',
        code: `import fs from 'fs';
const { CA_BUNDLE } = process.env;
fs.readFileSync(CA_BUNDLE);`,
      },
      {
        name: 'a unary plus on a descriptor is not a concatenation',
        code: `import fs from 'fs';
export const read = (fd) => fs.readFileSync(+fd);`,
      },
      {
        name: 'a parameter concatenated onto an argv base keeps the exemption',
        code: `import fs from 'fs';
import path from 'path';
export const read = (name) =>
  fs.readFileSync(path.join(process.argv[2], name + '.json'));`,
      },
      {
        name: 'a test file is skipped',
        filename: 'src/loader.test.ts',
        code: `import fs from 'fs';
fs.readFileSync('/srv/data/' + process.argv[2]);`,
      },
      {
        name: 'a ctx that is never read as a request is a build context',
        code: `import fs from 'fs';
export function build(ctx) {
  return fs.readFileSync('/srv/' + ctx.runtimeDir);
}`,
      },
      // ── constants under reportUnresolvedPaths ───────────────────────────
      ...[
        "fs.readFileSync(path.join(__dirname, 'data.json'));",
        "fs.readFileSync(path.resolve(__dirname, 'data.json'));",
        'fs.readFileSync(`${__dirname}/data.json`);',
        "fs.readFileSync(__dirname + '/data.json');",
        "fs.readFileSync(path.join(process.cwd(), 'config.json'));",
        "const DIR = path.join(__dirname, 'data'); fs.readFileSync(DIR);",
        "const PART = 'data'; fs.readFileSync(path.join(__dirname, PART, PART));",
      ].map((line) => ({
        name: `under reportUnresolvedPaths a build-time constant is not reported: ${line}`,
        code: `import fs from 'fs';\n${line}`,
        options: UNRESOLVED,
      })),
      {
        name: 'a base declared by a global comment is configuration, on every engine',
        code: `/* global BASE */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
      },
      {
        name: 'a global directive with no space after the comment opener still declares',
        code: `/*global BASE*/
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
      },
      {
        name: 'a global directive may separate names with whitespace alone',
        code: `/* global ROOT BASE */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
      },
      {
        name: 'a justification after -- is not a declared name',
        code: `/* global BASE -- supplied by the host */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
      },
      {
        name: 'a globals comment declares each listed name, with or without a writability flag',
        code: `/* globals ROOT: readonly, BASE */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');
fs.readFileSync(ROOT);`,
      },
    ],
    invalid: [
      // ── BUG: depth budgets that dropped findings ────────────────────────
      {
        name: 'BUG: a long left-deep concatenation still carries its process.env part',
        code: `import fs from 'fs';
export function load(app, profile, name) {
  return fs.readFileSync(process.env.HOME + '/.config/' + app + '/' + profile + '/' + name + '.json');
}`,
        errors: ERR,
      },
      {
        name: 'BUG: a free directory at the head of a long concatenation is still unknowable',
        code: `import fs from 'fs';
export function load(sub, name, ext) {
  return fs.readFileSync(dir + '/' + sub + '/' + name + '.' + ext);
}`,
        errors: ERR,
      },
      {
        name: 'BUG: a const cycle as the base of a join does not overflow the stack',
        code: `import fs from 'fs';
import path from 'path';
const a = b;
const b = a;
fs.readFileSync(path.join(a, process.argv[2]));`,
        errors: ERR,
      },
      // ── BUG: destructured const, spread, Windows literal, template ──────
      {
        name: 'BUG: an argv element destructured into a const and joined onto __dirname is composed taint',
        code: `import fs from 'fs';
import path from 'path';
const [, , name] = process.argv;
fs.readFileSync(path.join(__dirname, name));`,
        errors: ERR,
      },
      {
        name: 'BUG: under reportUnresolvedPaths a spread path argument is unresolved',
        code: `import fs from 'fs';
export const read = (...args) => fs.readFile(...args);`,
        options: UNRESOLVED,
        errors: ERR,
      },
      {
        name: 'BUG: a Windows-style escaped literal traversing to /etc/passwd is reported',
        code: `import fs from 'fs';
fs.readFileSync('..\\\\..\\\\etc\\\\passwd');`,
        errors: ERR,
      },
      {
        name: 'BUG: a Windows-style escaped literal traversing to the SAM hive is reported',
        code: `import fs from 'fs';
fs.readFileSync('..\\\\..\\\\Windows\\\\System32\\\\config\\\\SAM');`,
        errors: ERR,
      },
      {
        name: 'BUG: under reportUnresolvedPaths a no-substitution template that traverses is not constant',
        code: `import fs from 'fs';
fs.readFileSync(path.join(__dirname, \`../etc/passwd\`));`,
        options: UNRESOLVED,
        errors: ERR,
      },
      // ── sensitive literals ──────────────────────────────────────────────
      {
        name: 'one leading ../ into /etc/shadow is a sensitive literal',
        code: `import fs from 'fs';
fs.readFileSync('../etc/shadow');`,
        errors: ERR,
      },
      {
        name: 'a literal traversing into /proc/self/environ is a sensitive literal',
        code: `import fs from 'fs';
fs.readFileSync('../../proc/self/environ');`,
        errors: ERR,
      },
      {
        name: 'a literal traversing to a home directory SSH key is a sensitive literal',
        code: `import fs from 'fs';
fs.readFileSync('../../../root/.ssh/id_rsa');`,
        errors: ERR,
      },
      // ── report data ─────────────────────────────────────────────────────
      ...(
        [
          ['readFile', 'path.resolve(SAFE_DIR, path.basename(userInput))'],
          ['writeFile', 'path.resolve(SAFE_DIR, path.basename(userInput))'],
          ['stat', 'path.resolve(baseDir, userInput) with validation'],
          ['readdir', 'Validate directory is within allowed paths'],
          ['readFileSync', 'Use path.resolve() with validation'],
        ] as const
      ).map(([method, safePattern]) => ({
        name: `a composed ${method} path reports HIGH with its own safe pattern`,
        code: `import fs from 'fs';
fs.${method}('/srv/data/' + process.argv[2], () => {});`,
        errors: [
          {
            messageId: 'fsPathTraversal' as const,
            data: { riskLevel: 'HIGH', safePattern },
          },
        ],
      })),
      {
        name: 'a path whose text spells ../ reports CRITICAL',
        code: `import fs from 'fs';
fs.readFileSync('../data/' + process.argv[2]);`,
        errors: [
          {
            messageId: 'fsPathTraversal',
            data: {
              riskLevel: 'CRITICAL',
              safePattern: 'Use path.resolve() with validation',
            },
          },
        ],
      },
      {
        name: 'under reportUnresolvedPaths a call with no path argument reports MEDIUM',
        code: `import fs from 'fs';
fs.readFile();`,
        options: UNRESOLVED,
        errors: [
          {
            messageId: 'fsPathTraversal',
            data: {
              riskLevel: 'MEDIUM',
              safePattern: 'Use path.resolve() with validation',
            },
          },
        ],
      },
      // ── the destination of a two-path method ────────────────────────────
      ...TWO_PATH_METHODS.map((method) => ({
        name: `the destination argument of ${method} is a path`,
        code: `import fs from 'fs';
fs.${method}('template.txt', '/srv/out/' + process.argv[2], () => {});`,
        errors: ERR,
      })),
      // ── taint shapes ────────────────────────────────────────────────────
      {
        name: 'a template with one process.env part beside a parameter is composed taint',
        code: `import fs from 'fs';
export function load(name) {
  return fs.readFileSync(\`\${process.env.DATA_DIR}/\${name}\`);
}`,
        errors: ERR,
      },
      {
        name: 'a basename method on some other object is not path.basename',
        code: `import fs from 'fs';
const helper = makeHelper();
fs.readFileSync('/srv/data/' + helper.basename(process.argv[2]));`,
        errors: ERR,
      },
      {
        name: 'a request root bound to a call result is not locally constructed',
        code: `import fs from 'fs';
const req = getRequest();
fs.readFileSync('/srv/data/' + req.query.file);`,
        errors: ERR,
      },
      {
        name: 'a request root declared without an initialiser and assigned once is not locally constructed',
        code: `import fs from 'fs';
let req;
req = getRequest();
fs.readFileSync('/srv/data/' + req.query.file);`,
        errors: ERR,
      },
      {
        name: 'a line comment that reads like a global declaration declares nothing',
        code: `// global BASE
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
        errors: ERR,
      },
      {
        name: 'a comment that only mentions a global declares nothing',
        code: `/* see the global BASE in the deploy notes */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
        errors: ERR,
      },
      {
        name: 'a global turned off by its directive is not declared',
        code: `/* global BASE: off */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
        errors: ERR,
      },
      {
        name: 'the last directive for a name wins',
        code: `/* global BASE */
/* global BASE: off */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
        errors: ERR,
      },
      {
        name: 'the words of a -- justification are not declared names',
        code: `/* global BASE -- see dir */
import fs from 'fs';
fs.readFileSync(dir + '/data.json');`,
        errors: ERR,
      },
      {
        name: 'off after a spaced colon still turns the global off',
        code: `/* global BASE :off */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
        errors: ERR,
      },
      {
        name: 'an ordinary block comment declares nothing',
        code: `/* the base is configured elsewhere */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
        errors: ERR,
      },
      {
        name: 'a request root declared by a global comment is not locally constructed',
        code: `/* global req */
import fs from 'fs';
fs.readFileSync('/srv/data/' + req.query.file);`,
        errors: ERR,
      },
      {
        name: 'a ctx read as a request elsewhere taints a path built from another of its fields',
        code: `import fs from 'fs';
export function handler(ctx) {
  const body = ctx.request.body;
  return fs.readFileSync('/srv/' + ctx.uploadDir + body.name);
}`,
        errors: ERR,
      },
      {
        name: 'under reportUnresolvedPaths a base declared by a global comment is unresolved',
        code: `/* global BASE */
import fs from 'fs';
fs.readFileSync(BASE + '/data.json');`,
        options: UNRESOLVED,
        errors: ERR,
      },
      {
        name: 'a template with one free part beside a parameter is unknowable',
        code: `import fs from 'fs';
export function load(name) {
  return fs.readFileSync(\`\${dataDir}/\${name}\`);
}`,
        errors: ERR,
      },
      // ── a request part beside an argv base ──────────────────────────────
      {
        name: 'a request part in a template beside a parameter overrides the argv-base exemption',
        code: `import fs from 'fs';
import path from 'path';
export const read = (req, name) =>
  fs.readFileSync(path.join(process.argv[2], \`\${req.query.dir}/\${name}\`));`,
        errors: ERR,
      },
      {
        name: 'a request part at the head of a concatenation overrides the argv-base exemption',
        code: `import fs from 'fs';
import path from 'path';
export const read = (req) =>
  fs.readFileSync(path.join(process.argv[2], req.query.dir + '.json'));`,
        errors: ERR,
      },
      {
        name: 'a helper call over an env value is not a path call',
        code: `import fs from 'fs';
const helper = makeHelper();
fs.readFileSync(helper.expand(process.env.CONFIG_PATH));`,
        errors: ERR,
      },
      // ── guard clauses that do not guard ─────────────────────────────────
      {
        name: 'a guard through a plain function call is not a recognised validation',
        code: `import fs from 'fs';
import { isAllowed } from './policy';
const name = process.argv[2];
export function load() {
  if (!isAllowed(name)) throw new Error('denied');
  return fs.readFileSync('/srv/data/' + name);
}`,
        errors: ERR,
      },
      {
        name: 'a trailing-separator check is not a containment guard',
        code: `import fs from 'fs';
const dir = process.argv[2];
export function list() {
  if (!dir.endsWith('/')) throw new Error('a directory must end with /');
  return fs.readdirSync('/srv/data/' + dir);
}`,
        errors: ERR,
      },
      {
        name: 'an existence check is not an allowlist',
        code: `import fs from 'fs';
const name = process.argv[2];
export function load() {
  if (!fs.existsSync(name)) throw new Error('missing');
  return fs.readFileSync('/srv/data/' + name);
}`,
        errors: ERR,
      },
      {
        name: 'a guard block that only warns does not exit',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
export function load() {
  if (!ALLOWED.includes(name)) {
    console.warn('unknown file', name);
  }
  return fs.readFileSync('/srv/data/' + name);
}`,
        errors: ERR,
      },
      {
        name: 'a guard whose single statement only warns does not exit',
        code: `import fs from 'fs';
const name = process.argv[2];
const ALLOWED = ['a.json', 'b.json'];
export function load() {
  if (!ALLOWED.includes(name)) console.warn('unknown file', name);
  return fs.readFileSync('/srv/data/' + name);
}`,
        errors: ERR,
      },
      // ── not constant under reportUnresolvedPaths ────────────────────────
      ...[
        'export const read = (name) => fs.readFileSync(`${__dirname}/${name}`);',
        "fs.readdirSync('/run/user/' + process.getuid());",
        "const helper = makeHelper(); fs.readFileSync(path.join(helper.cwd(), 'config.json'));",
        "const segments = ['srv', 'data']; fs.readFileSync(segments.join('/'));",
      ].map((line) => ({
        name: `under reportUnresolvedPaths a path not provably constant is reported: ${line}`,
        code: `import fs from 'fs';\n${line}`,
        options: UNRESOLVED,
        errors: ERR,
      })),
    ],
  });

  describe('generateRefactoringSteps', () => {
    const op = (method: string) => ({
      method,
      dangerous: true,
      safePattern: 'x',
    });
    it.each([
      ['readFile', 'Define a SAFE_DIR constant'],
      ['writeFile', 'Define a SAFE_DIR constant'],
      ['stat', 'Use path.resolve() to normalize the path'],
      ['readdir', 'Resolve the directory path'],
    ])('gives %s its own steps', (method, first) => {
      expect(generateRefactoringSteps(op(method))).toContain(first);
    });
  });
});
