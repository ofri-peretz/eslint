/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit tests for the shared NestJS AST helpers.
 *
 * Every rule in the plugin routes decorator naming and class lookup through
 * this module, so a regression here is a regression in all of them. These
 * exercise the shapes that previously slipped through: namespace-imported
 * decorators, classes nested inside method bodies, and class expressions.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  decoratorName,
  expressionName,
  decoratorCall,
  findDecorator,
  hasDecorator,
  hasDecoratorMatching,
  isAuthDecoratorName,
  collectImportOrigins,
  decoratorSource,
  rootBindingName,
  moduleRole,
  isRelativeOrLocal,
  enclosingClass,
  isControllerClass,
  isRouteHandler,
  routeMethodName,
  memberName,
  superClassName,
  isTestFile,
  HTTP_METHOD_DECORATORS,
  INPUT_DECORATORS,
  type ClassNode,
} from './nest-ast';

/** Parse a snippet and collect every class and class member in it. */
function analyse(code: string) {
  const ast = parse(code, {
    ecmaVersion: 2022,
    sourceType: 'module',
    range: true,
    loc: true,
  });
  const classes: ClassNode[] = [];
  const methods: TSESTree.MethodDefinition[] = [];
  const properties: TSESTree.PropertyDefinition[] = [];

  (function walk(node: TSESTree.Node, parent: TSESTree.Node | null) {
    (node as { parent?: TSESTree.Node | null }).parent = parent;
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression')
      classes.push(node);
    if (node.type === 'MethodDefinition') methods.push(node);
    if (node.type === 'PropertyDefinition') properties.push(node);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const c of child)
          if (c && typeof c.type === 'string') walk(c, node);
      } else if (child && typeof (child as TSESTree.Node).type === 'string') {
        walk(child as TSESTree.Node, node);
      }
    }
  })(ast as unknown as TSESTree.Node, null);

  return { classes, methods, properties };
}

/** The decorators on the first class in a snippet. */
function classDecorators(code: string): TSESTree.Decorator[] {
  return analyse(code).classes[0].decorators ?? [];
}

describe('decoratorName / expressionName', () => {
  it.each([
    ['@Get class C {}', 'Get'],
    ['@Get() class C {}', 'Get'],
    ['@common.Get class C {}', 'Get'],
    ['@common.Get() class C {}', 'Get'],
    ['@a.b.Get() class C {}', 'Get'],
  ])('resolves %s to %s', (code, expected) => {
    expect(decoratorName(classDecorators(code)[0])).toBe(expected);
  });

  // TypeScript's decorator grammar forbids computed member access in decorator
  // position, so these shapes only ever reach expressionName via arguments.
  it('resolves a literal computed key in an argument', () => {
    const dec = classDecorators("@UseGuards(guards['Admin']) class C {}")[0];
    expect(decoratorCall(dec)?.arguments.map(expressionName)).toEqual([
      'Admin',
    ]);
  });

  it('returns empty string for a genuinely dynamic computed key', () => {
    const dec = classDecorators('@UseGuards(guards[key]) class C {}')[0];
    expect(decoratorCall(dec)?.arguments.map(expressionName)).toEqual(['']);
  });

  it('returns empty string for a shape it cannot name', () => {
    // A parenthesised arrow factory has no resolvable identifier.
    expect(decoratorName(classDecorators('@(() => {})() class C {}')[0])).toBe(
      '',
    );
  });

  it('unwraps new-expressions in expressionName', () => {
    const dec = classDecorators('@UseGuards(new RolesGuard()) class C {}')[0];
    const call = decoratorCall(dec);
    expect(call?.arguments.map(expressionName)).toEqual(['RolesGuard']);
  });

  it('unwraps mixin factory calls and member access in expressionName', () => {
    const dec = classDecorators(
      "@UseGuards(AuthGuard('jwt'), passport.JwtGuard) class C {}",
    )[0];
    expect(decoratorCall(dec)?.arguments.map(expressionName)).toEqual([
      'AuthGuard',
      'JwtGuard',
    ]);
  });
});

