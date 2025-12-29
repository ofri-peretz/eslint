/**
 * Tests for no-ecb-mode rule
 * CWE-327: ECB mode leaks data patterns
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noEcbMode } from './index';

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

describe('no-ecb-mode', () => {
  ruleTester.run('no-ecb-mode', noEcbMode, {
    valid: [
      { code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
      { code: 'crypto.createCipheriv("aes-256-cbc", key, iv);' },
      { code: 'crypto.createCipheriv("aes-256-ctr", key, iv);' },
      { code: 'crypto.createCipheriv(algorithm, key, iv);' },
      { code: 'createCipheriv("aes-256-gcm", key, iv);' },
    ],
    invalid: [
      {
        code: 'crypto.createCipheriv("aes-256-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'crypto.createCipheriv("aes-256-cbc", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createCipheriv("aes-128-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createCipheriv("aes-128-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'crypto.createCipheriv("aes-128-cbc", key, iv);' },
        ] }],
      },
      {
        code: 'crypto.createDecipheriv("aes-256-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'crypto.createDecipheriv("aes-256-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'crypto.createDecipheriv("aes-256-cbc", key, iv);' },
        ] }],
      },
      {
        code: 'createCipheriv("aes-256-ecb", key, iv);',
        errors: [{ messageId: 'ecbMode', suggestions: [
          { messageId: 'useGcm', output: 'createCipheriv("aes-256-gcm", key, iv);' },
          { messageId: 'useCbc', output: 'createCipheriv("aes-256-cbc", key, iv);' },
        ] }],
      },
    ],
  });
});
