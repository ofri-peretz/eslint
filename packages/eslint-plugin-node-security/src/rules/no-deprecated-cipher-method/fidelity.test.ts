/**
 * no-deprecated-cipher-method — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_deprecated_cipher_method.qnt):
 * a renamed `createCipher` import went silent, and node-forge's
 * `forge.cipher.createCipher` — a different, non-deprecated API — was reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedCipherMethod } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-deprecated-cipher-method fidelity', () => {
  ruleTester.run('renamed imports and node-forge', noDeprecatedCipherMethod, {
    valid: [
      {
        name: "node-forge's cipher.createCipher is not Node's deprecated API",
        code: `import forge from 'node-forge';
export const c = (key: string) => forge.cipher.createCipher('AES-CBC', key);`,
      },
      {
        name: "node-forge's cipher.createDecipher is not Node's deprecated API",
        code: `const forge = require('node-forge');
export const d = (key: string) => forge.cipher.createDecipher('AES-CBC', key);`,
      },
    ],
    invalid: [
      {
        name: 'a renamed createCipher import is reported, with no rename suggestion',
        code: `import { createCipher as build } from 'crypto';
export const c = (password: string) => build('aes-256-cbc', password);`,
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [] }],
      },
      {
        name: 'a renamed createDecipher require is reported',
        code: `const { createDecipher: open } = require('node:crypto');
export const d = (password: string) => open('aes-256-cbc', password);`,
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [] }],
      },
    ],
  });
});
