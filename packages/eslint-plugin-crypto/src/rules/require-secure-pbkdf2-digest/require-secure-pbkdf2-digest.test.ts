/**
 * Tests for require-secure-pbkdf2-digest rule
 * CVE-2023-46233: PBKDF2 with SHA1
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSecurePbkdf2Digest } from './index';

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

describe('require-secure-pbkdf2-digest', () => {
  ruleTester.run('require-secure-pbkdf2-digest', requireSecurePbkdf2Digest, {
    valid: [
      { code: 'crypto.pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
      { code: 'crypto.pbkdf2(password, salt, 100000, 64, "sha512", callback);' },
      { code: 'crypto.pbkdf2Sync(password, salt, 100000, 32, "sha3-256");' },
      { code: 'crypto.pbkdf2(password, salt, 100000, 32, digestAlgo, callback);' },
      { code: 'CryptoJS.PBKDF2(password, salt, { hasher: CryptoJS.algo.SHA256 });' },
      { code: 'pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
    ],
    invalid: [
      {
        code: 'crypto.pbkdf2(password, salt, 100000, 20, "sha1", callback);',
        errors: [{ messageId: 'weakPbkdf2Digest', suggestions: [
          { messageId: 'useSha256', output: 'crypto.pbkdf2(password, salt, 100000, 20, "sha256", callback);' },
          { messageId: 'useSha512', output: 'crypto.pbkdf2(password, salt, 100000, 20, "sha512", callback);' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2(password, salt, 100000, 16, "md5", callback);',
        errors: [{ messageId: 'weakPbkdf2Digest', suggestions: [
          { messageId: 'useSha256', output: 'crypto.pbkdf2(password, salt, 100000, 16, "sha256", callback);' },
          { messageId: 'useSha512', output: 'crypto.pbkdf2(password, salt, 100000, 16, "sha512", callback);' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2Sync(password, salt, 100000, 20, "sha1");',
        errors: [{ messageId: 'weakPbkdf2Digest', suggestions: [
          { messageId: 'useSha256', output: 'crypto.pbkdf2Sync(password, salt, 100000, 20, "sha256");' },
          { messageId: 'useSha512', output: 'crypto.pbkdf2Sync(password, salt, 100000, 20, "sha512");' },
        ] }],
      },
      {
        code: 'pbkdf2(password, salt, 100000, 20, "sha1", callback);',
        errors: [{ messageId: 'weakPbkdf2Digest', suggestions: [
          { messageId: 'useSha256', output: 'pbkdf2(password, salt, 100000, 20, "sha256", callback);' },
          { messageId: 'useSha512', output: 'pbkdf2(password, salt, 100000, 20, "sha512", callback);' },
        ] }],
      },
    ],
  });
});
