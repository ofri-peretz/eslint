/**
 * Tests for no-deprecated-cipher-method rule
 * CWE-327: Deprecated crypto.createCipher/createDecipher
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedCipherMethod } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-deprecated-cipher-method', () => {
  ruleTester.run('no-deprecated-cipher-method', noDeprecatedCipherMethod, {
    valid: [
      { code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
      { code: 'crypto.createDecipheriv("aes-256-gcm", key, iv);' },
    ],
    invalid: [
      {
        code: 'crypto.createCipher("aes-256-cbc", password);',
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [
          { messageId: 'useCipheriv', output: 'crypto.createCipheriv("aes-256-cbc", password);' },
        ] }],
      },
      {
        code: 'crypto.createDecipher("aes-256-cbc", password);',
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [
          { messageId: 'useCipheriv', output: 'crypto.createDecipheriv("aes-256-cbc", password);' },
        ] }],
      },
      {
        code: 'createCipher("aes-256-cbc", password);',
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [
          { messageId: 'useCipheriv', output: 'createCipheriv("aes-256-cbc", password);' },
        ] }],
      },
    ],
  });
});
