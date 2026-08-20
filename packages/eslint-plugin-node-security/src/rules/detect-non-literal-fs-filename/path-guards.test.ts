/**
 * CWE-22 — the taint roots, and the three guards that decide precision.
 *
 * ## Every expectation was RUN in Node 24, and two are counterintuitive
 *
 * | expression | result |
 * |---|---|
 * | `path.join('/safe', '../etc/passwd')` | `/etc/passwd` — escapes |
 * | `path.join('/safe', '/etc/passwd')` | `/safe/etc/passwd` — does NOT escape |
 * | `path.resolve('/safe', '/etc/passwd')` | `/etc/passwd` — **escapes** |
 * | `path.normalize('/safe/../etc/passwd')` | `/etc/passwd` — normalize is NOT a guard |
 * | `path.basename('../../etc/passwd')` | `passwd` — strips every component |
 * | `'/safebad'.startsWith('/safe')` | **true** — the prefix bug |
 * | `'/safebad'.startsWith('/safe' + path.sep)` | false — anchored, holds |
 *
 * `join` and `resolve` differ on an absolute second argument, so they are not the
 * same sink.
 *
 * ## What was wrong before 2026-08-17
 *
 * The rule scored **TP 0/6** on its own weakness while `eslint-plugin-security`
 * scored 6/6. Cause: `taintSources` defaulted to `['process']` only, so a
 * REQUEST-derived path was not tainted at all, and `isWholeTaintValue` suppressed
 * whole-value reads for every root alike.
 *
 * That suppression is right for `process.env.CA_BUNDLE` — whoever sets the
 * environment already chooses which files the process opens — and wrong for a
 * request: a remote caller supplying the ENTIRE path does not need to escape a
 * base, they name `/etc/passwd`, which is arbitrary file read. One suppression
 * covering both conflated "already trusted with the process" with
 * "unauthenticated and remote".
 *
 * **Silence is not precision.** 0 findings and 0 false positives looked clean and
 * meant the rule had no value.
 *
 * ## The guard that did not hold
 *
 * `hasPathValidation` accepted any `startsWith`, so the prefix bug SUPPRESSED the
 * vulnerable shape — the worst direction for a suppression to be wrong in. The
 * rule's own remediation text recommended that unanchored form until this commit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralFsFilename } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const P = `import fs from 'fs';\nimport path from 'path';\n`;

describe('detect-non-literal-fs-filename — taint roots and path guards', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      {
        name: 'path.basename strips every directory component',
        code: `${P}export function read(req) {
  return fs.readFileSync(path.join('/uploads', path.basename(req.query.f)));
}`,
      },
      {
        name: 'a separator-anchored prefix guard holds',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(BASE + path.sep)) throw new Error('denied');
  return fs.readFileSync(p);
}`,
      },
      {
        name: 'a literal prefix already ending in a separator holds',
        code: `${P}export function read(req) {
  const p = path.resolve('/safe', req.query.f);
  if (!p.startsWith('/safe/')) throw new Error('denied');
  return fs.readFileSync(p);
}`,
      },
      {
        name: 'an allowlisted filename inside a COMPOSED path',
        code: `${P}const ALLOWED = ['summary.json'];
export function read(req) {
  const name = req.query.name;
  if (!ALLOWED.includes(name)) throw new Error('denied');
  return fs.readFileSync('/reports/' + name);
}`,
      },
      {
        // Deliberate: whoever sets the environment already chooses the process's
        // files. Measured at 7% precision before this suppression existed.
        name: 'a whole value off process.env is not traversal',
        code: `${P}export function caBundle() { return fs.readFileSync(process.env.CA_BUNDLE); }`,
      },
      {
        name: 'for a CLI, reading argv[2] IS the feature',
        code: `${P}export function main() { return fs.readFileSync(process.argv[2], 'utf8'); }`,
      },
      {
        name: 'a `req` this file BUILDS is a fixture, not a request',
        code: `${P}const req = { query: { file: 'seed.json' } };
export function seed() { return fs.readFileSync('/data/' + req.query.file); }`,
      },
      {
        // Reassignment control for isLocallyConstructed. Built as a literal
        // object, then replaced with the real request — reading only the
        // declaration would silence this.
        name: 'CONTROL-valid twin: a template guard anchored by its trailing quasi',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(\`\${BASE}/\`)) throw new Error('denied');
  return fs.readFileSync(p);
}`,
      },
      {
        name: 'an array-literal root the file builds is not a request',
        code: `${P}const event = ['seed.json'];
export function seed() { return fs.readFileSync('/data/' + event[0]); }`,
      },
      {
        name: 'a guard written as an early return, not a throw',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(BASE + path.sep)) return null;
  return fs.readFileSync(p);
}`,
      },
      {
        // A BLOCK-bodied guard whose exit is a `return`, not a `throw`. Both
        // arms of hasEarlyExit are real spellings people write, and only one
        // was exercised.
        name: 'a block-bodied guard exiting via return',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(BASE + path.sep)) {
    return null;
  }
  return fs.readFileSync(p);
}`,
      },
      {
        // The template guard, anchored, with the separator inside the trailing
        // quasi rather than appended — the covered-branch twin of the invalid
        // case that omits it.
        name: 'a template prefix ending in a separator holds',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(\`\${BASE}\${path.sep}\`)) throw new Error('denied');
  return fs.readFileSync(p);
}`,
      },
      {
        // A spread argument carries no single node to judge, so the collector
        // steps over it rather than treating it as an unvalidated part. The
        // tainted part that IS present (`name`) is allowlisted, so this holds.
        name: 'a spread argument alongside an allowlisted part',
        code: `${P}const OK = ['a.json'];
export function read(req, rest) {
  const name = req.query.n;
  if (!OK.includes(name)) throw new Error('denied');
  return fs.readFileSync(path.join('/reports', name, ...rest));
}`,
      },
      {
        name: 'a module constant path',
        code: `${P}const CONFIG = '/etc/app/config.json';
export function load() { return fs.readFileSync(CONFIG, 'utf8'); }`,
      },
      {
        name: 'anchored to the module’s own location',
        code: `${P}const T = path.join(__dirname, 'email.html');
export function template() { return fs.readFileSync(T, 'utf8'); }`,
      },
    ],
    invalid: [
      {
        name: 'a request supplies the WHOLE path — arbitrary file read',
        code: `${P}export function download(req) { return fs.readFileSync(req.query.file); }`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'path.join(base, untrusted) — join does not contain `..`',
        code: `${P}export function read(req) {
  return fs.readFileSync(path.join('/uploads', req.params.name));
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'path.resolve honours an absolute argument, unlike join',
        code: `${P}export function read(req) {
  return fs.readFileSync(path.resolve('/safe', req.query.f));
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'normalize collapses `..`, it does not reject it',
        code: `${P}export function read(req) {
  return fs.readFileSync(path.normalize(req.query.f));
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        // THE prefix bug. Verified: '/safebad'.startsWith('/safe') is true, so a
        // sibling directory passes. Accepting this guard suppressed the
        // vulnerable shape.
        name: 'an UNANCHORED prefix guard does not hold, so it still reports',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(BASE)) throw new Error('denied');
  return fs.readFileSync(p);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'one binding hop between source and sink',
        code: `${P}export function read(req, cb) {
  const target = req.body.path;
  return fs.readFile(target, cb);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'Koa spells the request `ctx`',
        code: `${P}export async function handler(ctx) {
  ctx.body = fs.readFileSync(ctx.query.file);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'the fs/promises spelling is the same sink',
        code: `import { readFile } from 'fs/promises';
export async function read(req) { return readFile(req.query.f, 'utf8'); }`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        // A reassigned root stays tainted: declared as a local object, then
        // replaced by the real request before use.
        name: 'CONTROL: a reassigned local root is not saved by its initialiser',
        code: `${P}let ctx = { query: { file: 'seed.json' } };
export function handler(incoming) {
  ctx = incoming;
  return fs.readFileSync(ctx.query.file);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        // An argument-less startsWith proves nothing, so it must not suppress.
        // An unreadable guard is an unproven guard.
        name: 'startsWith() with no argument is not a guard',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith()) throw new Error('denied');
  return fs.readFileSync(p);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        // The template form only holds when its trailing quasi carries the
        // separator. Without it this is the prefix bug again, spelled differently.
        name: 'a template prefix NOT ending in a separator is the prefix bug',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(\`\${BASE}\`)) throw new Error('denied');
  return fs.readFileSync(p);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        // Trailing quasi present but NOT a separator — `/safe-tmp` is a
        // different directory, and the prefix test lets `/safe-tmpX` through
        // just as the bare form lets `/safebad` through.
        name: 'a template prefix ending in non-separator text is still the prefix bug',
        code: `${P}const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(\`\${BASE}-tmp\`)) throw new Error('denied');
  return fs.readFileSync(p);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        // CONTROL for the allowlist suppression: only ONE of two tainted parts is
        // checked, so `b` still traverses. "Some part validated" is not a guard.
        name: 'CONTROL: a partially guarded composition still reports',
        code: `${P}const OK = ['a'];
export function read(req) {
  const a = req.query.a;
  const b = req.query.b;
  if (!OK.includes(a)) throw new Error('denied');
  return fs.readFileSync('/s/' + a + b);
}`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
    ],
  });
});
