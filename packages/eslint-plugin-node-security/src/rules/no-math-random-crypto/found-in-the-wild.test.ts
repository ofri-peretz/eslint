/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A defect this rule found in code somebody else shipped.
 *
 * Reduced from the file it was reported against, and accepted upstream. It is
 * a lock as much as evidence: silencing it gives back a finding that was worth
 * a pull request.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-math-random-crypto — found in the wild', () => {
  ruleTester.run('wild', noMathRandomCrypto, {
    valid: [],
    invalid: [
      {
        // The value is the map key that claims a device pairing challenge:
        // predictable generator, five-minute window. CWE-338.
        // @source telepat-io/otto packages/relay/src/auth/helpers.ts:6
        filename: 'packages/relay/src/auth/helpers.ts',
        name: 'a device pairing code built from Math.random()',
        code: `
          export function generatePairingCode(): string {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
          }
        `,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
    ],
  });
});
