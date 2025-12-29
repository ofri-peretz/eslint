/**
 * Tests for require-key-length rule
 * CWE-326: Inadequate Encryption Strength
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireKeyLength } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-key-length', () => {
  ruleTester.run('require-key-length', requireKeyLength, {
    valid: [
      { code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
      { code: 'crypto.createCipheriv("aes-256-cbc", key, iv);' },
      { code: 'crypto.createDecipheriv("aes-256-gcm", key, iv);' },
      { code: 'crypto.createCipheriv(algorithm, key, iv);' },
      { code: 'createCipheriv("aes-256-gcm", key, iv);' },
    ],
    invalid: [
      {
        code: 'crypto.createCipheriv("aes-128-gcm", key, iv);',
        errors: [{ messageId: 'weakKeyLength', suggestions: [
          { messageId: 'useAes256', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createCipheriv("aes-192-gcm", key, iv);',
        errors: [{ messageId: 'weakKeyLength', suggestions: [
          { messageId: 'useAes256', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createCipheriv("aes-128-cbc", key, iv);',
        errors: [{ messageId: 'weakKeyLength', suggestions: [
          { messageId: 'useAes256', output: 'crypto.createCipheriv("aes-256-cbc", key, iv);' },
        ] }],
      },
      {
        code: 'createCipheriv("aes-128-gcm", key, iv);',
        errors: [{ messageId: 'weakKeyLength', suggestions: [
          { messageId: 'useAes256', output: 'createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
    ],
  });
});
