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
      // Valid: OAEP padding
      { code: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);' },
      // Valid: OAEP with hash
      { code: 'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, data);' },
      // Valid: No padding specified (different method)
      { code: 'crypto.sign(algorithm, data, key);' },
    ],
    invalid: [
      // Invalid: PKCS#1 v1.5 padding on privateDecrypt
      {
        code: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [{ messageId: 'insecureRsaPadding', suggestions: [
          { messageId: 'useOaep', output: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);' },
        ] }],
      },
      // Invalid: PKCS#1 v1.5 padding on publicDecrypt
      {
        code: 'crypto.publicDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [{ messageId: 'insecureRsaPadding', suggestions: [
          { messageId: 'useOaep', output: 'crypto.publicDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);' },
        ] }],
      },
      // Invalid: PKCS#1 v1.5 padding on privateEncrypt
      {
        code: 'crypto.privateEncrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [{ messageId: 'insecureRsaPadding', suggestions: [
          { messageId: 'useOaep', output: 'crypto.privateEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);' },
        ] }],
      },
      // Invalid: PKCS#1 v1.5 padding on publicEncrypt
      {
        code: 'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);',
        errors: [{ messageId: 'insecureRsaPadding', suggestions: [
          { messageId: 'useOaep', output: 'crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);' },
        ] }],
      },
      // Invalid: Shorthand RSA_PKCS1_PADDING
      {
        code: 'crypto.privateDecrypt({ key, padding: RSA_PKCS1_PADDING }, buffer);',
        errors: [{ messageId: 'insecureRsaPadding', suggestions: [
          { messageId: 'useOaep', output: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);' },
        ] }],
      },
    ],
  });
});
