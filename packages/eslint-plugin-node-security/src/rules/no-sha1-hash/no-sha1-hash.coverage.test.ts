/**
 * Coverage-gap tests for no-sha1-hash (dual-layer doctrine, Layer 1).
 * Targets: allowInTests test-file bypass in both listeners.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSha1Hash } from './index';

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

describe('no-sha1-hash coverage gaps', () => {
  ruleTester.run('no-sha1-hash', noSha1Hash, {
    valid: [
      // allowInTests + test filename → both ImportDeclaration and
      // CallExpression listeners bail out despite sha1 usage.
      {
        code: "import { sha1 } from 'crypto-hash';\nsha1('data');",
        options: [{ allowInTests: true }],
        filename: 'hash.test.ts',
      },
      // allowInTests enabled but non-test file with safe usage → regex
      // operand of the && evaluates to false.
      {
        code: "import { sha256 } from 'crypto-hash';\nsha256('data');",
        options: [{ allowInTests: true }],
        filename: 'hash.ts',
      },
    ],
    invalid: [],
  });
});
