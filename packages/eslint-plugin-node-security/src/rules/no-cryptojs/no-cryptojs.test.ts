/**
 * Tests for no-cryptojs rule
 * CWE-1104: Use of Unmaintained Third Party Components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
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
        'const x = 42;',
        'const flag = true;',
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

  /**
   * Lock: this rule takes no options.
   *
   * It used to declare `severity: 'error' | 'warn'`, defaulted to `'warn'`, and
   * document it as "Severity level for reports". Nothing read it, and no rule
   * can read it — ESLint decides severity from the config entry. Anyone who set
   * it got warn-level reports and silence about the mistake. Re-adding an
   * option that `create()` does not consume should fail here.
   */
  it('declares an empty schema — no inert `severity` option', () => {
    expect(noCryptojs.meta.schema).toEqual([]);
  });
});
