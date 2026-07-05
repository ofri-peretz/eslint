/**
 * Coverage-gap tests for no-cryptojs-weak-random (dual-layer doctrine, Layer 1).
 * Targets: allowInTests bypass, non-member callee, non-WordArray member chains.
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

describe('no-cryptojs-weak-random coverage gaps', () => {
  ruleTester.run('no-cryptojs-weak-random', noCryptojsWeakRandom, {
    valid: [
      // allowInTests + test filename → listener bails out on weak random
      {
        code: 'CryptoJS.lib.WordArray.random(16);',
        options: [{ allowInTests: true }],
        filename: 'random.test.ts',
      },
      // allowInTests but non-test file, safe code → regex operand false
      {
        code: 'crypto.randomBytes(16);',
        options: [{ allowInTests: true }],
        filename: 'random.ts',
      },
      // Plain identifier call → callee is not a MemberExpression at all
      { code: 'random();' },
      // x.y.random() where inner property is not WordArray → inner check false
      { code: 'a.b.random();' },
    ],
    invalid: [],
  });
});
