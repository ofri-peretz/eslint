/**
 * no-zip-slip — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_zip_slip.qnt): an
 * `extractAllTo` on an object literal the file wrote itself was reported as
 * archive extraction.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noZipSlip } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-zip-slip fidelity', () => {
  ruleTester.run('object-literal receivers', noZipSlip, {
    valid: [
      {
        name: 'extractAllTo on a local object literal is not archive extraction',
        code: `import fs from 'node:fs';
export function unpack(file: string, dest: string) { const zip = { extractAllTo: (d: string) => d }; zip.extractAllTo(dest); }`,
      },
      {
        name: 'an object literal receiver stays silent under reportWithoutArchiveContext',
        code: `export function unpack(dest: string) { const zip = { extractAllTo: (d: string) => d }; zip.extractAllTo(dest); }`,
        options: [{ reportWithoutArchiveContext: true }],
      },
    ],
    invalid: [
      {
        name: 'extractAllTo on an adm-zip instance is still reported',
        code: `import AdmZip from 'adm-zip';
export function unpack(file: string, dest: string) { const zip = new AdmZip(file); zip.extractAllTo(dest); }`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
    ],
  });
});
