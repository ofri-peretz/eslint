/**
 * Tests for no-insecure-rsa-padding rule
 * CVE-2023-46809: Marvin Attack on RSA PKCS#1 v1.5
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-insecure-rsa-padding', () => {
  ruleTester.run('no-insecure-rsa-padding', noInsecureRsaPadding, {
    valid: [
      {
        name: 'a padding const holding OAEP is not PKCS#1 v1.5',
        code: 'const P = crypto.constants.RSA_PKCS1_OAEP_PADDING; crypto.privateDecrypt({ key, padding: P }, d);',
      },
      // Valid: OAEP padding
      {
        name: 'OAEP',
        code: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
      },
      // Valid: OAEP with hash
      {
        name: 'publicEncrypt with OAEP padding and a sha256 oaepHash is not reported',
        code: 'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, data);',
      },
      // Valid: No padding specified (different method)
      {
        code: 'crypto.sign(algorithm, data, key);',
        name: 'sign is not an RSA encryption call and is not reported',
      },
      {
        name: 'a padding of 1 handed to a layout helper is not RSA padding',
        code: 'Date.now(); layout({ padding: 1 });',
      },
      {
        name: 'spread key options beside OAEP padding are not PKCS#1 v1.5',
        code: 'crypto.privateDecrypt({ ...keyOptions, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a padding constant held in a const is the constant',
        // @found mutation testing
        code: 'const P = crypto.constants.RSA_PKCS1_PADDING; crypto.privateDecrypt({ key, padding: P }, d);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'const P = crypto.constants.RSA_PKCS1_PADDING; crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, d);',
              },
            ],
          },
        ],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a shorthand padding bound to the numeric constant is the constant',
        // @found mutation testing
        code: 'const padding = 1; crypto.privateDecrypt({ key, padding }, d);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'const padding = 1; crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, d);',
              },
            ],
          },
        ],
      },
      {
        name: 'allowInTests does not exempt a file that is not a test',
        code: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        options: [{ allowInTests: true }],
        filename: 'src/rsa.ts',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
              },
            ],
          },
        ],
      },
      // Invalid: PKCS#1 v1.5 padding on privateDecrypt
      {
        name: 'PKCS#1 v1.5 decryption padding — the Bleichenbacher oracle',
        code: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
              },
            ],
          },
        ],
      },
      // Invalid: PKCS#1 v1.5 padding on publicDecrypt
      {
        code: 'crypto.publicDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'crypto.publicDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
              },
            ],
          },
        ],
      },
      // Invalid: PKCS#1 v1.5 padding on privateEncrypt
      {
        code: 'crypto.privateEncrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'crypto.privateEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
              },
            ],
          },
        ],
      },
      // Invalid: PKCS#1 v1.5 padding on publicEncrypt
      {
        code: 'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
              },
            ],
          },
        ],
      },
      // Invalid: Shorthand RSA_PKCS1_PADDING
      {
        code: 'crypto.privateDecrypt({ key, padding: RSA_PKCS1_PADDING }, buffer);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);',
              },
            ],
          },
        ],
      },
    ],
  });
});
