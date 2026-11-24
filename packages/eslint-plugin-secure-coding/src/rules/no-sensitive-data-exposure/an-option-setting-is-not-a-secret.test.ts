/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A credential-named option quoted with its boolean setting is configuration advice.
 *
 * nestjs/authentication lib/jwt/jws.util.ts:209 throws, for a short HMAC secret:
 *
 *   … set `allowShortSecret: true` next to the key; a short secret can be guessed …
 *
 * The rule read `allowShortSecret: true` as "label, separator, value" and reported a
 * secret in an error message. `true`, `false`, `null` and `undefined` are settings,
 * never credentials. Any other written-out value after the same label still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const exposure = [{ messageId: 'sensitiveDataExposure' as const }];

describe('no-sensitive-data-exposure — an option setting is not a secret', () => {
  ruleTester.run('option-setting', noSensitiveDataExposure, {
    valid: [
      {
        // @source nestjs/authentication lib/jwt/jws.util.ts:209
        // @found real-source scan
        name: 'FP: the opt-in for a short secret, quoted with its boolean setting',
        code: `
          throw new TypeError(
            \`\${owner}: the key is not a valid \${alg} key; \${alg} needs \${REQUIREMENTS[alg]}.\` +
              (short
                ? \` To keep an existing shorter secret (\${key.symmetricKeySize} bytes), set \\\`allowShortSecret: true\\\` \` +
                  'next to the key; a short secret can be guessed offline from any token.'
                : ''),
          );
        `,
      },
      {
        name: 'password: false',
        code: "throw new Error('set requirePassword: false')",
      },
      {
        name: "token: 'null'",
        code: 'throw new Error("pass token: \'null\'")',
      },
    ],
    invalid: [
      {
        name: 'a written-out secret after the same label still reports',
        code: "throw new Error('set allowShortSecret: hunter2')",
        errors: exposure,
      },
      {
        name: 'a keyword that belongs to a later label does not hide the password',
        code: "console.log('password: hunter2 debug: true')",
        errors: exposure,
      },
      {
        name: 'an uppercase NULL is a value, not the null keyword',
        code: "throw new Error('password: NULL')",
        errors: exposure,
      },
      {
        name: 'a value that only starts with a keyword still reports',
        code: "throw new Error('password: true123')",
        errors: exposure,
      },
    ],
  });
});
