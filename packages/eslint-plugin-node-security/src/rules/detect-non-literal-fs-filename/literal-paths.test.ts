/**
 * A rule named `detect-non-literal-fs-filename` must not report a literal.
 *
 * ## What the census found
 *
 * All 37 findings this rule produces across the 20-repo corpus (3.0M LOC) were
 * labelled — the whole population, so this is exact, not sampled. The single
 * largest class was **string literals**:
 *
 *   cp('../../serverless/lib/plugins/...', '../../framework-dist/lib/...')
 *   readFile('../package.json', 'utf8')
 *   cp('../../../docs', '../../framework-dist/docs', { recursive: true })
 *
 * Reported as CWE-22 path traversal at CRITICAL severity. `../package.json` is
 * close to the most common relative path in Node tooling.
 *
 * ## Why it fired
 *
 * `allowLiterals` defaulted to `false`, and the literal branch reported when
 * `hasTraversalPatterns()` matched — which is `/\.\.[\/\\]/`, i.e. **any** `../`
 * anywhere in the string. Every relative path that walks up one directory
 * matched.
 *
 * The intent behind it was defensible: "a hardcoded `../etc/passwd` is a finding
 * regardless of taint — nobody needs to steer a path that already points where it
 * should not." The implementation did not encode that intent; it encoded "contains
 * two dots and a slash".
 *
 * ## The fix, and the one that was wrong first
 *
 * The first attempt flipped `allowLiterals` to default `true`, so no literal
 * ever reported. Three existing tests failed and two of them were RIGHT:
 * `fs.readFile('../../etc/passwd')` should report. That default flip threw out
 * the intent along with the defect.
 *
 * What ships instead implements the intent the branch always claimed:
 * `targetsSensitiveLocation` asks where the path ARRIVES, not whether it
 * contains dots. `../../etc/passwd` and `/etc/shadow` report; `../config.json`
 * and `../package.json` do not. `allowLiterals: true` still disables the branch
 * entirely for anyone who wants that.
 *
 * ## Why it costs no recall
 *
 * Path traversal is an ATTACKER steering a path, and every `vulnerable/` fixture
 * in this rule's corpus reaches its sink through request-derived taint — not one
 * depends on a literal-only report. Duel score unchanged: 10/10, F1 100.0%.
 *
 * It also GAINED a true positive. `pm2/lib/tools/passwd.js:5` reads
 * `fs.readFileSync('/etc/passwd')`, which has no `../` and so never matched the
 * old check at all.
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

describe('detect-non-literal-fs-filename — literal paths', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      {
        // serverless/packages/sf-core/scripts/prepareDistributionTarballs.js:34
        name: 'a relative literal in a build script — both arguments literal',
        code: `import { cp } from 'fs/promises';
export const run = () => cp('../../../docs', '../../framework-dist/docs', { recursive: true });`,
      },
      {
        // serverless/.../prepareDistributionTarballs.js:21 and :31
        name: 'reading a sibling package.json',
        code: `import { readFile } from 'fs/promises';
export const read = async () => JSON.parse(await readFile('../package.json', 'utf8'));`,
      },
      {
        // serverless/packages/sf-core/scripts/updateReleasesJson.cjs:4
        name: 'the sync form of the same',
        code: `const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('../package.json', 'utf8'));
module.exports = pkg;`,
      },
      {
        name: 'a deep relative literal',
        code: `import { cp } from 'fs/promises';
export const run = () =>
  cp('../../serverless/lib/plugins/python/unzip_requirements.py', '../../framework-dist/lib/x.py');`,
      },
      {
        name: 'an ordinary absolute literal',
        code: `import fs from 'fs';
export const read = () => fs.readFileSync('/var/app/config.json', 'utf8');`,
      },
      {
        // The case that separates the defect from the intent. An existing test
        // pinned this as a finding, next to `../../etc/passwd`, as though the
        // two were the same shape. One arrives at the system password file; the
        // other arrives at a config file in the parent directory.
        name: 'a relative literal to an ordinary file — the pinned false positive',
        code: `import fs from 'fs';
export const read = () => fs.readFile('../config.json', () => {});`,
      },
      {
        // `allowLiterals: true` still turns the whole branch off, including the
        // sensitive-target case, or the option would be decoration.
        name: 'allowLiterals: true silences even a sensitive target',
        code: `import fs from 'fs';
export const read = () => fs.readFileSync('../../etc/passwd', 'utf8');`,
        options: [{ allowLiterals: true }],
      },
    ],
    invalid: [
      {
        // CONTROL. Taint is the whole weakness and must be untouched by this
        // change. Without these, "literals do not report" also passes on a rule
        // that reports nothing at all.
        name: 'CONTROL: a request-derived path still reports',
        code: `import fs from 'fs';
export function read(req) {
  return fs.readFileSync(req.query.file);
}`,
        errors: 1,
      },
      {
        name: 'CONTROL: taint composed onto a literal prefix still reports',
        code: `import fs from 'fs';
export function read(req) {
  return fs.readFileSync(\`/uploads/\${req.query.f}\`);
}`,
        errors: 1,
      },
      {
        // The intent the literal branch always claimed, now actually
        // implemented. A hardcoded path that ARRIVES somewhere sensitive is a
        // finding; the `../` that gets it there is not.
        name: 'a hardcoded path to /etc/passwd still reports',
        code: `import fs from 'fs';
export const read = () => fs.readFileSync('../../etc/passwd', 'utf8');`,
        errors: 1,
      },
      {
        name: 'the absolute form of the same target',
        code: `import fs from 'fs';
export const read = () => fs.readFileSync('/etc/shadow', 'utf8');`,
        errors: 1,
      },
      {
        name: 'a hardcoded SSH private key read',
        code: `import fs from 'fs';
export const read = () => fs.readFileSync('../../../.ssh/id_rsa', 'utf8');`,
        errors: 1,
      },
    ],
  });
});

/**
 * Most of `process` is machine state, not input.
 *
 * `process` is a taint root so `process.env.X` and `process.argv[2]` are seen.
 * `process.pid` is a number the OS assigns and cannot contain a path separator.
 * n8n's blob store builds `` `${writePath}.tmp.${process.pid}.${randomUUID()}` ``
 * and every fs call on that temp path was reported — four findings in one file,
 * and the shape recurred across the corpus.
 */
