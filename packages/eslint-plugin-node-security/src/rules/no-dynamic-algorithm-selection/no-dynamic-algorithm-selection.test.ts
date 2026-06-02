import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicAlgorithmSelection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-dynamic-algorithm-selection', () => {
  ruleTester.run('no-dynamic-algorithm-selection', noDynamicAlgorithmSelection, {
    valid: [
      { code: 'crypto.createHash("sha256")' },
      { code: 'crypto.createHmac("sha512", secret)' },
      { code: 'crypto.createCipheriv("aes-256-gcm", key, iv)' },
      { code: 'crypto.createSign("RSA-SHA256")' },
      { code: 'crypto.createHash(`sha256`)' },  // static template literal
      // Not 'crypto' object — not checked
      { code: 'customCrypto.createHash(algo)' },
      // Different method — not checked
      { code: 'crypto.randomBytes(32)' },
    ],
    invalid: [
      {
        code: 'crypto.createHash(userAlgorithm)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createHash' } }],
      },
      {
        code: 'crypto.createHash(req.query.algo)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createHash' } }],
      },
      {
        code: 'crypto.createCipheriv(config.algorithm, key, iv)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createCipheriv' } }],
      },
      {
        code: 'crypto.createHmac(`${userChoice}`, secret)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createHmac' } }],
      },
      {
        code: 'crypto.createSign(req.body.signAlgo)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createSign' } }],
      },
    ],
  });
});
