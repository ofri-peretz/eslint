/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared decorator helpers.
 *
 * NestJS applications are built out of decorators, and real-world projects wrap
 * framework decorators in their own composites via `applyDecorators()`:
 *
 * ```ts
 * export function AuthJwtAccessProtected(): MethodDecorator {
 *   return applyDecorators(UseGuards(AuthJwtAccessGuard));
 * }
 * ```
 *
 * A syntax-only linter cannot resolve `@AuthJwtAccessProtected()` back to
 * `@UseGuards(...)`. The rules in this plugin therefore classify every
 * decorator as *known* (a framework decorator we can reason about) or
 * *unresolved* (anything else), and treat unresolved decorators as
 * "might be protecting this route". A missed finding is far cheaper than a
 * false positive on somebody else's codebase.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Extract the identifier name of a decorator.
 *
 * Handles both `@Foo` and `@Foo(...)`. Returns `''` for anything else
 * (member-expression decorators such as `@ns.Foo()`), which callers treat as
 * an unresolved decorator.
 */
export function getDecoratorName(decorator: TSESTree.Decorator): string {
  const expression = decorator.expression;
  if (expression.type === AST_NODE_TYPES.Identifier) {
    return expression.name;
  }
  if (
    expression.type === AST_NODE_TYPES.CallExpression &&
    expression.callee.type === AST_NODE_TYPES.Identifier
  ) {
    return expression.callee.name;
  }
  return '';
}

/** Names of every decorator in the list (`''` for unresolvable ones). */
export function getDecoratorNames(
  decorators: TSESTree.Decorator[] | undefined,
): string[] {
  if (!decorators) return [];
  return decorators.map(getDecoratorName);
}

/** True when any decorator in the list has one of the given names. */
export function hasDecoratorNamed(
  decorators: TSESTree.Decorator[] | undefined,
  names: ReadonlySet<string>,
): boolean {
  return getDecoratorNames(decorators).some((name) => names.has(name));
}

/**
 * Return the `CallExpression` of a decorator when it is a call, else `null`.
 * Used to read decorator arguments (route paths, guard classes, pipes).
 */
export function getDecoratorCall(
  decorator: TSESTree.Decorator,
): TSESTree.CallExpression | null {
  return decorator.expression.type === AST_NODE_TYPES.CallExpression
    ? decorator.expression
    : null;
}

/** HTTP method decorators that mark a method as a route handler. */
export const HTTP_METHOD_DECORATORS: ReadonlySet<string> = new Set([
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Options',
  'Head',
  'All',
  'Search',
  'Sse',
]);

/** Decorators that explicitly mark a route as intentionally unauthenticated. */
export const PUBLIC_DECORATORS: ReadonlySet<string> = new Set([
  'Public',
  'IsPublic',
  'SkipAuth',
  'NoAuth',
  'AllowAnonymous',
  'Anonymous',
]);

/**
 * Decorators shipped by NestJS and the libraries in its default stack.
 *
 * Everything **not** in this set is treated as project-owned and therefore
 * potentially a composite that applies guards/pipes. Keep this list to
 * decorators whose behaviour we actually know — adding a wildcard (e.g. every
 * `Api*` name) would misclassify custom decorators such as ack's
 * `@ApiKeyProtected()`, which is exactly the false positive this exists to
 * prevent.
 */
