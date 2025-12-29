/**
 * Tests for no-web-crypto-export rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWebCryptoExport } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-web-crypto-export', () => {
  ruleTester.run('no-web-crypto-export', noWebCryptoExport, {
    valid: [
      { code: 'await crypto.subtle.generateKey(algorithm, false, usages);' },
      { code: 'await crypto.subtle.encrypt(algorithm, key, data);' },
    ],
    invalid: [
      {
        code: 'await crypto.subtle.exportKey("raw", key);',
        errors: [{ messageId: 'keyExport' }],
      },
      {
        code: 'await crypto.subtle.exportKey("jwk", key);',
        errors: [{ messageId: 'keyExport' }],
      },
      {
        code: 'await crypto.subtle.wrapKey("raw", key, wrappingKey, algorithm);',
        errors: [{ messageId: 'keyExport' }],
      },
    ],
  });
});
