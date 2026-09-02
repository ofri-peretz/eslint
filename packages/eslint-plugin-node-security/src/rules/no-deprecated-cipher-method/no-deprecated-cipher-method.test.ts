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
      // A name chosen at RUNTIME resolves to nothing to match.
      {
        name: 'a name chosen at RUNTIME resolves to nothing to match',
        code: `const c = crypto[make]('aes-128-cbc', key);`,
      },
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
      { name: 'createCipheriv with an explicit IV', code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
      { code: 'crypto.createDecipheriv("aes-256-gcm", key, iv);' },
    ],
    invalid: [
      {
        name: 'createCipher derives the key from a password with MD5 and no salt',
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
