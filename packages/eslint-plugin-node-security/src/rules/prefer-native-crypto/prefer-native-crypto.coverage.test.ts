/**
 * Coverage-gap tests for prefer-native-crypto.
 * Layer 1: require() of a third-party crypto lib, non-require calls.
 * Layer 2: ImportDeclaration with a non-string source value — impossible via
 * the real parser (import sources are always string literals), exercised with
 * createWithMockContext from @interlace/eslint-devkit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { preferNativeCrypto } from './index';

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

describe('prefer-native-crypto coverage gaps', () => {
  ruleTester.run('prefer-native-crypto', preferNativeCrypto, {
    valid: [
      // CallExpression that is not require() → member guard falls through
      { code: 'loadCrypto("crypto-js");' },
      // require() of a non-crypto lib → THIRD_PARTY_CRYPTO_LIBS miss
      { code: 'require("lodash");' },
    ],
    invalid: [
      // require() of a third-party crypto lib → reported
      {
        code: 'const CryptoJS = require("crypto-js");',
        errors: [{ messageId: 'preferNative' }],
      },
      // Scoped path require → base package extraction
      {
        code: 'const aes = require("crypto-js/aes");',
        errors: [{ messageId: 'preferNative' }],
      },
    ],
  });

  describe('Layer 2: synthetic ImportDeclaration', () => {
    it('ignores an import whose source value is not a string', () => {
      const { listeners, reports } = createWithMockContext(
        preferNativeCrypto as never
      );
      (listeners.ImportDeclaration as (n: unknown) => void)({
        type: 'ImportDeclaration',
        source: { type: 'Literal', value: null },
        specifiers: [],
      });
      expect(reports).toHaveLength(0);
    });
  });
});
