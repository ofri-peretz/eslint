/**
 * Tests for require-random-iv rule
 * CWE-329: Not Using an Unpredictable IV
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireRandomIv } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-random-iv', () => {
  ruleTester.run('require-random-iv', requireRandomIv, {
    valid: [
      // Variable from randomBytes
      { code: 'const iv = crypto.randomBytes(16); crypto.createCipheriv("aes-256-gcm", key, iv);' },
      // Direct randomBytes call
      { code: 'crypto.createCipheriv("aes-256-gcm", key, crypto.randomBytes(16));' },
      // Standalone randomBytes (line 115)
      { code: 'crypto.createCipheriv("aes-256-gcm", key, randomBytes(16));' },
      // getRandomValues (line 105)
      { code: 'crypto.createCipheriv("aes-256-gcm", key, crypto.getRandomValues(new Uint8Array(16)));' },
      // randomFillSync
      { code: 'crypto.createCipheriv("aes-256-gcm", key, crypto.randomFillSync(Buffer.alloc(16)));' },
      // Variable from await randomBytes (line 94)
      { code: 'const iv = await crypto.randomBytes(16); crypto.createCipheriv("aes-256-gcm", key, iv);' },
      // Await expression with randomBytes (line 150)
      { code: 'crypto.createCipheriv("aes-256-gcm", key, await crypto.randomBytes(16));' },
      // createDecipheriv with random IV
      { code: 'crypto.createDecipheriv("aes-256-gcm", key, crypto.randomBytes(16));' },
      // Standalone function with random IV
      { code: 'createCipheriv("aes-256-gcm", key, crypto.randomBytes(16));' },
      // Less than 3 args - edge case
      { code: 'crypto.createCipheriv("aes-256-gcm", key);' },
      // Non-cipher call
      { code: 'somethingElse("aes-256-gcm", key, "static-iv");' },
    ],
    invalid: [
      // String literal IV
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, "1234567890123456");',
        errors: [{ messageId: 'nonRandomIv' }],
      },
      // Buffer.alloc without random fill (lines 186-206)
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.alloc(16));',
        errors: [{ messageId: 'nonRandomIv' }],
      },
      // Buffer.from with static string
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from("static-iv"));',
        errors: [{ messageId: 'nonRandomIv' }],
      },
      // Buffer.from with byte array (lines 186-190)
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]));',
        errors: [{ messageId: 'nonRandomIv' }],
      },
      // createDecipheriv with static IV
      {
        code: 'crypto.createDecipheriv("aes-256-gcm", key, "static-iv-value");',
        errors: [{ messageId: 'nonRandomIv' }],
      },
      // Standalone function with static IV
      {
        code: 'createCipheriv("aes-256-gcm", key, "static");',
        errors: [{ messageId: 'nonRandomIv' }],
      },
    ],
  });
});
