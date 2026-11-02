/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed. Cases named `BUG:` were
 * wrong verdicts the survivors led to.
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

const error = { messageId: 'weakRandom' as const };

ruleTester.run('mutation-guided edges', noCryptojsWeakRandom, {
  valid: [
    {
      name: 'restoring a stub of the global WordArray.random draws nothing',
      code: '/* global CryptoJS */\nCryptoJS.lib.WordArray.random.restore();',
    },
    {
      name: 'another method of the global WordArray is not random',
      code: '/* global CryptoJS */\nconst words = CryptoJS.lib.WordArray.create([0x12345678], 4);',
    },
    {
      name: 'a runtime key in the imported chain is no evidence of lib',
      code: "import CryptoJS from 'crypto-js';\nconst salt = CryptoJS[ns].WordArray.random(16);",
    },
  ],
  invalid: [
    {
      name: 'BUG: crypto-js/lib-typedarrays exports WordArray itself',
      code: "const WordArray = require('crypto-js/lib-typedarrays');\nconst salt = WordArray.random(16);",
      errors: [error],
    },
    {
      name: 'BUG: a default import of crypto-js/lib-typedarrays is WordArray',
      code: "import WordArray from 'crypto-js/lib-typedarrays';\nconst salt = WordArray.random(16);",
      errors: [error],
    },
    {
      name: 'a test file is reported when allowInTests is off (the default)',
      code: "import CryptoJS from 'crypto-js';\nconst salt = CryptoJS.lib.WordArray.random(16);",
      filename: 'src/session.test.ts',
      errors: [error],
    },
  ],
});
