/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed, written against the rule as
 * it stands. Cases marked BUG were wrong verdicts the survivors led to.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noStaticIv } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const error = { messageId: 'staticIv' as const };

ruleTester.run('mutation-guided edges', noStaticIv, {
  valid: [
    {
      name: 'an empty string IV supplies no IV at all',
      code: 'crypto.createCipheriv("aes-128-ecb", key, "");',
    },
    {
      name: 'an IV read from an options property is no evidence',
      code: 'crypto.createCipheriv("aes-256-gcm", key, opts.iv);',
    },
    {
      name: 'an IV parameter is no evidence',
      code: 'function encrypt(key, iv) {\n  return crypto.createCipheriv("aes-256-cbc", key, iv);\n}',
    },
    {
      name: 'an arrow function IV parameter is no evidence',
      code: 'const encrypt = (key, iv) => crypto.createCipheriv("aes-256-cbc", key, iv);',
    },
    {
      name: 'an imported IV is no evidence',
      code: 'import { iv } from "./config";\ncrypto.createCipheriv("aes-256-cbc", key, iv);',
    },
    {
      name: 'an alloc method on an object that is not Buffer is not a zero IV',
      code: 'crypto.createCipheriv("aes-256-cbc", key, pool.alloc(16));',
    },
    {
      name: 'an uninitialised Buffer.allocUnsafe is not a hardcoded IV',
      code: 'crypto.createCipheriv("aes-256-cbc", key, Buffer.allocUnsafe(16));',
    },
  ],
  invalid: [
    {
      name: 'BUG: a short string IV is still a fixed IV (GCM takes any length)',
      code: 'crypto.createCipheriv("aes-256-gcm", key, "@#!");',
      errors: [error],
    },
    {
      name: 'BUG: a byte array spelled with string digits is still fixed bytes',
      code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from(["1", "2", "3", "4", "5", "6", "7", "8", "9", "1", "2", "3"]));',
      errors: [error],
    },
    {
      name: 'a let declared without a value and later assigned a zero buffer is a static IV',
      code: 'let iv;\niv = Buffer.alloc(16);\ncrypto.createCipheriv("aes-256-cbc", key, iv);',
      errors: [error],
    },
    {
      name: 'a test file is not exempt unless allowInTests is set',
      code: 'crypto.createCipheriv("aes-256-cbc", key, Buffer.alloc(16));',
      filename: 'src/crypto.test.ts',
      errors: [error],
    },
  ],
});
