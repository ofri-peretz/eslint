/**
 * Tests for prefer-native-crypto rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferNativeCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('prefer-native-crypto', () => {
  ruleTester.run('prefer-native-crypto', preferNativeCrypto, {
    valid: [
      { code: 'import crypto from "node:crypto";' },
      { code: 'const crypto = require("crypto");' },
    ],
    invalid: [
      {
        code: 'import CryptoJS from "crypto-js";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'import sjcl from "sjcl";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'import forge from "node-forge";',
        errors: [{ messageId: 'preferNative' }],
      },
    ],
  });
});
