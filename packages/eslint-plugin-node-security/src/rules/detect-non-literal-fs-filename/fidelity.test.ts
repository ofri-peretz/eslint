/**
 * detect-non-literal-fs-filename — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/detect_non_literal_fs_filename.qnt).
 *
 * The fs receiver was matched by NAME, seeded with `fs`, so a local object that
 * merely shared the name was treated as the module. The receiver is now
 * resolved through devkit's `resolveModuleBinding`; only an `fs` declared
 * nowhere in the file keeps the bare-module assumption.
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

describe('detect-non-literal-fs-filename fidelity', () => {
  ruleTester.run('fs receiver resolution', detectNonLiteralFsFilename, {
    valid: [
      {
        name: 'a local object named fs is not the fs module',
        code: `const fs = { readFileSync: (f: string) => f };
export function handler(req: any, name: string) { fs.readFileSync('/etc/app/' + process.env.NAME); }`,
      },
      {
        name: 'a local object named fs is not the module under reportWholeProcessValues',
        code: `const fs = { readFileSync: (f: string) => f };
export function handler() { fs.readFileSync(process.argv[2]); }`,
        options: [{ reportWholeProcessValues: true }],
      },
      {
        name: 'a relative literal path is not a finding at the default allowLiterals',
        code: `import fs from 'fs';
export function handler() { fs.readFileSync('../config.json'); }`,
      },
    ],
    invalid: [
      {
        name: 'an fs declared nowhere in the file is still the module',
        code: `export function handler() { fs.readFileSync('/etc/app/' + process.env.NAME); }`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'a renamed promises import is resolved to fs',
        code: `import { readFile as rf } from 'node:fs/promises';
export function handler() { rf('/etc/app/' + process.env.NAME); }`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        name: 'a literal that traverses into a sensitive location reports at the default',
        code: `import fs from 'fs';
export function handler() { fs.readFileSync('../../etc/passwd'); }`,
        errors: [{ messageId: 'fsPathTraversal' }],
      },
    ],
  });
});
