/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found running the rule on NestJS's own code: `nestjs/nest`
 * `packages/core/injector/injector.ts:2044` compares a provider's DI token with
 * the imported `REQUEST` token. The import's name made it read as the request
 * object. An imported binding is a module's export, never the request being
 * served; a local that holds the request under the same name still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const unsafe = [{ messageId: 'timingUnsafeCompare' as const }];

ruleTester.run(
  'an imported binding is not the request',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        // @source nestjs/nest packages/core/injector/injector.ts:2044
        // @found real-source scan
        name: 'FP: a DI token against the imported REQUEST token',
        code: `
          import { REQUEST } from '../router/request/request-constants';
          class Injector {
            shouldInjectDurablePayload(dependency, contextId) {
              if (dependency?.token !== REQUEST) return false;
              return true;
            }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a local named REQUEST is still read by its name',
        code: `
          function check(req, stored) {
            const REQUEST = req;
            return REQUEST.headers.token === stored.secretToken;
          }
        `,
        errors: unsafe,
      },
    ],
  },
);
