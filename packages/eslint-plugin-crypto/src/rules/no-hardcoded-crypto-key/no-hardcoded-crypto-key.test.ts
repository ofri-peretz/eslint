/**
 * Tests for no-hardcoded-crypto-key rule
 * CWE-321: Use of Hard-coded Cryptographic Key
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedCryptoKey } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-hardcoded-crypto-key', () => {
  ruleTester.run('no-hardcoded-crypto-key', noHardcodedCryptoKey, {
    valid: [
      // Environment variable
      { code: 'crypto.createCipheriv("aes-256-gcm", process.env.KEY, iv);' },
      // Variable reference
      { code: 'crypto.createCipheriv("aes-256-gcm", keyFromKms, iv);' },
      // Standalone function with variable
      { code: 'createCipheriv("aes-256-gcm", secretKey, iv);' },
      // createDecipheriv with variable
      { code: 'crypto.createDecipheriv("aes-256-gcm", keyVar, iv);' },
      // Buffer.from with variable
      { code: 'crypto.createCipheriv("aes-256-gcm", Buffer.from(envKey), iv);' },
      // Less than 2 args - edge case
      { code: 'crypto.createCipheriv("aes-256-gcm");' },
      // Non-cipher call
      { code: 'somethingElse("aes-256-gcm", "hardcoded", iv);' },
    ],
    invalid: [
      // String literal key
      {
        code: 'crypto.createCipheriv("aes-256-gcm", "my-secret-key-123456", iv);',
        errors: [{ messageId: 'hardcodedKey' }],
      },
      // Buffer.from with string literal
      {
        code: 'crypto.createCipheriv("aes-256-gcm", Buffer.from("hardcodedkey"), iv);',
        errors: [{ messageId: 'hardcodedKey' }],
      },
      // Buffer.from with hardcoded byte array (lines 128-132)
      {
        code: 'crypto.createCipheriv("aes-256-gcm", Buffer.from([0x00, 0x01, 0x02, 0x03]), iv);',
        errors: [{ messageId: 'hardcodedKey' }],
      },
      // new Uint8Array with hardcoded bytes (lines 143-149)
      {
        code: 'crypto.createCipheriv("aes-256-gcm", new Uint8Array([1, 2, 3, 4, 5]), iv);',
        errors: [{ messageId: 'hardcodedKey' }],
      },
      // createDecipheriv with hardcoded key
      {
        code: 'crypto.createDecipheriv("aes-256-gcm", "hardcoded-key", iv);',
        errors: [{ messageId: 'hardcodedKey' }],
      },
      // Standalone function with hardcoded key
      {
        code: 'createCipheriv("aes-256-gcm", "my-secret", iv);',
        errors: [{ messageId: 'hardcodedKey' }],
      },
    ],
  });
});