describe('decoratorCall', () => {
  it('returns the call expression when the decorator is invoked', () => {
    expect(
      decoratorCall(classDecorators('@Controller("u") class C {}')[0])?.type,
    ).toBe('CallExpression');
  });

  it('returns null for a bare decorator reference', () => {
    expect(
      decoratorCall(classDecorators('@Controller class C {}')[0]),
    ).toBeNull();
  });
});

describe('findDecorator / hasDecorator', () => {
  const decorators = classDecorators('@Controller() @UseGuards(A) class C {}');

  it('finds by exact name', () => {
    expect(
      decoratorName(
        findDecorator(decorators, 'UseGuards') as TSESTree.Decorator,
      ),
    ).toBe('UseGuards');
  });

  it('finds by name set', () => {
    expect(hasDecorator(decorators, new Set(['Post', 'Controller']))).toBe(
      true,
    );
  });

  it('reports absence', () => {
    expect(findDecorator(decorators, 'Injectable')).toBeUndefined();
    expect(hasDecorator(decorators, 'Injectable')).toBe(false);
  });

  it('treats missing decorators as absence', () => {
    expect(findDecorator(undefined, 'Controller')).toBeUndefined();
    expect(hasDecorator(undefined, 'Controller')).toBe(false);
  });
});

describe('hasDecoratorMatching', () => {
  it('matches on a predicate over the resolved name', () => {
    const decs = classDecorators('@NumberFieldOptional() class C {}');
    expect(hasDecoratorMatching(decs, (n) => /Field(Optional)?$/.test(n))).toBe(
      true,
    );
    expect(hasDecoratorMatching(decs, (n) => n === 'IsString')).toBe(false);
  });

  it('treats missing decorators as no match', () => {
    expect(hasDecoratorMatching(undefined, () => true)).toBe(false);
  });
});

describe('isAuthDecoratorName', () => {
  it.each([
    'UseGuards',
    'Auth',
    'Authenticated',
    'RequireAuthentication',
    'Authorize',
    'Roles',
    'RequireRoles',
    'Permissions',
    'CheckPolicies',
    'CheckAbilities',
    'JwtAuthGuard',
    'UserAuth',
    'Secured',
    'Protected',
    'RequiredScopes',
  ])('recognises %s as access control', (name) => {
    expect(isAuthDecoratorName(name)).toBe(true);
  });

  it.each([
    'Controller',
    'Get',
    'Post',
    'ApiTags',
    'HttpCode',
    'UsePipes',
    'UseInterceptors',
    'Body',
    'Query',
    'MaintenanceRoute',
    'Injectable',
    'Column',
    'Entity',
    'Field',
  ])('does not treat %s as access control', (name) => {
    expect(isAuthDecoratorName(name)).toBe(false);
  });
});

describe('enclosingClass', () => {
  it('resolves a method to its own class, not the last one visited', () => {
    // The nested `Helper` class used to clobber the tracked controller state,
    // which silently disabled every handler declared after it.
    const { methods, classes } = analyse(`
      @Controller('u')
      class Outer {
        @Get('one') one() { class Helper { run() {} } return Helper; }
        @Get('two') two() {}
      }
    `);
    const two = methods.find(
      (m) => memberName(m) === 'two',
    ) as TSESTree.MethodDefinition;
    const run = methods.find(
      (m) => memberName(m) === 'run',
    ) as TSESTree.MethodDefinition;

    expect(enclosingClass(two)).toBe(
      classes.find((c) => c.id?.name === 'Outer'),
    );
    expect(enclosingClass(run)).toBe(
      classes.find((c) => c.id?.name === 'Helper'),
    );
    expect(isControllerClass(enclosingClass(two))).toBe(true);
    expect(isControllerClass(enclosingClass(run))).toBe(false);
  });

  it('resolves members of a class expression', () => {
    const { methods } = analyse(
      "const C = @Controller('u') class { @Get() list() {} };",
    );
    expect(isControllerClass(enclosingClass(methods[0]))).toBe(true);
  });

  it('resolves properties to their class', () => {
    const { properties, classes } = analyse('class Dto { name: string; }');
    expect(enclosingClass(properties[0])).toBe(classes[0]);
  });

  it('returns null when the member is not inside a class body', () => {
    const { methods } = analyse('class C { m() {} }');
    const orphan = {
      ...methods[0],
      parent: null,
    } as unknown as TSESTree.MethodDefinition;
    expect(enclosingClass(orphan)).toBeNull();

    const detached = {
      ...methods[0],
      parent: { type: 'ClassBody', parent: { type: 'Program' } },
    } as unknown as TSESTree.MethodDefinition;
    expect(enclosingClass(detached)).toBeNull();
  });

  it('treats a null class as not a controller', () => {
    expect(isControllerClass(null)).toBe(false);
  });
});

