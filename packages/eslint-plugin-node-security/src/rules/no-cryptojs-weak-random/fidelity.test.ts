/**
 * no-cryptojs-weak-random — the contract the Quint fidelity model settled
 * (benchmarks/suites/fidelity/models/node-security/no_cryptojs_weak_random.qnt).
 * The doc listed a `CryptoJS.random()` crypto-js does not have, and called an
 * aliased `WordArray.random` undetected while the rule detects it. The doc now
 * says both truthfully; this locks them.
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
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-cryptojs-weak-random fidelity', () => {
  ruleTester.run('the documented surface', noCryptojsWeakRandom, {
    valid: [
      {
        name: 'CryptoJS.random is not a crypto-js API and is not reported',
        code: `import CryptoJS from 'crypto-js';
export const key = (CryptoJS as any).random(32);`,
      },
    ],
    invalid: [
      {
        name: 'an alias of WordArray.random is reported',
        code: `import CryptoJS from 'crypto-js';
const rand = CryptoJS.lib.WordArray.random;
export const salt = rand(16);`,
        errors: 1,
      },
    ],
  });
});
