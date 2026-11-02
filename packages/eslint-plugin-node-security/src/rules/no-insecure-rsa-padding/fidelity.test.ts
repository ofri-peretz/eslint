/**
 * no-insecure-rsa-padding — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_insecure_rsa_padding.qnt):
 * `padding: 1` (the value of RSA_PKCS1_PADDING) and an options object hoisted
 * to a `const` in scope were both silent.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureRsaPadding } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const OAEP = 'crypto.constants.RSA_PKCS1_OAEP_PADDING';

describe('no-insecure-rsa-padding fidelity', () => {
  ruleTester.run('numeric padding and hoisted options', noInsecureRsaPadding, {
    valid: [
      {
        name: 'a hoisted options object with OAEP padding is fine',
        code: `import crypto from 'crypto';
const opts = { key: k, padding: ${OAEP} };
export const out = crypto.privateDecrypt(opts, data);`,
      },
      {
        name: 'padding 4 (OAEP) is fine',
        code: `import crypto from 'crypto';
export const out = crypto.privateDecrypt({ key: k, padding: 4 }, data);`,
      },
    ],
    invalid: [
      {
        name: 'padding 1 is RSA_PKCS1_PADDING and is reported',
        code: `import crypto from 'crypto';
export const out = crypto.privateDecrypt({ key: k, padding: 1 }, data);`,
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output: `import crypto from 'crypto';
export const out = crypto.privateDecrypt({ key: k, padding: ${OAEP} }, data);`,
              },
            ],
          },
        ],
      },
      {
        name: 'a hoisted options object with PKCS1 padding is reported',
        code: `import crypto from 'crypto';
const opts = { key: k, padding: crypto.constants.RSA_PKCS1_PADDING };
export const out = crypto.publicEncrypt(opts, data);`,
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output: `import crypto from 'crypto';
const opts = { key: k, padding: ${OAEP} };
export const out = crypto.publicEncrypt(opts, data);`,
              },
            ],
          },
        ],
      },
      {
        name: 'a renamed privateDecrypt import with PKCS1 padding is reported',
        code: `import { privateDecrypt as open, constants } from 'node:crypto';
export const out = open({ key: k, padding: constants.RSA_PKCS1_PADDING }, data);`,
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output: `import { privateDecrypt as open, constants } from 'node:crypto';
export const out = open({ key: k, padding: ${OAEP} }, data);`,
              },
            ],
          },
        ],
      },
    ],
  });
});
