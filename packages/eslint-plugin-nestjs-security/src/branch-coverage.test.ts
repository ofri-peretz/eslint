/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer branch-coverage tests.
 *
 * Layer 1 — RuleTester fixtures through the real parser: exotic-but-parseable
 * decorator shapes (bare identifier decorators, member-expression decorators,
 * computed keys, destructured params) that exercise every ternary fallback in
 * the decorator-name extraction helpers.
 *
 * Layer 2 — createWithMockContext (from @interlace/eslint-devkit): drives the
 * listeners with synthetic AST objects (`decorators: undefined`, empty-body
 * function values) that @typescript-eslint's parser can never emit, covering
 * the defensive `!decorators` guards.
 */

import { describe, it, expect } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { createWithMockContext } from '@interlace/eslint-devkit';

import { requireGuards } from './rules/require-guards';
import { noMissingValidationPipe } from './rules/no-missing-validation-pipe';
import { requireThrottler } from './rules/require-throttler';
import { requireClassValidator } from './rules/require-class-validator';
import { noExposedPrivateFields } from './rules/no-exposed-private-fields';
import { noExposedDebugEndpoints } from './rules/no-exposed-debug-endpoints';

const ruleTester = new RuleTester();

// ---------------------------------------------------------------------------
// Synthetic decorator nodes shared by the Layer-2 tests
// ---------------------------------------------------------------------------
const controllerDec = {
  expression: {
    type: 'CallExpression',
    callee: { type: 'Identifier', name: 'Controller' },
    arguments: [],
  },
};
const getDec = {
  expression: {
    type: 'CallExpression',
    callee: { type: 'Identifier', name: 'Get' },
    arguments: [],
  },
};

type Listener = (node: unknown) => void;
const listener = (listeners: Record<string, unknown>, name: string): Listener =>
  listeners[name] as Listener;

