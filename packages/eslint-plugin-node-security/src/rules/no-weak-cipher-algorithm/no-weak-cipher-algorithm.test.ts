/**
 * Tests for no-weak-cipher-algorithm rule
 * Detects use of weak cipher algorithms (DES, 3DES, RC4, Blowfish)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noWeakCipherAlgorithm } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-weak-cipher-algorithm', noWeakCipherAlgorithm, {
  valid: [
    // Modern secure algorithms
    `const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);`,
    `const cipher = crypto.createCipheriv('aes-128-gcm', key, iv);`,
    `const cipher = crypto.createCipheriv('chacha20-poly1305', key, iv);`,
    `const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);`,
    // Non-crypto calls
    `const result = myFunction('des-like-string');`,
    `const data = processData('blowfish is a fish');`,
    // Different method calls
    `crypto.createHash('sha256');`,
    `crypto.randomBytes(32);`,
    // Standalone function (not cipher method name)
    `const result = otherFunction('des');`,
  ],

  invalid: [
    // DES
    {
      code: `const cipher = crypto.createCipheriv('des', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    {
      code: `const cipher = crypto.createCipheriv('DES', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // 3DES / Triple DES
    {
      code: `const cipher = crypto.createCipheriv('des-ede3', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    {
      code: `const cipher = crypto.createCipheriv('3des', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // RC4
    {
      code: `const cipher = crypto.createCipheriv('rc4', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // Blowfish
    {
      code: `const cipher = crypto.createCipheriv('blowfish', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    {
      code: `const cipher = crypto.createCipheriv('bf', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // RC2
    {
      code: `const cipher = crypto.createCipheriv('rc2', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // IDEA
    {
      code: `const cipher = crypto.createCipheriv('idea', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // createCipher (deprecated)
    {
      code: `const cipher = crypto.createCipher('des', password);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipher("aes-256-gcm", password);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipher("chacha20-poly1305", password);` },
      ]}],
    },
    // createDecipher
    {
      code: `const decipher = crypto.createDecipheriv('rc4', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const decipher = crypto.createDecipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // Standalone calls
    {
      code: `const cipher = createCipheriv('des', key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
    // Additional weak ciphers option
    {
      code: `const cipher = crypto.createCipheriv('cast5', key, iv);`,
      options: [{ additionalWeakCiphers: ['cast5'] }],
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);` },
        { messageId: 'useChaCha20', output: `const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);` },
      ]}],
    },
  ],
});

/**
 * FN lock — the cipher name held in a `const`.
 *
 * `const CIPHER_ALGORITHM = 'des-ede3-cbc'` at the top of a crypto module is
 * how this is normally written, and it was completely invisible: the check read
 * `firstArg.type === 'Literal'`, so an `Identifier` fell through. Both invalid
 * cases below are QUIET on the pre-fix rule.
 */
ruleTester.run('no-weak-cipher-algorithm — algorithm held in a const', noWeakCipherAlgorithm, {
  valid: [
    // A `let` may be reassigned before the call, so its initializer is not the
    // value that reaches the sink. Unresolved stays quiet.
    `let algo = 'rc4'; algo = negotiate(); crypto.createCipheriv(algo, key, iv);`,
    // A const holding a modern algorithm must not begin reporting.
    `const CIPHER = 'aes-256-gcm'; crypto.createCipheriv(CIPHER, key, iv);`,
    // Read from config: no literal anywhere, so no evidence.
    `const CIPHER = config.cipher; crypto.createCipheriv(CIPHER, key, iv);`,
  ],
  invalid: [
    {
      code: `const CIPHER_ALGORITHM = 'des-ede3-cbc';\ncrypto.createCipheriv(CIPHER_ALGORITHM, key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const CIPHER_ALGORITHM = "aes-256-gcm";\ncrypto.createCipheriv(CIPHER_ALGORITHM, key, iv);` },
        { messageId: 'useChaCha20', output: `const CIPHER_ALGORITHM = "chacha20-poly1305";\ncrypto.createCipheriv(CIPHER_ALGORITHM, key, iv);` },
      ]}],
    },
    {
      code: `const LEGACY = \`rc4\`;\nconst decipher = createDecipheriv(LEGACY, key, iv);`,
      errors: [{ messageId: 'weakCipherAlgorithm', suggestions: [
        { messageId: 'useAes256Gcm', output: `const LEGACY = "aes-256-gcm";\nconst decipher = createDecipheriv(LEGACY, key, iv);` },
        { messageId: 'useChaCha20', output: `const LEGACY = "chacha20-poly1305";\nconst decipher = createDecipheriv(LEGACY, key, iv);` },
      ]}],
    },
  ],
});

