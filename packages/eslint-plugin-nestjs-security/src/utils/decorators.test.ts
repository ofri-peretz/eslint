/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { describe, it, expect } from 'vitest';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  getDecoratorCall,
  getDecoratorName,
  getDecoratorNames,
  getHttpMethodDecorator,
  getRoutePath,
  getUseGuardsGuardNames,
  hasDecoratorNamed,
  hasUnresolvedDecorator,
  hasUseGuards,
  isControllerClass,
  isModuleClass,
  KNOWN_DECORATORS,
  PUBLIC_DECORATORS,
} from './decorators';

/** `@Name` */
const bare = (name: string) =>
  ({ expression: { type: 'Identifier', name } }) as unknown as TSESTree.Decorator;

/** `@Name(...args)` */
const call = (name: string, args: unknown[] = []) =>
  ({
    expression: {
      type: 'CallExpression',
      callee: { type: 'Identifier', name },
      arguments: args,
    },
  }) as unknown as TSESTree.Decorator;

/** `@ns.Name` */
const member = () =>
  ({
    expression: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'ns' },
      property: { type: 'Identifier', name: 'Name' },
    },
  }) as unknown as TSESTree.Decorator;

/** `@ns.Name()` */
const memberCall = () =>
  ({
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'ns' },
        property: { type: 'Identifier', name: 'Name' },
      },
      arguments: [],
    },
  }) as unknown as TSESTree.Decorator;

const stringArg = (value: string) => ({ type: 'Literal', value });
const objectArg = (properties: unknown[]) => ({
  type: 'ObjectExpression',
  properties,
});
const prop = (key: string, value: unknown) => ({
  type: 'Property',
  key: { type: 'Identifier', name: key },
  value,
});

describe('getDecoratorName', () => {
  it('reads a bare identifier decorator', () => {
    expect(getDecoratorName(bare('Get'))).toBe('Get');
  });

  it('reads a call decorator', () => {
    expect(getDecoratorName(call('Get'))).toBe('Get');
  });

  it('returns "" for a member-expression decorator', () => {
    expect(getDecoratorName(member())).toBe('');
  });

  it('returns "" for a member-expression call decorator', () => {
    expect(getDecoratorName(memberCall())).toBe('');
  });
});

describe('getDecoratorNames', () => {
  it('returns an empty list when decorators are undefined', () => {
    expect(getDecoratorNames(undefined)).toEqual([]);
  });

  it('maps every decorator to its name', () => {
    expect(getDecoratorNames([bare('Get'), call('Post'), member()])).toEqual([
      'Get',
      'Post',
      '',
    ]);
  });
});

describe('hasDecoratorNamed', () => {
  it('matches a decorator in the set', () => {
    expect(hasDecoratorNamed([call('Public')], PUBLIC_DECORATORS)).toBe(true);
  });

  it('does not match a decorator outside the set', () => {
    expect(hasDecoratorNamed([call('Get')], PUBLIC_DECORATORS)).toBe(false);
  });
});

describe('getDecoratorCall', () => {
  it('returns the CallExpression for a call decorator', () => {
    expect(getDecoratorCall(call('Get'))).not.toBeNull();
  });

  it('returns null for a bare decorator', () => {
    expect(getDecoratorCall(bare('Get'))).toBeNull();
  });
});

describe('hasUnresolvedDecorator', () => {
  it('is false for framework-only decorators', () => {
    expect(
      hasUnresolvedDecorator([call('Controller'), call('ApiTags'), call('Get')]),
    ).toBe(false);
  });

  it('is true for a project-owned composite decorator', () => {
    // ack-nestjs-boilerplate wraps @UseGuards in @AuthJwtAccessProtected()
    expect(hasUnresolvedDecorator([call('AuthJwtAccessProtected')])).toBe(true);
  });

  it('is true for a member-expression decorator we cannot name', () => {
    expect(hasUnresolvedDecorator([memberCall()])).toBe(true);
  });

  it('is false when there are no decorators', () => {
    expect(hasUnresolvedDecorator(undefined)).toBe(false);
  });

  it('does not treat @ApiKeyProtected as a known Swagger decorator', () => {
    // Guard against re-introducing an `Api*` prefix heuristic: ack's
    // @ApiKeyProtected() is a guard composite, not Swagger documentation.
    expect(KNOWN_DECORATORS.has('ApiKeyProtected')).toBe(false);
    expect(KNOWN_DECORATORS.has('ApiTags')).toBe(true);
  });
});