export const KNOWN_DECORATORS: ReadonlySet<string> = new Set([
  // --- @nestjs/common: classes & routing -----------------------------------
  'Controller',
  'Injectable',
  'Module',
  'Global',
  'Catch',
  'Inject',
  'Optional',
  'Dependencies',
  'Bind',
  ...HTTP_METHOD_DECORATORS,
  'HttpCode',
  'Header',
  'Redirect',
  'Render',
  'Version',
  'SetMetadata',
  'UseGuards',
  'UseInterceptors',
  'UsePipes',
  'UseFilters',
  'SerializeOptions',
  // --- @nestjs/common: parameters ------------------------------------------
  'Body',
  'Query',
  'Param',
  'Headers',
  'Req',
  'Request',
  'Res',
  'Response',
  'Next',
  'Session',
  'Ip',
  'HostParam',
  'UploadedFile',
  'UploadedFiles',
  // --- @nestjs/swagger (documentation only, never a guard) ------------------
  'ApiTags',
  'ApiOperation',
  'ApiResponse',
  'ApiOkResponse',
  'ApiCreatedResponse',
  'ApiAcceptedResponse',
  'ApiNoContentResponse',
  'ApiBadRequestResponse',
  'ApiUnauthorizedResponse',
  'ApiForbiddenResponse',
  'ApiNotFoundResponse',
  'ApiConflictResponse',
  'ApiUnprocessableEntityResponse',
  'ApiTooManyRequestsResponse',
  'ApiInternalServerErrorResponse',
  'ApiDefaultResponse',
  'ApiProperty',
  'ApiPropertyOptional',
  'ApiHideProperty',
  'ApiBody',
  'ApiParam',
  'ApiQuery',
  'ApiHeader',
  'ApiHeaders',
  'ApiConsumes',
  'ApiProduces',
  'ApiExtraModels',
  'ApiExcludeEndpoint',
  'ApiExcludeController',
  'ApiBearerAuth',
  'ApiBasicAuth',
  'ApiCookieAuth',
  'ApiOAuth2',
  'ApiSecurity',
  // --- class-validator / class-transformer ---------------------------------
  'Exclude',
  'Expose',
  'Transform',
  'Type',
  'Allow',
  'ValidateNested',
  'ValidateIf',
  // --- @nestjs/throttler ----------------------------------------------------
  'Throttle',
  'SkipThrottle',
  // --- explicit public markers ---------------------------------------------
  ...PUBLIC_DECORATORS,
]);

/**
 * True when the decorator list contains at least one decorator this plugin
 * cannot resolve (a project-owned composite, or a member-expression decorator).
 *
 * Callers use this as "assume this route may already be protected".
 */
export function hasUnresolvedDecorator(
  decorators: TSESTree.Decorator[] | undefined,
): boolean {
  return getDecoratorNames(decorators).some(
    (name) => !KNOWN_DECORATORS.has(name),
  );
}

/** True when the list contains `@UseGuards` (call or bare identifier). */
export function hasUseGuards(
  decorators: TSESTree.Decorator[] | undefined,
): boolean {
  return getDecoratorNames(decorators).includes('UseGuards');
}

/** True when the list contains `@Controller`. */
export function isControllerClass(
  decorators: TSESTree.Decorator[] | undefined,
): boolean {
  return getDecoratorNames(decorators).includes('Controller');
}

/** True when the list contains `@Module`. */
export function isModuleClass(
  decorators: TSESTree.Decorator[] | undefined,
): boolean {
  return getDecoratorNames(decorators).includes('Module');
}

/** The name of the first HTTP-method decorator in the list, or `null`. */
export function getHttpMethodDecorator(
  decorators: TSESTree.Decorator[] | undefined,
): TSESTree.Decorator | null {
  if (!decorators) return null;
  for (const decorator of decorators) {
    if (HTTP_METHOD_DECORATORS.has(getDecoratorName(decorator))) {
      return decorator;
    }
  }
  return null;
}

/**
 * Route path declared by a `@Controller(...)` / `@Get(...)` decorator.
 *
 * Supports the string form (`@Get('debug')`) and the NestJS object form
 * (`@Controller({ version: '1', path: '/debug' })`). Returns `null` when the
 * path is dynamic or absent.
 */
export function getRoutePath(decorator: TSESTree.Decorator): string | null {
  const call = getDecoratorCall(decorator);
  const arg = call?.arguments[0];
  if (!arg) return null;

  if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
    return arg.value;
  }

  if (arg.type === AST_NODE_TYPES.ObjectExpression) {
    for (const property of arg.properties) {
      if (
        property.type === AST_NODE_TYPES.Property &&
        property.key.type === AST_NODE_TYPES.Identifier &&
        property.key.name === 'path' &&
        property.value.type === AST_NODE_TYPES.Literal &&
        typeof property.value.value === 'string'
      ) {
        return property.value.value;
      }
    }
  }

  return null;
}
