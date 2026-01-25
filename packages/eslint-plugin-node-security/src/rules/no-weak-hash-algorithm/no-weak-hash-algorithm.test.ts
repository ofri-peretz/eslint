/**
 * Tests for no-weak-hash-algorithm rule
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakHashAlgorithm } from './index';

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

describe('no-weak-hash-algorithm', () => {
  ruleTester.run('no-weak-hash-algorithm', noWeakHashAlgorithm, {
    valid: [
      // Valid: SHA-256 (strong)
      { code: 'crypto.createHash("sha256").update(data);' },
      { code: 'crypto.createHash("sha512").update(data);' },
      { code: 'crypto.createHash("sha3-256").update(data);' },
      // Valid: Non-crypto context
      { code: 'const message = "md5 is weak";' },
      // Valid: Test file with allowInTests
      {
        code: 'crypto.createHash("md5").update(data);',
        filename: 'crypto.test.ts',
        options: [{ allowInTests: true }],
      },
      // Valid: Non-hash function with weak name
      { code: 'console.log("sha1");' },
      // Valid: sha256 function (strong)
      { code: 'sha256(data);' },
    ],
    invalid: [
      // Invalid: MD5
      {
        code: 'crypto.createHash("md5").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: SHA-1
      {
        code: 'crypto.createHash("sha1").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: MD4
      {
        code: 'crypto.createHash("md4").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: Case insensitive
      {
        code: 'crypto.createHash("MD5").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: Standalone createHash function
      {
        code: 'createHash("md5");',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'createHash("sha256");' },
            { messageId: 'useSha512', output: 'createHash("sha512");' },
            { messageId: 'useSha3', output: 'createHash("sha3-256");' },
          ],
        }],
      },
      // Invalid: RIPEMD
      {
        code: 'crypto.createHash("ripemd").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: Direct sha1() function call (lines 205-221)
      {
        code: 'sha1(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'sha256(data);' },
          ],
        }],
      },
      // Invalid: Direct md5() function call (lines 83-85, 205-221)
      {
        code: 'md5(password);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'sha256(password);' },
          ],
        }],
      },
      // Invalid: Direct md4() function call
      {
        code: 'md4(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'sha256(data);' },
          ],
        }],
      },
      // Invalid: Additional weak algorithms option
      {
        code: 'crypto.createHash("whirlpool").update(data);',
        options: [{ additionalWeakAlgorithms: ['whirlpool'] }],
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
    ],
  });
});
