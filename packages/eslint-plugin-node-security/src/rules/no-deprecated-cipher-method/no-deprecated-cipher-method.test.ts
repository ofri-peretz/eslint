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
      { name: 'a numeric literal is not a cipher call', code: 'const x = 42;' },
      { name: 'a boolean literal is not a cipher call', code: 'const flag = true;' },
      { name: 'an empty function is not a cipher call', code: 'function noop() {}' },
      { name: 'an array literal is not a cipher call', code: 'const items = [];' },
      { name: 'createCipheriv with an explicit IV', code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
      {
        name: 'createDecipheriv with an explicit IV is the prescribed form',
        code: 'crypto.createDecipheriv("aes-256-gcm", key, iv);',
      },
    ],
    invalid: [
      // FP/FN sweep 2026-09-15. The detection gate was converted to the
      // computed-aware `propertyName()` (the 154-rule #793 campaign), but the
      // report path still read `callee.property.name` through an
      // `as TSESTree.Identifier` cast. On a computed subscript the property is
      // a Literal, so `.name` was `undefined`: the message rendered
      // `crypto.undefined()`, and `methodName === 'createCipher'` was false, so
      // an ENCRYPTION call was offered the DECRYPTION constructor. The fixer
      // replaced the property's full range, quotes included, emitting a bare
      // identifier that resolves nowhere.
      {
        name: 'a computed subscript names the method it actually calls',
        code: `const c = crypto['createCipher']('aes-256-cbc', pwd);`,
        errors: [
          {
            messageId: 'deprecatedCipherMethod',
            data: { method: 'createCipher', replacement: 'createCipheriv' },
            suggestions: [
              {
                messageId: 'useCipheriv',
                data: { replacement: 'createCipheriv' },
                output: `const c = crypto['createCipheriv']('aes-256-cbc', pwd);`,
              },
            ],
          },
        ],
      },
      {
        name: 'a computed decipher subscript keeps its own replacement and quotes',
        code: `const d = crypto["createDecipher"]("aes-256-cbc", pwd);`,
        errors: [
          {
            messageId: 'deprecatedCipherMethod',
            data: { method: 'createDecipher', replacement: 'createDecipheriv' },
            suggestions: [
              {
                messageId: 'useCipheriv',
                data: { replacement: 'createDecipheriv' },
                output: `const d = crypto["createDecipheriv"]("aes-256-cbc", pwd);`,
              },
            ],
          },
        ],
      },
      {
        name: 'createCipher derives the key from a password with MD5 and no salt',
        code: 'crypto.createCipher("aes-256-cbc", password);',
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [
          { messageId: 'useCipheriv', output: 'crypto.createCipheriv("aes-256-cbc", password);' },
        ] }],
      },
      {
        name: 'createDecipher is offered its own replacement, not the cipher one',
        code: 'crypto.createDecipher("aes-256-cbc", password);',
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [
          { messageId: 'useCipheriv', output: 'crypto.createDecipheriv("aes-256-cbc", password);' },
        ] }],
      },
      {
        name: 'a bare createCipher call is reported without a member receiver',
        code: 'createCipher("aes-256-cbc", password);',
        errors: [{ messageId: 'deprecatedCipherMethod', suggestions: [
          { messageId: 'useCipheriv', output: 'createCipheriv("aes-256-cbc", password);' },
        ] }],
      },
    ],
  });
});
