/**
 * Tests for no-cryptojs-weak-random rule
 * CVE-2020-36732: crypto-js weak PRNG
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCryptojsWeakRandom } from './index';

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

describe('no-cryptojs-weak-random', () => {
  ruleTester.run('no-cryptojs-weak-random', noCryptojsWeakRandom, {
    valid: [
      { code: 'crypto.randomBytes(32);' },
      { code: 'crypto.getRandomValues(new Uint8Array(32));' },
      { code: 'SomeLib.random();' },
    ],
    invalid: [
      {
        code: 'WordArray.random(16);',
        errors: [{ messageId: 'weakRandom' }],
      },
      {
        code: 'CryptoJS.lib.WordArray.random(16);',
        errors: [{ messageId: 'weakRandom' }],
      },
      {
        code: 'CryptoJS.random(16);',
        errors: [{ messageId: 'weakRandom' }],
      },
    ],
  });
});