describe('isRouteHandler / routeMethodName', () => {
  it('recognises namespace-imported HTTP decorators', () => {
    const { methods } = analyse('class C { @common.Get() list() {} }');
    expect(isRouteHandler(methods[0])).toBe(true);
    expect(routeMethodName(methods[0])).toBe('Get');
  });

  it('returns null for an undecorated method', () => {
    const { methods } = analyse('class C { helper() {} }');
    expect(isRouteHandler(methods[0])).toBe(false);
    expect(routeMethodName(methods[0])).toBeNull();
  });

  it('covers every documented HTTP verb', () => {
    for (const verb of HTTP_METHOD_DECORATORS) {
      const { methods } = analyse(`class C { @${verb}() handler() {} }`);
      expect(routeMethodName(methods[0])).toBe(verb);
    }
  });

  it('exposes the input-binding decorators', () => {
    expect([...INPUT_DECORATORS].sort()).toEqual(['Body', 'Param', 'Query']);
  });
});

describe('memberName', () => {
  it('reads identifier keys', () => {
    const { methods } = analyse('class C { findAll() {} }');
    expect(memberName(methods[0])).toBe('findAll');
  });

  it('reads string-literal keys', () => {
    const { methods } = analyse("class C { 'find-all'() {} }");
    expect(memberName(methods[0])).toBe('find-all');
  });

  it('returns null for computed keys', () => {
    const { methods } = analyse('class C { [key]() {} }');
    expect(memberName(methods[0])).toBeNull();
  });

  it('returns null for non-string literal keys', () => {
    const { methods } = analyse('class C { 42() {} }');
    expect(memberName(methods[0])).toBeNull();
  });
});

describe('superClassName', () => {
  it('names a plain identifier superclass', () => {
    const { classes } = analyse('class C extends Base {}');
    expect(superClassName(classes[0])).toBe('Base');
  });

  it('returns null without a superclass', () => {
    expect(superClassName(analyse('class C {}').classes[0])).toBeNull();
  });

  it('returns null for a non-identifier superclass', () => {
    const { classes } = analyse('class C extends mixin(Base) {}');
    expect(superClassName(classes[0])).toBeNull();
  });

  it('returns null for a null class', () => {
    expect(superClassName(null)).toBeNull();
  });
});

describe('isTestFile', () => {
  it.each([
    ['users.controller.spec.ts', true],
    ['users.controller.test.ts', true],
    ['app.e2e-spec.ts', true],
    ['users.spec.mts', true],
    ['users.controller.ts', false],
    ['specifications.ts', false],
  ])('%s -> %s', (filename, expected) => {
    expect(isTestFile(filename)).toBe(expected);
  });
});

