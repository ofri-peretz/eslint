/**
 * Tests for no-static-iv rule
 * CWE-329: Static/hardcoded IVs
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noStaticIv } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-static-iv', () => {
  describe('Valid Code - Dynamic IVs', () => {
    ruleTester.run('valid - randomBytes patterns', noStaticIv, {
      valid: [
        // Dynamic IV from randomBytes (member expression)
        { code: 'const iv = crypto.randomBytes(16); crypto.createCipheriv("aes-256-gcm", key, iv);' },
        // Direct randomBytes call
        { code: 'crypto.createCipheriv("aes-256-gcm", key, crypto.randomBytes(16));' },
        // Standalone randomBytes call
        { code: 'const iv = randomBytes(16); crypto.createCipheriv("aes-256-gcm", key, iv);' },
        // Variable reference (cannot determine source - assume safe)
        { code: 'crypto.createCipheriv("aes-256-gcm", key, randomIv);' },
        { code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
        { code: 'crypto.createCipheriv("aes-256-gcm", key, generatedIv);' },
        // Non-cipher calls (should not flag)
        { code: 'someFunction("aes-256-gcm", key, "static");' },
        { code: 'encrypt("aes-256-gcm", key, "staticiv");' },
        // Less than 3 arguments
        { code: 'crypto.createCipheriv("aes-256-gcm", key);' },
        // Test file with allowInTests
        {
          code: 'crypto.createCipheriv("aes-256-gcm", key, "static1234567890");',
          filename: 'crypto.test.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - String Literal IVs', () => {
    ruleTester.run('invalid - hardcoded strings', noStaticIv, {
      valid: [],
      invalid: [
        // 16 char string (AES block size)
        { code: 'crypto.createCipheriv("aes-256-gcm", key, "1234567890123456");', errors: [{ messageId: 'staticIv' }] },
        // Hex string pattern
        { code: 'crypto.createCipheriv("aes-256-cbc", key, "0123456789abcdef");', errors: [{ messageId: 'staticIv' }] },
        // Longer hex string
        { code: 'crypto.createCipheriv("aes-256-gcm", key, "00112233445566778899aabbccddeeff");', errors: [{ messageId: 'staticIv' }] },
        // Base64 pattern
        { code: 'crypto.createCipheriv("aes-256-gcm", key, "YWJjZGVmZ2hpamts");', errors: [{ messageId: 'staticIv' }] },
        // All zeros (common mistake)
        { code: 'crypto.createCipheriv("aes-256-gcm", key, "0000000000000000");', errors: [{ messageId: 'staticIv' }] },
        // Alphanumeric pattern
        { code: 'crypto.createCipheriv("aes-256-gcm", key, "abcdefghijklmnop");', errors: [{ messageId: 'staticIv' }] },
      ],
    });
  });

  describe('Invalid Code - Buffer Patterns', () => {
    ruleTester.run('invalid - Buffer.from with static', noStaticIv, {
      valid: [],
      invalid: [
        // Buffer.from with string
        { code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from("staticivvalue"));', errors: [{ messageId: 'staticIv' }] },
        // Buffer.from with hex encoding
        { code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from("0123456789abcdef", "hex"));', errors: [{ messageId: 'staticIv' }] },
        // Buffer.from with base64
        { code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from("YWJjZGVmZ2g=", "base64"));', errors: [{ messageId: 'staticIv' }] },
        // Buffer.alloc with static string (edge case)
        { code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.alloc("16"));', errors: [{ messageId: 'staticIv' }] },
      ],
    });
  });

  describe('Invalid Code - Method Variants', () => {
    ruleTester.run('invalid - createCipheriv and createDecipheriv', noStaticIv, {
      valid: [],
      invalid: [
        // createCipheriv member expression
        { code: 'crypto.createCipheriv("aes-256-gcm", key, "staticiv12345678");', errors: [{ messageId: 'staticIv' }] },
        // createDecipheriv member expression
        { code: 'crypto.createDecipheriv("aes-256-gcm", key, "staticiv12345678");', errors: [{ messageId: 'staticIv' }] },
        // Standalone createCipheriv
        { code: 'createCipheriv("aes-256-gcm", key, "staticivvalue12");', errors: [{ messageId: 'staticIv' }] },
        // Standalone createDecipheriv
        { code: 'createDecipheriv("aes-256-cbc", key, "abcdefghijklmnop");', errors: [{ messageId: 'staticIv' }] },
      ],
    });
  });

  describe('Invalid Code - Algorithm Variations', () => {
    ruleTester.run('invalid - various algorithms', noStaticIv, {
      valid: [],
      invalid: [
        // AES-256-GCM
        { code: 'crypto.createCipheriv("aes-256-gcm", key, "1234567890123456");', errors: [{ messageId: 'staticIv' }] },
        // AES-256-CBC
        { code: 'crypto.createCipheriv("aes-256-cbc", key, "1234567890123456");', errors: [{ messageId: 'staticIv' }] },
        // AES-128-GCM
        { code: 'crypto.createCipheriv("aes-128-gcm", key, "1234567890123456");', errors: [{ messageId: 'staticIv' }] },
        // ChaCha20
        { code: 'crypto.createCipheriv("chacha20-poly1305", key, "123456789012");', errors: [{ messageId: 'staticIv' }] },
      ],
    });
  });
});
