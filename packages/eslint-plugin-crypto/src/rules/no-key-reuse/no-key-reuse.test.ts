/**
 * Tests for no-key-reuse rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noKeyReuse } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-key-reuse', () => {
  ruleTester.run('no-key-reuse', noKeyReuse, {
    valid: [
      { code: 'crypto.createCipheriv("aes-256-gcm", key1, iv1); crypto.createCipheriv("aes-256-gcm", key2, iv2);' },
    ],
    invalid: [
      {
        code: 'crypto.createCipheriv("aes-256-gcm", sharedKey, iv1); crypto.createCipheriv("aes-256-gcm", sharedKey, iv2);',
        errors: [{ messageId: 'keyReuse' }],
      },
    ],
  });
});