describe('detect-non-literal-fs-filename — process members', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      {
        // n8n packages/@n8n/blob-storage/src/fs-byte-store.ts:29-41, reduced to
        // the shape that reported. Verified against the real file, not just this.
        name: 'a temp path stamped with process.pid',
        code: `import fs from 'fs/promises';
export async function write(writePath, body) {
  const tempPath = \`\${writePath}.tmp.\${process.pid}\`;
  await fs.writeFile(tempPath, body);
}`,
      },
      { name: 'process.platform in a path', code: `import fs from 'fs';\nexport const r = (d) => fs.readFileSync(d + '/' + process.platform + '.json');` },
      { name: 'process.arch in a path', code: `import fs from 'fs';\nexport const r = (d) => fs.readFileSync(d + '/' + process.arch);` },
      { name: 'process.version in a path', code: `import fs from 'fs';\nexport const r = (d) => fs.readFileSync(d + '/' + process.version);` },
    ],
    invalid: [
      {
        // CONTROL. The two members the taint root exists FOR must still report
        // when composed — without these, "process is not tainted" would pass on a
        // rule that had stopped looking at process entirely.
        name: 'CONTROL: process.env composed into a path still reports',
        code: `import fs from 'fs';
export const r = () => fs.readFileSync('/data/' + process.env.USER_DIR + '/f.txt');`,
        errors: 1,
      },
      {
        name: 'CONTROL: process.argv composed into a path still reports',
        code: `import fs from 'fs';
export const r = () => fs.readFileSync('/data/' + process.argv[2] + '/f.txt');`,
        errors: 1,
      },
    ],
  });
});
