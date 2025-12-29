/**
 * Tests for require-authenticated-encryption rule
 * CWE-327: CBC/CTR without MAC
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireAuthenticatedEncryption } from './index';

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

describe('require-authenticated-encryption', () => {
  ruleTester.run('require-authenticated-encryption', requireAuthenticatedEncryption, {
    valid: [
      { code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
      { code: 'crypto.createCipheriv("aes-256-ccm", key, iv);' },
      { code: 'crypto.createCipheriv("chacha20-poly1305", key, iv);' },
      { code: 'crypto.createCipheriv(algorithm, key, iv);' },
      { code: 'createCipheriv("aes-256-gcm", key, iv);' },
    ],
    invalid: [
      {
        code: 'crypto.createCipheriv("aes-256-cbc", key, iv);',
        errors: [{ messageId: 'unauthenticatedEncryption', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createCipheriv("aes-256-ctr", key, iv);',
        errors: [{ messageId: 'unauthenticatedEncryption', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createCipheriv("aes-256-cfb", key, iv);',
        errors: [{ messageId: 'unauthenticatedEncryption', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createCipheriv("aes-256-ofb", key, iv);',
        errors: [{ messageId: 'unauthenticatedEncryption', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createDecipheriv("aes-128-cbc", key, iv);',
        errors: [{ messageId: 'unauthenticatedEncryption', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createDecipheriv("aes-128-gcm", key, iv);' },
        ] }],
      },
      {
        code: 'createCipheriv("aes-256-cbc", key, iv);',
        errors: [{ messageId: 'unauthenticatedEncryption', suggestions: [
          { messageId: 'useGcm', output: 'createCipheriv("aes-256-gcm", key, iv);' },
        ] }],
      },
    ],
  });
});
