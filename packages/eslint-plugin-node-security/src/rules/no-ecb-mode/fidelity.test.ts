/**
 * no-ecb-mode — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_ecb_mode.qnt): a renamed
 * `createCipheriv` import was matched by its local spelling and went silent.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noEcbMode } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-ecb-mode fidelity', () => {
  ruleTester.run('renamed crypto imports', noEcbMode, {
    valid: [
      {
        name: 'a renamed createCipheriv with GCM is fine',
        code: `import { createCipheriv as makeCipher } from 'crypto';
export const c = (key: Buffer, iv: Buffer) => makeCipher('aes-128-gcm', key, iv);`,
      },
      {
        name: 'a callee that is itself a call names no cipher factory',
        code: `declare function factory(): (a: string, k: Buffer, i: Buffer) => unknown;
export const c = (key: Buffer, iv: Buffer) => factory()('aes-128-ecb', key, iv);`,
      },
      {
        name: 'calling the crypto module itself names no export',
        code: `const crypto: any = require('crypto');
export const c = (key: Buffer, iv: Buffer) => crypto('aes-128-ecb', key, iv);`,
      },
    ],
    invalid: [
      {
        name: 'a renamed createCipheriv with ECB is reported',
        code: `import { createCipheriv as makeCipher } from 'crypto';
export const c = (key: Buffer, iv: Buffer) => makeCipher('aes-128-ecb', key, iv);`,
        errors: [
          {
            messageId: 'ecbMode',
            suggestions: [
              {
                messageId: 'useGcm',
                output: `import { createCipheriv as makeCipher } from 'crypto';
export const c = (key: Buffer, iv: Buffer) => makeCipher("aes-128-gcm", key, iv);`,
              },
              {
                messageId: 'useCbc',
                output: `import { createCipheriv as makeCipher } from 'crypto';
export const c = (key: Buffer, iv: Buffer) => makeCipher("aes-128-cbc", key, iv);`,
              },
            ],
          },
        ],
      },
      {
        name: 'an undeclared createCipheriv keeps its spelling',
        code: `export const c = (key: Buffer, iv: Buffer) => createCipheriv('aes-128-ecb', key, iv);`,
        errors: [
          {
            messageId: 'ecbMode',
            suggestions: [
              {
                messageId: 'useGcm',
                output: `export const c = (key: Buffer, iv: Buffer) => createCipheriv("aes-128-gcm", key, iv);`,
              },
              {
                messageId: 'useCbc',
                output: `export const c = (key: Buffer, iv: Buffer) => createCipheriv("aes-128-cbc", key, iv);`,
              },
            ],
          },
        ],
      },
    ],
  });
});
