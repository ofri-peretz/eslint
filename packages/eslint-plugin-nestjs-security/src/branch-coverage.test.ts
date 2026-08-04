/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Branch-coverage tests: RuleTester fixtures through the real parser.
 *
 * Exotic-but-parseable decorator shapes — bare identifier decorators,
 * member-expression decorators, computed keys, destructured params — that
 * exercise every fallback in the decorator-name extraction helpers.
 *
 * These all go through @typescript-eslint's parser on purpose. An earlier
 * second layer drove the listeners with hand-built AST objects instead; once
 * the helpers started walking `parent` pointers those nodes were unparented,
 * so the tests passed without asserting anything. Coverage that a synthetic
 * node would have reached is now reached by real parsed code or not at all.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { requireGuards } from './rules/require-guards';
import { noMissingValidationPipe } from './rules/no-missing-validation-pipe';
import { requireThrottler } from './rules/require-throttler';
import { noExposedPrivateFields } from './rules/no-exposed-private-fields';

const ruleTester = new RuleTester();

// ===========================================================================
// require-guards
// ===========================================================================
ruleTester.run('require-guards (branch edges)', requireGuards, {
  valid: [
    // Bare @Public identifier decorator on the method (Identifier arm)
    {
      code: `
        @Controller('u')
        class PublicBare {
          @Get()
          @Public
          findAll() {}
        }
      `,
    },
    // Undecorated members (constructor, plain methods) are not routes
    {
      code: `
        @Controller('u')
        @UseGuards(AuthGuard)
        class SkipsInternals {
          constructor() {}
          helper() {}
        }
      `,
    },
    // Member-expression *call* class decorator: CallExpression with a
    // non-Identifier callee → '' fallback → not a controller
    {
      code: `
        @ns.module()
        class NotAController {
          @Get()
          findAll() {}
        }
      `,
    },
  ],
  invalid: [
    // Member-expression decorator on the class: hits the '' fallback in
    // hasControllerDecorator / return-false tail of hasUseGuardsDecorator
    {
      code: `
        @Controller('u')
        @ns.guard
        class MemberDecorated {
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
    },
    // Member-expression *call* decorator alongside @Get: '' fallback in
    // hasHttpMethodDecorator + hasPublicDecorator, callee-not-Identifier in
    // hasUseGuardsDecorator
    {
      code: `
        @Controller('u')
        class MemberCallDecorated {
          @foo.bar()
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
    },
    // Bare @Get identifier decorator (Identifier arm of hasHttpMethodDecorator)
    {
      code: `
        @Controller('u')
        class BareGet {
          @Get
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
    },
    // Bare @Controller identifier decorator (Identifier arm of hasControllerDecorator)
    {
      code: `
        @Controller
        class BareController {
          @Get()
          findAll() {}
        }
      `,
      errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
    },
    // allowPublicDecorator: false — @Public() no longer exempts the handler
    {
      code: `
        @Controller('u')
        class PublicIgnored {
          @Get()
          @Public()
          findAll() {}
        }
      `,
      options: [{ allowPublicDecorator: false }],
      errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
    },
    // Computed method key reports as <anonymous>
    {
      code: `
        @Controller('u')
        class ComputedKey {
          @Get()
          ['dynamic']() {}
        }
      `,
      errors: [{ messageId: 'missingGuards', data: { name: '<anonymous>' } }],
    },
  ],
});

// ===========================================================================
// no-missing-validation-pipe
// ===========================================================================
ruleTester.run(
  'no-missing-validation-pipe (branch edges)',
  noMissingValidationPipe,
  {
    valid: [
      {
        code: `
        @Controller('u')
        class NamespacedPipe {
          @Post()
          @UsePipes(new ns.ValidationPipe())
          create(@Body() dto: CreateDto) {}
        }
      `,
      },
      // Member-expression class decorator: '' fallback → not a controller
      {
        code: `
        @ns.module()
        class NotAController {
          @Post()
          create(@Body() dto: CreateDto) {}
        }
      `,
      },
      // Non-route method in a controller (isRouteHandler false-return)
      {
        code: `
        @Controller('u')
        class PlainMethods {
          helper() {}
        }
      `,
      },
      // Destructured param (param.type !== Identifier → continue)
      {
        code: `
        @Controller('u')
        class Destructured {
          @Post()
          create({ name }) {}
        }
      `,
      },
      // Param without any decorator (getInputDecorator over empty list → null)
      {
        code: `
        @Controller('u')
        class NoParamDecorator {
          @Post()
          create(plain: CreateDto) {}
        }
      `,
      },
      // Param with a non-input decorator (loop completes → return null)
      {
        code: `
        @Controller('u')
        class HeadersOnly {
          @Post()
          create(@Headers() h: HeaderMap) {}
        }
      `,
      },
      // Member-expression param decorator: '' fallback → not an input decorator
    ],
    invalid: [
      {
        code: `
        @Controller('u')
        class MemberParamDecorator {
          @Post()
          create(@ns.Body() dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      // Bare @Controller identifier decorator (Identifier arm)
      {
        code: `
        @Controller
        class BareController {
          @Post()
          create(@Body() dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      // Bare marker decorator on the class: hasValidationPipe non-CallExpression arm
      {
        code: `
        @Controller('u')
        @Marker
        class MarkerDecorated {
          @Post()
          create(@Body() dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      // @UsePipes with a non-ValidationPipe identifier arg (arguments.some → false tail)
      {
        code: `
        @Controller('u')
        class OtherPipe {
          @Post()
          @UsePipes(SomeOtherPipe)
          create(@Body() dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      // @UsePipes(new ns.ValidationPipe()) — NewExpression with non-Identifier callee
      // Bare @Post identifier decorator (Identifier arm of isRouteHandler)
      {
        code: `
        @Controller('u')
        class BarePost {
          @Post
          create(@Body() dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      // Member-expression method decorator before @Post ('' fallback in isRouteHandler)
      {
        code: `
        @Controller('u')
        class MemberMethodDecorator {
          @ns.log()
          @Post()
          create(@Body() dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
      // Bare @Body identifier param decorator (Identifier arm of getInputDecorator)
      {
        code: `
        @Controller('u')
        class BareBody {
          @Post
          create(@Body dto: CreateDto) {}
        }
      `,
        options: [{ requireExplicitPipe: true }],
        errors: [{ messageId: 'missingValidation' }],
      },
    ],
  },
);

// ===========================================================================
// require-throttler
// ===========================================================================
ruleTester.run('require-throttler (branch edges)', requireThrottler, {
  valid: [
    // Bare @SkipThrottle identifier decorator (Identifier arm of hasThrottleDecorator)
    {
      code: `
        @Controller('u')
        class BareSkip {
          @Get()
          @SkipThrottle
          findAll() {}
        }
      `,
    },
    // Member-expression class decorator: '' fallback → not a controller
    {
      code: `
        @ns.module()
        class NotAController {
          @Get()
          findAll() {}
        }
      `,
    },
  ],
  invalid: [
    // Bare @Controller identifier decorator (Identifier arm)
    {
      code: `
        @Controller
        class BareController {
          @Get()
          findAll() {}
        }
      `,
      options: [{ onlySensitiveRoutes: false }],
      errors: [{ messageId: 'missingThrottler', data: { name: 'findAll' } }],
    },
    // Bare @Get identifier decorator (Identifier arm of isRouteHandler)
    {
      code: `
        @Controller('u')
        class BareGet {
          @Get
          findAll() {}
        }
      `,
      options: [{ onlySensitiveRoutes: false }],
      errors: [{ messageId: 'missingThrottler', data: { name: 'findAll' } }],
    },
    // Member-expression method decorator: '' fallback in isRouteHandler +
    // hasThrottleDecorator, callee-not-Identifier in hasThrottlerGuardDecorator
    {
      code: `
        @Controller('u')
        class MemberMethodDecorator {
          @ns.log()
          @Get()
          findAll() {}
        }
      `,
      options: [{ onlySensitiveRoutes: false }],
      errors: [{ messageId: 'missingThrottler', data: { name: 'findAll' } }],
    },
    // Computed method key reports as <anonymous>
    {
      code: `
        @Controller('u')
        class ComputedKey {
          @Get()
          ['dynamic']() {}
        }
      `,
      options: [{ onlySensitiveRoutes: false }],
      errors: [
        { messageId: 'missingThrottler', data: { name: '<anonymous>' } },
      ],
    },
  ],
});

// ===========================================================================
// require-class-validator
// ===========================================================================

// ===========================================================================
// no-exposed-private-fields
// ===========================================================================
ruleTester.run(
  'no-exposed-private-fields (branch edges)',
  noExposedPrivateFields,
  {
    valid: [
      {
        code: `
        class UserEntity {
          @transformer.Exclude()
          password: string;
        }
      `,
      },
      // Test file with allowInTests (default) — rule disengages entirely
      {
        code: `class UserEntity { password = 'x'; }`,
        filename: 'user.spec.ts',
      },
      // Member-expression class decorator + non-entity name → not tracked
      // Bare @Exclude identifier decorator hides the field (Identifier arm)
      {
        code: `
        class UserEntity {
          @Exclude
          password: string;
        }
      `,
      },
      // Computed property key in an entity is skipped (propName null)
      {
        code: `
        class TokenEntity {
          ['computed'] = 1;
        }
      `,
      },
    ],
    invalid: [
      {
        code: `
        @orm.Entity()
        class Account2 {
          password = 'x';
        }
      `,
        errors: [{ messageId: 'exposedField' }],
      },
      // Bare @Entity identifier decorator marks the class (Identifier arm)
      {
        code: `
        @Entity
        class Account {
          password = 'x';
        }
      `,
        errors: [{ messageId: 'exposedField', data: { field: 'password' } }],
      },
      // Member-expression decorator on the field is not @Exclude ('' fallback)
    ],
  },
);

// ===========================================================================
// no-exposed-debug-endpoints
// ===========================================================================
