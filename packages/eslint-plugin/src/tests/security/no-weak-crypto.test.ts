/**
 * Comprehensive tests for no-weak-crypto rule
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakCrypto } from '../../rules/security/no-weak-crypto';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-weak-crypto', () => {
  ruleTester.run('no-weak-crypto', noWeakCrypto, {
    valid: [
      // Valid: SHA-256 (strong)
      {
        code: 'const hash = crypto.createHash("sha256").update(data);',
      },
      {
        code: 'const hash = crypto.createHash("sha512").update(data);',
      },
      {
        code: 'const hash = crypto.createHash("sha3-256").update(data);',
      },
      // Valid: AES-256 (strong)
      {
        code: 'const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);',
      },
      {
        code: 'const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv);',
      },
      // Valid: bcrypt for passwords
      {
        code: 'const hash = bcrypt.hash(password, 10);',
      },
      {
        code: 'const hash = crypto.scrypt(password, salt, 64);',
      },
      // Valid: Non-crypto strings
      {
        code: 'const message = "md5 is weak";',
      },
      {
        code: 'const comment = "sha1 is deprecated";',
      },
      // Valid: Test files (if allowInTests is true)
      {
        code: 'const hash = crypto.createHash("md5").update(data);',
        filename: 'test.spec.ts',
        options: [{ allowInTests: true }],
      },
    ],
    invalid: [
      // Invalid: MD5
      {
        code: 'const hash = crypto.createHash("md5").update(data);',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'const hash = crypto.createHash("sha256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: SHA-1
      {
        code: 'const hash = crypto.createHash("sha1").update(data);',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'const hash = crypto.createHash("sha256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: DES
      {
        code: 'const cipher = crypto.createCipher("des", key);',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useAes256',
                output: 'const cipher = crypto.createCipher("aes-256-gcm", key);',
              },
            ],
          },
        ],
      },
      // Invalid: 3DES
      {
        code: 'const cipher = crypto.createCipher("des-ede3", key);',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useAes256',
                output: 'const cipher = crypto.createCipher("aes-256-gcm", key);',
              },
            ],
          },
        ],
      },
      // Invalid: RC4
      {
        code: 'const cipher = crypto.createCipher("rc4", key);',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useAes256',
                output: 'const cipher = crypto.createCipher("aes-256-gcm", key);',
              },
            ],
          },
        ],
      },
      // Invalid: Case insensitive
      {
        code: 'const hash = crypto.createHash("MD5").update(data);',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'const hash = crypto.createHash("sha256").update(data);',
              },
            ],
          },
        ],
      },
      {
        code: 'const hash = crypto.createHash("Sha1").update(data);',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'const hash = crypto.createHash("sha256").update(data);',
              },
            ],
          },
        ],
      },
      // Invalid: String literal used in crypto context
      {
        code: 'const hash = createHash("md5");',
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'const hash = createHash("sha256");',
              },
            ],
          },
        ],
      },
      // Invalid: Additional weak algorithms
      {
        code: 'const hash = crypto.createHash("md4").update(data);',
        options: [{ additionalWeakAlgorithms: ['md4'] }],
        errors: [
          {
            messageId: 'weakCrypto',
            suggestions: [
              {
                messageId: 'useSha256',
                output: 'const hash = crypto.createHash("sha256").update(data);',
              },
            ],
          },
        ],
      },
    ],
  });

  describe('Uncovered Lines', () => {
    ruleTester.run('uncovered lines - test files', noWeakCrypto, {
      valid: [
        {
          code: 'const hash = crypto.createHash("md5").update(data);',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('uncovered lines - member expression', noWeakCrypto, {
      valid: [],
      invalid: [
        {
          code: 'const hash = crypto.createHash("md5").update(data);',
          errors: [
            {
              messageId: 'weakCrypto',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: 'const hash = crypto.createHash("sha256").update(data);',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('uncovered lines - identifier callee', noWeakCrypto, {
      valid: [],
      invalid: [
        {
          code: 'const hash = createHash("md5");',
          errors: [
            {
              messageId: 'weakCrypto',
              suggestions: [
                {
                  messageId: 'useSha256',
                  output: 'const hash = createHash("sha256");',
                },
              ],
            },
          ],
        },
        {
          code: 'const cipher = createCipher("des", key);',
          errors: [
            {
              messageId: 'weakCrypto',
              suggestions: [
                {
                  messageId: 'useAes256',
                  output: 'const cipher = createCipher("aes-256-gcm", key);',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('uncovered lines - 3des variations', noWeakCrypto, {
      valid: [],
      invalid: [
        {
          code: 'const cipher = crypto.createCipher("tripledes", key);',
          errors: [
            {
              messageId: 'weakCrypto',
              suggestions: [
                {
                  messageId: 'useAes256',
                  output: 'const cipher = crypto.createCipher("aes-256-gcm", key);',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

