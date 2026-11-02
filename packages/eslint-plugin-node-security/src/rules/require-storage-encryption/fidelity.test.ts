/**
 * require-storage-encryption — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/require_storage_encryption.qnt).
 *
 *   - a named `writeFile` from `node:fs/promises` was never seen as a write:
 *     only member calls were;
 *   - the doc's "Encrypted on the way out" row is honoured for an `encrypt`
 *     that provably encrypts, and an unproven one (imported from a project
 *     module) still reports — the contract the doc now states.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireStorageEncryption } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const SEAL = `import { publicEncrypt } from 'node:crypto';
declare const PUBLIC_KEY: string;
function encrypt(v: string) { return publicEncrypt(PUBLIC_KEY, Buffer.from(v)); }`;

describe('require-storage-encryption fidelity', () => {
  ruleTester.run(
    'promise writes and provable encryption',
    requireStorageEncryption,
    {
      valid: [
        {
          name: 'a provably encrypted token written to a credential-named path is fine',
          code: `import fs from 'node:fs';
${SEAL}
export function persist(token: string) { fs.writeFileSync('session_token.txt', encrypt(token)); }`,
        },
        {
          name: 'a local function named writeFile is not a disk write',
          code: `const writeFile = (p: string, v: string) => [p, v];
export function persist(token: string) { writeFile('session_token.txt', token); }`,
        },
        {
          name: 'a call whose callee is itself a call is not a recognised write',
          code: `declare function getWriter(): (p: string, v: string) => void;
export function persist(token: string) { getWriter()('session_token.txt', token); }`,
        },
        {
          name: 'a dynamic member callee names no write method',
          code: `import fs from 'node:fs';
export function persist(token: string, m: string) { (fs as any)[m]('session_token.txt', token); }`,
        },
      ],
      invalid: [
        {
          name: 'a named writeFile from node:fs/promises writing a token is reported',
          code: `import { writeFile } from 'node:fs/promises';
export async function persist(token: string) { await writeFile('session_token.txt', token); }`,
          errors: [{ messageId: 'violationDetected' }],
        },
        {
          name: 'a named appendFileSync from fs writing to a credential path is reported',
          code: `import { appendFileSync } from 'fs';
export function persist(sitemap: string) { appendFileSync('session_token.txt', sitemap); }`,
          errors: [{ messageId: 'violationDetected' }],
        },
        {
          name: 'an encrypt imported from a project module is unproven and reports',
          code: `import fs from 'node:fs';
import { encrypt } from './vault';
export function persist(token: string) { fs.writeFileSync('session_token.txt', encrypt(token)); }`,
          errors: [{ messageId: 'violationDetected' }],
        },
      ],
    },
  );
});
