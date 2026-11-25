/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The finding is about the ROUTE, so it sits on the route decorator (`@Post`,
 * `@Get`, ...), not on whichever decorator happens to come first. Found linting
 * popular NestJS starters: three OAuth handlers were reported at
 * `@SerializeOptions`, `@ApiOkResponse` and `@Public`.
 *
 * Every case pins line and column, so moving the report back to the method
 * fails them.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireThrottler } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const header = `import { Controller, Post, Get, HttpCode } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
`;

describe('require-throttler — report location', () => {
  ruleTester.run('report-location', requireThrottler, {
    valid: [
      {
        name: 'a decorated login handler that declares @Throttle is still silent',
        code: `${header}import { Throttle } from '@nestjs/throttler';
@Controller('auth')
export class AuthController {
  @ApiOkResponse()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login')
  login() {}
}`,
      },
    ],
    invalid: [
      {
        // @source brocoders/nestjs-boilerplate auth controllers
        // @found linting popular Express and NestJS starters
        name: 'FP location: a doc decorator above @Post is not where the finding belongs',
        code: `${header}
@Controller('auth')
export class AuthController {
  @ApiOkResponse()
  @HttpCode(200)
  @Post('login')
  login() {}
}`,
        errors: [
          {
            messageId: 'missingThrottler',
            line: 8,
            column: 3,
            endLine: 8,
            endColumn: 17,
          },
        ],
      },
      {
        name: 'the route decorator is first: the report is on it',
        code: `${header}
@Controller('auth')
export class AuthController {
  @Post('register')
  register() {}
}`,
        errors: [
          { messageId: 'missingThrottler', line: 6, column: 3, endLine: 6 },
        ],
      },
      {
        name: 'a decorator after the route decorator does not move the report',
        code: `${header}
@Controller('auth')
export class AuthController {
  @Post('password-reset')
  @ApiOkResponse()
  reset() {}
}`,
        errors: [
          { messageId: 'missingThrottler', line: 6, column: 3, endLine: 6 },
        ],
      },
    ],
  });
});
