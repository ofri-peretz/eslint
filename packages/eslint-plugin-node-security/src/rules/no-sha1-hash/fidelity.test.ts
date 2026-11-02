/**
 * no-sha1-hash — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_sha1_hash.qnt): `sha1`
 * from crypto-hash reached through `require` or a namespace import was silent,
 * because the call was matched by the spelling `sha1` after a named import.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSha1Hash } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-sha1-hash fidelity', () => {
  ruleTester.run('crypto-hash bindings', noSha1Hash, {
    valid: [
      {
        name: 'a local function named sha1 is not crypto-hash',
        code: `const sha1 = (d: string) => d;
export const h = (data: string) => sha1(data);`,
      },
      {
        name: 'sha256 from a required crypto-hash is fine',
        code: `const hashes = require('crypto-hash');
export const h = (data: string) => hashes.sha256(data);`,
      },
    ],
    invalid: [
      {
        name: 'a destructured require of sha1 is reported',
        code: `const { sha1 } = require('crypto-hash');
export const h = async (data: string) => sha1(data);`,
        errors: [
          {
            messageId: 'sha1Deprecated',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `const { sha1 } = require('crypto-hash');
export const h = async (data: string) => sha256(data);`,
              },
            ],
          },
        ],
      },
      {
        name: 'sha1 on a required crypto-hash module is reported',
        code: `const hashes = require('crypto-hash');
export const h = async (data: string) => hashes.sha1(data);`,
        errors: [
          {
            messageId: 'sha1Deprecated',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `const hashes = require('crypto-hash');
export const h = async (data: string) => hashes.sha256(data);`,
              },
            ],
          },
        ],
      },
      {
        name: 'sha1 on a namespace import by bracket is reported without a rename',
        code: `import * as hashes from 'crypto-hash';
export const h = async (data: string) => hashes['sha1'](data);`,
        errors: [{ messageId: 'sha1Deprecated', suggestions: [] }],
      },
      {
        name: 'a renamed sha1 import is reported at the import and the call',
        code: `import { sha1 as digest } from 'crypto-hash';
export const h = async (data: string) => digest(data);`,
        errors: [
          {
            messageId: 'sha1Deprecated',
            suggestions: [
              {
                messageId: 'useSha256',
                output: `import { sha256 as digest } from 'crypto-hash';
export const h = async (data: string) => digest(data);`,
              },
              {
                messageId: 'useSha512',
                output: `import { sha512 as digest } from 'crypto-hash';
export const h = async (data: string) => digest(data);`,
              },
            ],
          },
          { messageId: 'sha1Deprecated', suggestions: [] },
        ],
      },
    ],
  });
});
