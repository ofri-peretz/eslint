/**
 * Tests for no-cryptojs rule
 * CWE-1104: Use of Unmaintained Third Party Components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCryptojs } from './index';

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

describe('no-cryptojs', () => {
  ruleTester.run('no-cryptojs', noCryptojs, {
    valid: [
      // Valid: Native crypto
      { code: 'import crypto from "node:crypto";' },
      { code: 'const crypto = require("crypto");' },
      // Valid: Other packages
      { code: 'import hash from "crypto-hash";' },
    ],
    invalid: [
      // Invalid: crypto-js import
      {
        code: 'import CryptoJS from "crypto-js";',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Invalid: crypto-js submodule import
      {
        code: 'import { AES } from "crypto-js/aes";',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Invalid: crypto-js require
      {
        code: 'const CryptoJS = require("crypto-js");',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Invalid: crypto-js submodule require
      {
        code: 'const MD5 = require("crypto-js/md5");',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
    ],
  });
});
