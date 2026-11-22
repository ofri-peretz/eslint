/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `privateKey.type` names the KIND of key, not its material.
 *
 * Found by our own scan of honojs/hono at 75ff8e3: the recommended configs
 * reported one line in 190 source files, and it was this one.
 *
 *   src/utils/jwt/jws.ts:110
 *     if (privateKey.type !== 'private') {
 *       throw new Error(`unexpected key type: ${privateKey.type}`)
 *     }
 *
 * `CryptoKey.type` is `'public'`, `'private'` or `'secret'`, and the message
 * prints that word. The rule read the receiver's name (`privateKey`) and
 * ignored what was taken from it, the same mistake already fixed for `.length`
 * and `.status`. `type`, `algorithm`, `extractable` and `usages` are
 * the attributes the Web Crypto API defines on every CryptoKey; none of them
 * can carry the key. Reaching into the key for anything else still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const exposure = [{ messageId: 'sensitiveDataExposure' as const }];

ruleTester.run('a key type is not the key', noSensitiveDataExposure, {
  valid: [
    {
      name: 'honojs/hono jws.ts:110, the exact line',
      code: `
        async function exportPublicJwkFrom(privateKey: CryptoKey) {
          if (privateKey.type !== 'private') {
            throw new Error(\`unexpected key type: \${privateKey.type}\`)
          }
        }
      `,
    },
    {
      name: 'the key algorithm',
      code: `throw new Error(\`unsupported: \${privateKey.algorithm.name}\`);`,
    },
    {
      name: 'whether the key is extractable',
      code: `throw new Error(\`extractable: \${secretKey.extractable}\`);`,
    },
    {
      name: 'a logged key type',
      code: `console.log('key type', privateKey.type);`,
    },
  ],
  invalid: [
    {
      name: 'the key itself in the same message still reports',
      code: `throw new Error(\`bad key \${privateKey}\`);`,
      errors: exposure,
    },
    {
      name: 'the key material under a property still reports',
      code: `throw new Error(\`bad key \${privateKey.pem}\`);`,
      errors: exposure,
    },
    {
      name: 'a secret read from a differently named property still reports',
      code: `console.log('key', privateKey.value);`,
      errors: exposure,
    },
  ],
});
