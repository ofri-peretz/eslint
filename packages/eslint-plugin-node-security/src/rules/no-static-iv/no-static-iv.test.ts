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

  /**
   * FN lock — the IV held in a `const`.
   *
   * The rule used to carry an empty `if (ivArg.type === Identifier) { }` block
   * whose comment read "we don't report variables as we can't always determine
   * their source". That is the bug written down as the spec: hoisting the IV to
   * a module constant is exactly how CWE-329 appears in real code, and it made
   * the rule silent. Every invalid case below is QUIET on the pre-fix rule.
   *
   * "Can't ALWAYS determine" is not "can never determine" — a single-assignment
   * `const` is decidable, and everything else still falls through silently, as
   * the valid cases pin.
   */
  describe('Invalid Code - IV hoisted to a const', () => {
    ruleTester.run('invalid - const-held IVs', noStaticIv, {
      valid: [
        // Already covered above, repeated here as the direct control: the same
        // const shape carrying randomBytes must stay quiet.
        { code: 'const iv = crypto.randomBytes(16); crypto.createCipheriv("aes-256-cbc", key, iv);' },
        // A `let` can be reassigned between declaration and use.
        { code: 'let iv = "0123456789abcdef"; iv = crypto.randomBytes(16); crypto.createCipheriv("aes-256-cbc", key, iv);' },
        // No initializer to read.
        { code: 'const iv = loadIv(); crypto.createCipheriv("aes-256-cbc", key, iv);' },
        // Buffer.from over a non-literal is not evidence of a static IV.
        { code: 'const iv = Buffer.from(process.env.IV, "hex"); crypto.createCipheriv("aes-256-cbc", key, iv);' },
        // A DESTRUCTURED const binds no single name to a single initializer,
        // so there is nothing to resolve. Unresolved, not safe.
        { code: 'const { iv } = opts; crypto.createCipheriv("aes-256-cbc", key, iv);' },
        // A `for…of` const has no initializer at all — the value comes from the
        // iterable, one element at a time.
        { code: 'for (const iv of ivs) { crypto.createCipheriv("aes-256-cbc", key, iv); }' },
      ],
      invalid: [
        // The archetype: a module-level hex IV reused for every encryption.
        {
          code: 'const IV = "0123456789abcdef";\ncrypto.createCipheriv("aes-256-cbc", key, IV);',
          errors: [{ messageId: 'staticIv' }],
        },
        // Buffer.from over a hardcoded hex string, hoisted.
        {
          code: 'const IV = Buffer.from("00112233445566778899aabbccddeeff", "hex");\ncrypto.createDecipheriv("aes-256-cbc", key, IV);',
          errors: [{ messageId: 'staticIv' }],
        },
        // Buffer.from over a byte-array literal, hoisted.
        {
          code: 'const IV = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);\ncreateCipheriv("aes-256-cbc", key, IV);',
          errors: [{ messageId: 'staticIv' }],
        },
        // An inner const shadows an outer one — scope analysis, not a name map.
        {
          code: 'const IV = crypto.randomBytes(16);\nfunction enc() { const IV = "abcdefghijklmnop"; return createCipheriv("aes-256-cbc", key, IV); }',
          errors: [{ messageId: 'staticIv' }],
        },
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
