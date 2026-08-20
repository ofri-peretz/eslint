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

  /**
   * Regression locks for the shapes the CWE-329 rule corpus proved were missed.
   *
   * Every `invalid` case here was SILENT on the shipped rule
   * (benchmarks/rule-corpus/node-security__no-static-iv took the rule from
   * 57.1% F1 to 96.6%). Every `valid` case is the remediation that sits closest
   * to its neighbouring bug — the zero buffer that IS filled, the allocation
   * that is NOT an IV — because the fixes for the misses are exactly the code
   * that could start claiming those.
   */
  describe('Corpus regressions - CWE-329 shapes the rule used to miss', () => {
    ruleTester.run('corpus regressions', noStaticIv, {
      valid: [
        // Buffer.alloc(16) overwritten by a CSPRNG before use. Identical
        // allocation to the all-zero-IV bug; only the fill separates them.
        {
          code: 'const iv = Buffer.alloc(16);\nrandomFillSync(iv);\ncreateCipheriv("aes-256-cbc", key, iv);',
        },
        // The callback form of the same fill.
        {
          code: 'const iv = Buffer.alloc(16);\ncrypto.randomFill(iv, () => { crypto.createCipheriv("aes-256-cbc", key, iv); });',
        },
        // new Uint8Array(16) is zero-filled too, and getRandomValues fixes it.
        {
          code: 'const iv = new Uint8Array(16);\nwebcrypto.getRandomValues(iv);\ncreateCipheriv("aes-256-cbc", key, iv);',
        },
        // A `let` whose every write is a fresh randomBytes. The binding is
        // mutable, but nothing static ever reaches the sink.
        {
          code: 'let iv = randomBytes(16);\niv = randomBytes(16);\ncreateCipheriv("aes-256-cbc", key, iv);',
        },
        // A `let` declared with no initializer and never written: no value to
        // judge. `.every` over an empty candidate list would report here.
        {
          code: 'let iv;\ncreateCipheriv("aes-256-cbc", key, iv);',
        },
        // Buffer.alloc used for something that is not the IV.
        {
          code: 'const header = Buffer.alloc(16);\ncreateCipheriv("aes-256-cbc", key, randomBytes(16));',
        },
        // The static buffer is the KEY, not the IV — CWE-798, another rule.
        {
          code: 'createCipheriv("aes-256-cbc", Buffer.alloc(32), randomBytes(16));',
        },
        // A destructured binding target cannot be enumerated; no evidence.
        {
          code: 'const [iv] = pool;\ncreateCipheriv("aes-256-cbc", key, iv);',
        },
        // A non-typed-array constructor with a literal argument.
        {
          code: 'const iv = new Date(16);\ncreateCipheriv("aes-256-cbc", key, iv);',
        },
        // Buffer.concat is neither `from` nor `alloc`.
        {
          code: 'const iv = Buffer.concat([a, b]);\ncreateCipheriv("aes-256-cbc", key, iv);',
        },
        // A computed member that is not a string literal cannot be read.
        {
          code: 'crypto[methodName]("aes-256-cbc", key, "0123456789abcdef");',
        },
      ],
      invalid: [
        // The all-zero IV. `Buffer.alloc(16)` reads as allocation rather than
        // as a hardcoded constant, which is why it is the commonest real one.
        {
          code: 'createCipheriv("aes-256-cbc", key, Buffer.alloc(16));',
          errors: [{ messageId: 'staticIv' }],
        },
        {
          code: 'const iv = Buffer.alloc(16);\ncreateCipheriv("aes-256-cbc", key, iv);',
          errors: [{ messageId: 'staticIv' }],
        },
        // The hex string hoisted to a named constant, Buffer.from at the call.
        {
          code: 'const IV_HEX = "0f1e2d3c4b5a69788796a5b4c3d2e1f0";\ncreateCipheriv("aes-256-cbc", key, Buffer.from(IV_HEX, "hex"));',
          errors: [{ messageId: 'staticIv' }],
        },
        // A template literal with no expressions is a string constant; the
        // quote character is not a security property.
        {
          code: 'createCipheriv("aes-256-cbc", key, Buffer.from(`00112233445566778899aabbccddeeff`, "hex"));',
          errors: [{ messageId: 'staticIv' }],
        },
        // `new Uint8Array([...])` — the shape the old code's comment claimed
        // to check while actually checking `Buffer.from([...])`.
        {
          code: 'const IV = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);\ncreateCipheriv("aes-256-cbc", key, IV);',
          errors: [{ messageId: 'staticIv' }],
        },
        {
          code: 'createCipheriv("aes-256-cbc", key, new Uint8Array(16));',
          errors: [{ messageId: 'staticIv' }],
        },
        // A type-only cast must not hide the IV.
        {
          code: 'const IV = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);\ncreateCipheriv("aes-256-cbc", key, IV as unknown as Buffer);',
          errors: [{ messageId: 'staticIv' }],
        },
        // An aliased ESM import spells nothing recognisable at the call site.
        // Only the resolved binding says this is crypto.
        {
          code: 'import { createCipheriv as makeCipher } from "node:crypto";\nmakeCipher("aes-256-cbc", key, Buffer.from([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]));',
          errors: [{ messageId: 'staticIv' }],
        },
        // The CommonJS spelling of the same rename.
        {
          code: 'const { createCipheriv: mkCipher } = require("node:crypto");\nmkCipher("aes-256-cbc", key, Buffer.from("deadbeefdeadbeefdeadbeefdeadbeef", "hex"));',
          errors: [{ messageId: 'staticIv' }],
        },
        // Computed member access: the property is a Literal with no `.name`.
        {
          code: 'crypto["createCipheriv"]("aes-256-cbc", key, "0123456789abcdef");',
          errors: [{ messageId: 'staticIv' }],
        },
        // Optional chaining changes the node, not the bug.
        {
          code: 'crypto?.createCipheriv("aes-256-cbc", key, Buffer.alloc(16));',
          errors: [{ messageId: 'staticIv' }],
        },
        // A `let` whose EVERY write is a fixed value. Mirrors the valid case
        // above where every write is randomBytes.
        {
          code: 'let iv = Buffer.alloc(16);\nif (v2) { iv = Buffer.from("00112233445566778899aabbccddeeff", "hex"); }\ncreateCipheriv("aes-256-cbc", key, iv);',
          errors: [{ messageId: 'staticIv' }],
        },
        // The decrypt half, via a namespace bound by require.
        {
          code: 'const cp = require("crypto");\ncp.createDecipheriv("aes-256-cbc", key, "abcdef0123456789");',
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
