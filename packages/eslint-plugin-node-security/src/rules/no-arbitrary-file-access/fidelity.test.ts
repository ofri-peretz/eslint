/**
 * no-arbitrary-file-access — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_arbitrary_file_access.qnt):
 * a receiver spelled `fs` counted whatever it was bound to, so a local object
 * named `fs` was treated as the module. Only an `fs` declared nowhere in the
 * file keeps that assumption now.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noArbitraryFileAccess } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-arbitrary-file-access fidelity', () => {
  ruleTester.run('fs receiver resolution', noArbitraryFileAccess, {
    valid: [
      {
        name: 'a local object named fs is not the fs module',
        code: `const fs = { readFileSync: (p: string, e?: string) => [p, e] };
export async function handler(req: any) { return fs.readFileSync(req.query.file, 'utf8'); }`,
      },
      {
        name: 'a local object named fs is not the module for a destructured request value',
        code: `const fs = { readFileSync: (p: string) => p };
export async function handler(req: any) { const { file } = req.query; return fs.readFileSync(file); }`,
      },
    ],
    invalid: [
      {
        name: 'an fs declared nowhere in the file is still the module',
        code: `export async function handler(req: any) { return fs.readFileSync(req.query.file, 'utf8'); }`,
        errors: 1,
      },
      {
        name: 'an imported fs reading a request path is reported',
        code: `import fs from 'node:fs';
export async function handler(req: any) { return fs.readFileSync(req.query.file, 'utf8'); }`,
        errors: 1,
      },
    ],
  });
});
