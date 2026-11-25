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
      {
        name: 'a property of an imported constant is not the request either',
        code: `
          import { TOKENS } from './tokens';
          class Injector {
            isRequestScoped(dependency) {
              return dependency.token === TOKENS.request?.['scoped'];
            }
          }
        `,
      },
      {
        name: 'an imported binding named like the request is not the request',
        code: `
          import { req } from './constants';
          function isScoped(dependency) {
            return dependency.token !== req;
          }
        `,
      },
      {
        name: 'a dotted property of an imported binding is not the request',
        code: `
          import { request } from './constants';
          function isScoped(dependency) {
            return dependency.token !== request.scoped;
          }
        `,
      },
      {
        name: 'a fixed computed property of an imported binding is not the request',
        code: `
          import { req } from './constants';
          function isScoped(dependency) {
            return dependency.token !== req['scoped'];
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a property of an imported binding read with a dynamic key still reports',
        code: `
          import { req } from './constants';
          function isScoped(dependency, key) {
            return dependency.token !== req[key];
          }
        `,
        errors: unsafe,
      },
      {
        name: 'a global named like the request is not an import',
        code: `
          function isScoped(dependency) {
            return dependency.token !== req;
          }
        `,
        errors: unsafe,
      },
      {
        name: 'an imported callee does not clean the request data it is given',
        code: `
          import { Buffer } from 'node:buffer';
          function check(req, stored) {
            return Buffer.from(req.headers.token).toString() === stored.secretToken;
          }
        `,
        errors: unsafe,
      },
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