describe('collectImportOrigins / decoratorSource / rootBindingName', () => {
  /** Parse a whole module and return its Program plus the first class's decorators. */
  function parseModule(code: string) {
    const ast = parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      range: true,
      loc: true,
    });
    return ast as unknown as TSESTree.Program;
  }

  const SRC = `
    import { IsIn, IsString } from 'class-validator';
    import { Exclude } from 'class-transformer';
    import { Field, ObjectType } from '@nestjs/graphql';
    import * as common from '@nestjs/common';
    import Swagger, { ApiProperty } from '@nestjs/swagger';
    import { Authenticated } from 'src/middleware/auth.guard';
    import { Helper } from './helpers';
    const Local = () => {};
  `;

  it('maps named, default and namespace bindings to their module', () => {
    const origins = collectImportOrigins(parseModule(SRC));
    expect(origins.get('IsIn')).toBe('class-validator');
    expect(origins.get('IsString')).toBe('class-validator');
    expect(origins.get('Exclude')).toBe('class-transformer');
    expect(origins.get('Field')).toBe('@nestjs/graphql');
    expect(origins.get('common')).toBe('@nestjs/common');
    expect(origins.get('Swagger')).toBe('@nestjs/swagger');
    expect(origins.get('ApiProperty')).toBe('@nestjs/swagger');
    expect(origins.get('Authenticated')).toBe('src/middleware/auth.guard');
  });

  it('does not invent an origin for a locally declared binding', () => {
    const origins = collectImportOrigins(parseModule(SRC));
    expect(origins.get('Local')).toBeUndefined();
  });

  it.each([
    ['@IsIn(["a"]) class C {}', 'class-validator'],
    ['@Field() class C {}', '@nestjs/graphql'],
    ['@common.Controller("u") class C {}', '@nestjs/common'],
    [
      '@Authenticated({ permission: 1 }) class C {}',
      'src/middleware/auth.guard',
    ],
  ])('resolves the decorator in %s to %s', (decl, expected) => {
    const program = parseModule(`${SRC}\n${decl}`);
    const origins = collectImportOrigins(program);
    const cls = program.body.find(
      (n) => n.type === 'ClassDeclaration',
    ) as unknown as TSESTree.ClassDeclaration;
    expect(decoratorSource(cls.decorators![0], origins)).toBe(expected);
  });

  it('returns null for a decorator the file never imported', () => {
    const program = parseModule(`${SRC}\n@Local() class C {}`);
    const origins = collectImportOrigins(program);
    const cls = program.body.find(
      (n) => n.type === 'ClassDeclaration',
    ) as unknown as TSESTree.ClassDeclaration;
    expect(decoratorSource(cls.decorators![0], origins)).toBeNull();
  });

  it.each([
    ['Get', 'Get'],
    ['a.b.C', 'a'],
    ['factory()', 'factory'],
    ['new Guard()', 'Guard'],
    ['ns.make().Guard', 'ns'],
  ])('roots %s at %s', (expr, expected) => {
    const program = parseModule(`const x = ${expr};`);
    const decl = program.body[0] as unknown as TSESTree.VariableDeclaration;
    expect(rootBindingName(decl.declarations[0].init as TSESTree.Node)).toBe(
      expected,
    );
  });

  it('returns empty string when no identifier roots the expression', () => {
    const program = parseModule('const x = (1).toString();');
    const decl = program.body[0] as unknown as TSESTree.VariableDeclaration;
    expect(rootBindingName(decl.declarations[0].init as TSESTree.Node)).toBe(
      '',
    );
  });
});

describe('moduleRole', () => {
  it.each([
    ['class-validator', 'validator'],
    ['class-transformer', 'serialization'],
    ['@nestjs/graphql', 'graphql'],
    ['@nestjs/common', 'framework'],
    ['@nestjs/swagger', 'docs'],
    ['@nestjs/throttler', 'throttler'],
    ['@nestjs/passport', 'auth'],
    ['typeorm', 'persistence'],
  ])('classifies the package %s as %s', (source, expected) => {
    expect(moduleRole(source)).toBe(expected);
  });

  it('classifies subpath imports by their package', () => {
    expect(moduleRole('@nestjs/common/decorators')).toBe('framework');
    expect(moduleRole('class-validator/types')).toBe('validator');
  });

  it('infers auth from a project-local module path', () => {
    expect(moduleRole('src/middleware/auth.guard')).toBe('auth');
    expect(moduleRole('./guards/roles.guard')).toBe('auth');
    expect(moduleRole('../common/decorators/permissions')).toBe('auth');
  });

  it('does not infer auth from an unrelated local module', () => {
    expect(moduleRole('./helpers')).toBeNull();
    expect(moduleRole('src/utils/format')).toBeNull();
  });

  it('does not infer auth from a package merely containing the word', () => {
    // Only project-local specifiers get the path-based fallback.
    expect(moduleRole('some-auth-library')).toBeNull();
  });

  it('returns null for an unknown module', () => {
    expect(moduleRole('lodash')).toBeNull();
  });
});

describe('isRelativeOrLocal', () => {
  it.each([
    ['./a', true],
    ['../a', true],
    ['src/a', true],
    ['@/a', true],
    ['lodash', false],
    ['@nestjs/common', false],
  ])('%s -> %s', (source, expected) => {
    expect(isRelativeOrLocal(source)).toBe(expected);
  });
});
