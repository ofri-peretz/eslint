/**
 * no-weak-cipher-algorithm — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_weak_cipher_algorithm.qnt):
 * a renamed `createCipheriv` import was matched by its local spelling and
 * went silent.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakCipherAlgorithm } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-weak-cipher-algorithm fidelity', () => {
  ruleTester.run('renamed crypto imports', noWeakCipherAlgorithm, {
    valid: [
      {
        name: 'a createCipheriv imported from another library is not node crypto',
        code: `import { createCipheriv } from 'some-cipher-lib';
export const c = (key: Buffer, iv: Buffer) => createCipheriv('rc4', key, iv);`,
      },
    ],
    invalid: [
      {
        name: 'a renamed createCipheriv with rc4 is reported',
        code: `import { createCipheriv as makeCipher } from 'crypto';
export const c = (key: Buffer, iv: Buffer) => makeCipher('rc4', key, iv);`,
        errors: [
          {
            messageId: 'weakCipherAlgorithm',
            suggestions: [
              {
                messageId: 'useAes256Gcm',
                output: `import { createCipheriv as makeCipher } from 'crypto';
export const c = (key: Buffer, iv: Buffer) => makeCipher("aes-256-gcm", key, iv);`,
              },
              {
                messageId: 'useChaCha20',
                output: `import { createCipheriv as makeCipher } from 'crypto';
export const c = (key: Buffer, iv: Buffer) => makeCipher("chacha20-poly1305", key, iv);`,
              },
            ],
          },
        ],
      },
    ],
  });
});