// ===========================================================================
// require-guards
// ===========================================================================
ruleTester.run('require-guards (branch edges)', requireGuards, {
  valid: [
    // Bare @UseGuards identifier decorator on the class (Identifier arm)
    {
      code: `
        @Controller('u')
        @UseGuards
        class GuardedBare {
          @Get()
          findAll() {}
        }
      `,
    },
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
    // Constructor and underscore-prefixed methods are skipped
    {
      code: `
        @Controller('u')
        class SkipsInternals {
          constructor() {}
          @Get()
          _internal() {}
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

describe('require-guards — Layer 2 synthetic AST', () => {
  it('treats a ClassDeclaration with undefined decorators as a non-controller (no report)', () => {
    const { listeners, reports } = createWithMockContext(requireGuards);
    listener(listeners, 'ClassDeclaration')({ decorators: undefined, id: null });
    listener(listeners, 'MethodDefinition')({
      key: { type: 'Identifier', name: 'findAll' },
      decorators: [getDec],
    });
    expect(reports).toEqual([]);
  });

  it('treats a MethodDefinition with undefined decorators as a non-route (no report)', () => {
    const { listeners, reports } = createWithMockContext(requireGuards);
    listener(listeners, 'ClassDeclaration')({ decorators: [controllerDec], id: null });
    listener(listeners, 'MethodDefinition')({
      key: { type: 'Identifier', name: 'findAll' },
      decorators: undefined,
    });
    expect(reports).toEqual([]);
  });
});

// ===========================================================================
// no-missing-validation-pipe
// ===========================================================================
ruleTester.run('no-missing-validation-pipe (branch edges)', noMissingValidationPipe, {
  valid: [
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
    {
      code: `
        @Controller('u')
        class MemberParamDecorator {
          @Post()
          create(@ns.Body() dto: CreateDto) {}
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
          @Post()
          create(@Body() dto: CreateDto) {}
        }
      `,
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
      errors: [{ messageId: 'missingValidation' }],
    },
    // @UsePipes(new ns.ValidationPipe()) — NewExpression with non-Identifier callee
    {
      code: `
        @Controller('u')
        class NamespacedPipe {
          @Post()
          @UsePipes(new ns.ValidationPipe())
          create(@Body() dto: CreateDto) {}
        }
      `,
      errors: [{ messageId: 'missingValidation' }],
    },
    // Bare @Post identifier decorator (Identifier arm of isRouteHandler)
    {
      code: `
        @Controller('u')
        class BarePost {
          @Post
          create(@Body() dto: CreateDto) {}
        }
      `,
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
      errors: [{ messageId: 'missingValidation' }],
    },
  ],
});

describe('no-missing-validation-pipe — Layer 2 synthetic AST', () => {
  it('handles undefined decorators on class and method without reporting', () => {
    const { listeners, reports } = createWithMockContext(noMissingValidationPipe);
    listener(listeners, 'ClassDeclaration')({ decorators: undefined, id: null });
    listener(listeners, 'ClassDeclaration')({ decorators: [controllerDec], id: null });
    listener(listeners, 'MethodDefinition')({
      key: { type: 'Identifier', name: 'create' },
      decorators: undefined,
    });
    expect(reports).toEqual([]);
  });

  it('skips non-FunctionExpression method values (e.g. TSEmptyBodyFunctionExpression)', () => {
    const { listeners, reports } = createWithMockContext(noMissingValidationPipe);
    listener(listeners, 'ClassDeclaration')({ decorators: [controllerDec], id: null });
    listener(listeners, 'MethodDefinition')({
      key: { type: 'Identifier', name: 'create' },
      decorators: [getDec],
      value: { type: 'TSEmptyBodyFunctionExpression', params: [] },
    });
    expect(reports).toEqual([]);
  });

  it('skips params whose decorators are undefined', () => {
    const { listeners, reports } = createWithMockContext(noMissingValidationPipe);
    listener(listeners, 'ClassDeclaration')({ decorators: [controllerDec], id: null });
    listener(listeners, 'MethodDefinition')({
      key: { type: 'Identifier', name: 'create' },
      decorators: [getDec],
      value: {
        type: 'FunctionExpression',
        params: [{ type: 'Identifier', name: 'dto', decorators: undefined }],
      },
    });
    expect(reports).toEqual([]);
  });
});

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
      errors: [{ messageId: 'missingThrottler', data: { name: '<anonymous>' } }],
    },
  ],
});

describe('require-throttler — Layer 2 synthetic AST', () => {
  it('treats undefined decorators as absent on class and method (no report)', () => {
    const { listeners, reports } = createWithMockContext(requireThrottler);
    listener(listeners, 'ClassDeclaration')({ decorators: undefined, id: null });
    listener(listeners, 'ClassDeclaration')({ decorators: [controllerDec], id: null });
    listener(listeners, 'MethodDefinition')({
      key: { type: 'Identifier', name: 'findAll' },
      decorators: undefined,
    });
    expect(reports).toEqual([]);
  });

  it('skips a constructor that carries an HTTP decorator (parser-impossible AST)', () => {
    const { listeners, reports } = createWithMockContext(requireThrottler);
    listener(listeners, 'ClassDeclaration')({ decorators: [controllerDec], id: null });
    listener(listeners, 'MethodDefinition')({
      key: { type: 'Identifier', name: 'constructor' },
      decorators: [getDec],
    });
    expect(reports).toEqual([]);
  });
});

// ===========================================================================
// require-class-validator
// ===========================================================================
ruleTester.run('require-class-validator (branch edges)', requireClassValidator, {
  valid: [
    // Test file with allowInTests (default) — rule disengages entirely
    {
      code: `class UserDto { unvalidated: string; }`,
      filename: 'user.spec.ts',
    },
    // Member-expression class decorator: '' fallback → not a DTO
    {
      code: `
        @ns.decorate()
        class Plain {
          field = 1;
        }
      `,
    },
    // Bare validator identifier decorator on a DTO property (Identifier arm)
    {
      code: `
        class NameDto {
          @IsString
          name: string;
        }
      `,
    },
    // Computed property key in a DTO is skipped (propName null)
    {
      code: `
        class ComputedDto {
          ['dynamic'] = 1;
        }
      `,
    },
  ],
  invalid: [
    // Bare class-level decorator marks the class as a DTO (Identifier arm of isDtoClass)
    {
      code: `
        @Validated
        class Person {
          name: string;
        }
      `,
      errors: [{ messageId: 'missingValidator', data: { property: 'name' } }],
    },
    // Member-expression property decorator is not a validator ('' fallback)
    {
      code: `
        class FieldDto {
          @ns.transform()
          field: string;
        }
      `,
      errors: [{ messageId: 'missingValidator', data: { property: 'field' } }],
    },
  ],
});

describe('require-class-validator — Layer 2 synthetic AST', () => {
  it('returns false for a class with no id and undefined decorators (no report)', () => {
    const { listeners, reports } = createWithMockContext(requireClassValidator);
    listener(listeners, 'ClassDeclaration')({ id: null, decorators: undefined });
    listener(listeners, 'PropertyDefinition')({
      key: { type: 'Identifier', name: 'name' },
      decorators: [],
    });
    expect(reports).toEqual([]);
  });

  it('reports a DTO property whose decorators are undefined', () => {
    const { listeners, reports } = createWithMockContext(requireClassValidator);
    listener(listeners, 'ClassDeclaration')({
      id: { type: 'Identifier', name: 'SyntheticDto' },
      decorators: [],
    });
    listener(listeners, 'PropertyDefinition')({
      key: { type: 'Identifier', name: 'field' },
      decorators: undefined,
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingValidator',
      data: { property: 'field' },
    });
  });
});

// ===========================================================================
// no-exposed-private-fields
// ===========================================================================
ruleTester.run('no-exposed-private-fields (branch edges)', noExposedPrivateFields, {
  valid: [
    // Test file with allowInTests (default) — rule disengages entirely
    {
      code: `class UserEntity { password = 'x'; }`,
      filename: 'user.spec.ts',
    },
    // Member-expression class decorator + non-entity name → not tracked
    {
      code: `
        @orm.Entity()
        class Account2 {
          password = 'x';
        }
      `,
    },
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
    {
      code: `
        class UserEntity {
          @transformer.Exclude()
          password: string;
        }
      `,
      errors: [{ messageId: 'exposedField', data: { field: 'password' } }],
    },
  ],
});

describe('no-exposed-private-fields — Layer 2 synthetic AST', () => {
  it('handles a class with no id and undefined decorators (not an entity, no report)', () => {
    const { listeners, reports } = createWithMockContext(noExposedPrivateFields);
    listener(listeners, 'ClassDeclaration')({ id: null, decorators: undefined });
    listener(listeners, 'PropertyDefinition')({
      key: { type: 'Identifier', name: 'password' },
      decorators: [],
    });
    expect(reports).toEqual([]);
  });

  it('reports a sensitive entity field whose decorators are undefined', () => {
    const { listeners, reports } = createWithMockContext(noExposedPrivateFields);
    listener(listeners, 'ClassDeclaration')({
      id: { type: 'Identifier', name: 'UserEntity' },
      decorators: [],
    });
    listener(listeners, 'PropertyDefinition')({
      key: { type: 'Identifier', name: 'password' },
      decorators: undefined,
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'exposedField',
      data: { field: 'password' },
    });
  });
});

// ===========================================================================
// no-exposed-debug-endpoints
// ===========================================================================
ruleTester.run('no-exposed-debug-endpoints (branch edges)', noExposedDebugEndpoints, {
  valid: [
    // ignoreFiles pattern matches the filename — rule disengages entirely
    {
      code: `
        @Controller('app')
        class DebugController {
          @Get('debug')
          debug() {}
        }
      `,
      options: [{ ignoreFiles: ['skip-me'] }],
      filename: 'src/skip-me.controller.ts',
    },
    // Bare identifier decorator (expression is not a CallExpression)
    {
      code: `
        @Frozen
        class BareDecorated {}
      `,
    },
    // HTTP decorator with a non-string literal arg
    {
      code: `
        class NumericPath {
          @Get(123)
          byNumber() {}
        }
      `,
    },
    // HTTP decorator with a non-literal arg
    {
      code: `
        class DynamicPath {
          @Get(routePath)
          byVariable() {}
        }
      `,
    },
    // Non-HTTP call decorator with a safe path
    {
      code: `
        @Custom('safe')
        class CustomDecorated {}
      `,
    },
  ],
  invalid: [
    // Member-expression callee decorator: Decorator handler skips it, but the
    // Literal handler still flags the exact debug path
    {
      code: `
        @foo.bar('debug')
        class MemberCallee {}
      `,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Custom endpoint configured with a leading slash (dp.startsWith('/') arm)
    {
      code: `const p = 'custom-debug';`,
      options: [{ endpoints: ['/custom-debug'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