describe('class/route predicates', () => {
  it('detects @UseGuards', () => {
    expect(hasUseGuards([call('UseGuards')])).toBe(true);
    expect(hasUseGuards([call('Get')])).toBe(false);
  });

  it('detects @Controller', () => {
    expect(isControllerClass([call('Controller')])).toBe(true);
    expect(isControllerClass([call('Injectable')])).toBe(false);
  });

  it('detects @Module', () => {
    expect(isModuleClass([call('Module')])).toBe(true);
    expect(isModuleClass([call('Controller')])).toBe(false);
  });

  it('finds the HTTP-method decorator', () => {
    const get = call('Get');
    expect(getHttpMethodDecorator([call('ApiTags'), get])).toBe(get);
  });

  it('returns null when no HTTP-method decorator is present', () => {
    expect(getHttpMethodDecorator([call('ApiTags')])).toBeNull();
  });

  it('returns null when decorators are undefined', () => {
    expect(getHttpMethodDecorator(undefined)).toBeNull();
  });
});

describe('getUseGuardsGuardNames', () => {
  const identifier = (name: string) => ({ type: 'Identifier', name });

  it('returns an empty list when there is no @UseGuards', () => {
    expect(getUseGuardsGuardNames([call('Get')])).toEqual([]);
    expect(getUseGuardsGuardNames(undefined)).toEqual([]);
  });

  it('names every guard argument', () => {
    expect(
      getUseGuardsGuardNames([
        call('UseGuards', [identifier('JwtAuthGuard'), identifier('RolesGuard')]),
      ]),
    ).toEqual(['JwtAuthGuard', 'RolesGuard']);
  });

  it('unwraps the passport factory form AuthGuard("jwt")', () => {
    expect(
      getUseGuardsGuardNames([
        call('UseGuards', [
          {
            type: 'CallExpression',
            callee: identifier('AuthGuard'),
            arguments: [stringArg('jwt')],
          },
        ]),
      ]),
    ).toEqual(['AuthGuard']);
  });

  it('unwraps a namespaced guard reference', () => {
    expect(
      getUseGuardsGuardNames([
        call('UseGuards', [
          {
            type: 'MemberExpression',
            object: identifier('guards'),
            property: identifier('JwtAuthGuard'),
          },
        ]),
      ]),
    ).toEqual(['JwtAuthGuard']);
  });

  it('yields "" for a guard list with no static name', () => {
    expect(
      getUseGuardsGuardNames([
        call('UseGuards', [{ type: 'SpreadElement', argument: identifier('all') }]),
      ]),
    ).toEqual(['']);
  });

  it('yields "" for @UseGuards() with no arguments', () => {
    expect(getUseGuardsGuardNames([call('UseGuards')])).toEqual(['']);
  });

  it('yields "" for a bare @UseGuards', () => {
    expect(getUseGuardsGuardNames([bare('UseGuards')])).toEqual(['']);
  });

  it('collects across several @UseGuards decorators', () => {
    expect(
      getUseGuardsGuardNames([
        call('UseGuards', [identifier('JwtAuthGuard')]),
        call('Get'),
        call('UseGuards', [identifier('RolesGuard')]),
      ]),
    ).toEqual(['JwtAuthGuard', 'RolesGuard']);
  });
});

describe('getRoutePath', () => {
  it('reads the string form', () => {
    expect(getRoutePath(call('Get', [stringArg('debug')]))).toBe('debug');
  });

  it('reads the NestJS object form', () => {
    const decorator = call('Controller', [
      objectArg([prop('version', stringArg('1')), prop('path', stringArg('/hello'))]),
    ]);
    expect(getRoutePath(decorator)).toBe('/hello');
  });

  it('returns null for an object form without a path', () => {
    expect(
      getRoutePath(call('Controller', [objectArg([prop('version', stringArg('1'))])])),
    ).toBeNull();
  });

  it('returns null for a spread element in the object form', () => {
    expect(
      getRoutePath(call('Controller', [objectArg([{ type: 'SpreadElement' }])])),
    ).toBeNull();
  });

  it('returns null for a non-literal path value', () => {
    expect(
      getRoutePath(
        call('Controller', [
          objectArg([prop('path', { type: 'Identifier', name: 'ROUTE' })]),
        ]),
      ),
    ).toBeNull();
  });

  it('returns null for a dynamic argument', () => {
    expect(getRoutePath(call('Get', [{ type: 'Identifier', name: 'path' }]))).toBeNull();
  });

  it('returns null for a non-string literal argument', () => {
    expect(getRoutePath(call('Get', [{ type: 'Literal', value: 123 }]))).toBeNull();
  });

  it('returns null when the decorator takes no arguments', () => {
    expect(getRoutePath(call('Get'))).toBeNull();
  });

  it('returns null for a bare decorator', () => {
    expect(getRoutePath(bare('Get'))).toBeNull();
  });
});
