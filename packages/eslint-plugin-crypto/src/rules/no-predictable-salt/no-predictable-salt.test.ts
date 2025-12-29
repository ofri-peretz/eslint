/**
 * Tests for no-predictable-salt rule
 * CWE-331: Insufficient Entropy
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPredictableSalt } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-predictable-salt', () => {
  ruleTester.run('no-predictable-salt', noPredictableSalt, {
    valid: [
      // Random salt
      { code: 'crypto.pbkdf2(password, crypto.randomBytes(16), 100000, 32, "sha256", cb);' },
      { code: 'crypto.pbkdf2(password, randomSalt, 100000, 32, "sha256", cb);' },
      // Standalone function with random salt
      { code: 'pbkdf2(password, crypto.randomBytes(16), 100000, 32, "sha256", cb);' },
      // scrypt with random salt
      { code: 'crypto.scrypt(password, crypto.randomBytes(16), 64, cb);' },
      { code: 'crypto.scryptSync(password, randomSalt, 64);' },
      // Less than 2 args - edge case
      { code: 'crypto.pbkdf2(password);' },
      // Non-key-derivation function
      { code: 'somethingElse(password, "salt");' },
    ],
    invalid: [
      // Empty string salt
      {
        code: 'crypto.pbkdf2(password, "", 100000, 32, "sha256", cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // Short salt (lines 102-104)
      {
        code: 'crypto.pbkdf2(password, "salt", 100000, 32, "sha256", cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // Hardcoded long salt (lines 107-109)
      {
        code: 'crypto.pbkdf2(password, "this-is-a-long-hardcoded-salt-string", 100000, 32, "sha256", cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // Buffer.from with static string
      {
        code: 'crypto.pbkdf2(password, Buffer.from("static"), 100000, 32, "sha256", cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // Buffer.alloc(0) - empty (lines 137-140)
      {
        code: 'crypto.pbkdf2(password, Buffer.alloc(0), 100000, 32, "sha256", cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // Buffer.alloc with short size (lines 141-142)
      {
        code: 'crypto.pbkdf2(password, Buffer.alloc(8), 100000, 32, "sha256", cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // scrypt with empty salt
      {
        code: 'crypto.scrypt(password, "", 64, cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // scryptSync with hardcoded salt
      {
        code: 'crypto.scryptSync(password, "hardcoded", 64);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // Standalone pbkdf2 with short salt
      {
        code: 'pbkdf2(password, "abc", 100000, 32, "sha256", cb);',
        errors: [{ messageId: 'predictableSalt' }],
      },
      // pbkdf2Sync with hardcoded salt
      {
        code: 'crypto.pbkdf2Sync(password, "static-salt", 100000, 32, "sha256");',
        errors: [{ messageId: 'predictableSalt' }],
      },
    ],
  });
});
