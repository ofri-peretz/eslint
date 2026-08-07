/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared NestJS AST helpers.
 *
 * Every rule in this plugin needs the same three things: the name of a
 * decorator, the class a member belongs to, and whether that class/member is a
 * controller route. Before this module each rule inlined its own copy, which is
 * how two whole classes of bug got in:
 *
 *  - namespace-imported decorators (`@common.Get()`) were invisible, because
 *    every copy only handled `Identifier` and `CallExpression(Identifier)`;
 *  - a class declared inside a controller method silently disabled the rest of
 *    the controller, because "am I in a controller?" was mutable `create()`
 *    state written on `ClassDeclaration` enter.
 *
 * Members reach their class in two `.parent` hops, so the state was never
 * needed. Keep new rules on these helpers.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/** Classes a member can live in. */
export type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

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
]);

/**
 * Decorators that apply access control to a route or controller.
 *
 * `@UseGuards` is the framework primitive, but almost no production codebase
 * calls it directly on every route — they wrap it in a project-specific
 * decorator. Measured on real repositories: immich uses
 * `@Authenticated({ permission })`, awesome-nest-boilerplate uses
 * `@Auth([RoleType.USER])`. Treating only `@UseGuards` as protection reported
 * every one of those correctly-guarded routes.
 *
 * Projects with a differently-named decorator extend this via the rule's
 * `authDecorators` option.
 */
export const DEFAULT_AUTH_DECORATORS: ReadonlySet<string> = new Set([
  'UseGuards',
  'Auth',
  'Authenticated',
  'Authorize',
  'Authorized',
  'Roles',
  'RequireRoles',
  'RequiredRoles',
  'Permissions',
  'RequirePermissions',
  'RequiredPermissions',
  'RequireAuth',
  'Secured',
  'CheckPolicies',
  'CheckAbilities',
]);

/**
 * Whether a decorator name denotes access control.
 *
 * An exact-name list cannot keep up. Across ten real repositories we found five
 * distinct project wrappers around `@UseGuards`: immich's `@Authenticated()`,
 * awesome-nest-boilerplate's `@Auth()`, novu's `@RequireAuthentication()`,
 * plus `@Roles()` and `@Permissions()` variants. Each one, treated as absent,
 * reported an entire correctly-guarded codebase.
 *
 * So match the vocabulary instead of the name. Anything mentioning auth,
 * guards, roles, permissions, policies, abilities or scopes is access control.
 * Names outside that vocabulary (immich's `@MaintenanceRoute()`) still need the
 * per-rule `authDecorators` option.
 *
 * One exclusion: a name that opens with a retrieval verb is reading a value,
 * not enforcing anything. `@GetAuthUser()`, `@ExtractAuthToken()` and
 * `@CurrentAuthProfile()` all mention `Auth` as an infix modifier while
 * enforcing nothing, and treating them as access control would make
 * `require-guards` silent on a route that carries only one of them.
 */
const ACCESSOR_PREFIX = /^(Get|Extract|Fetch|Read|Find|Current|Resolve)[A-Z]/;

export function isAuthDecoratorName(name: string): boolean {
  if (ACCESSOR_PREFIX.test(name)) return false;
  return /(^|[a-z])(Auth|Authenticated|Authentication|Authorize|Authorized|Authorization|Guard|Guards|Role|Roles|Permission|Permissions|Policy|Policies|Abilit(y|ies)|Scope|Scopes|Secured|Protected)([A-Z]|$)/.test(
    name,
  );
}

/**
 * Parameter decorators that bind user-controlled input.
 *
 * `@Headers()` is deliberately excluded: header values are almost always read
 * as scalars for plumbing (auth tokens, correlation ids) and requiring a
 * ValidationPipe on them produces noise rather than findings.
 */
export const INPUT_DECORATORS: ReadonlySet<string> = new Set([
  'Body',
  'Query',
  'Param',
]);

/**
 * Resolve the callee of a decorator expression to a bare name.
 *
 * Handles every shape NestJS code actually uses:
 *   `@Get`              → Identifier
 *   `@Get()`            → CallExpression(Identifier)
 *   `@common.Get`       → MemberExpression
 *   `@common.Get()`     → CallExpression(MemberExpression)
 *
 * Computed access (`@common['Get']()`) resolves only for literal keys; anything
 * genuinely dynamic returns '' and is treated as "not a decorator we know".
 */
export function decoratorName(decorator: TSESTree.Decorator): string {
  return expressionName(decorator.expression);
}

/**
 * Resolve an expression to the bare name it references, unwrapping a call.
 * Shared by decorator naming and by argument naming (`@UseGuards(a.b.Guard)`).
 */
export function expressionName(node: TSESTree.Node): string {
  let expr: TSESTree.Node = node;

  if (expr.type === AST_NODE_TYPES.CallExpression) {
    expr = expr.callee;
  }

  if (expr.type === AST_NODE_TYPES.NewExpression) {
    expr = expr.callee;
  }

  if (expr.type === AST_NODE_TYPES.Identifier) {
    return expr.name;
  }

  if (expr.type === AST_NODE_TYPES.MemberExpression) {
    const { property, computed } = expr;
    if (!computed && property.type === AST_NODE_TYPES.Identifier) {
      return property.name;
    }
    if (
      computed &&
      property.type === AST_NODE_TYPES.Literal &&
      typeof property.value === 'string'
    ) {
      return property.value;
    }
  }

  return '';
}

/** The `CallExpression` behind a decorator, if it was invoked. */
export function decoratorCall(
  decorator: TSESTree.Decorator,
): TSESTree.CallExpression | null {
  return decorator.expression.type === AST_NODE_TYPES.CallExpression
    ? decorator.expression
    : null;
}

/** Find a decorator by name. */
export function findDecorator(
  decorators: TSESTree.Decorator[] | undefined,
  name: string | ReadonlySet<string>,
): TSESTree.Decorator | undefined {
  if (!decorators) return undefined;
  const match =
    typeof name === 'string'
      ? (n: string) => n === name
      : (n: string) => name.has(n);
  return decorators.find((dec) => match(decoratorName(dec)));
}

/** Whether any decorator satisfies a predicate over its resolved name. */
export function hasDecoratorMatching(
  decorators: TSESTree.Decorator[] | undefined,
  predicate: (name: string) => boolean,
): boolean {
  return decorators?.some((dec) => predicate(decoratorName(dec))) ?? false;
}

/** Whether any decorator matches the given name (or set of names). */
export function hasDecorator(
  decorators: TSESTree.Decorator[] | undefined,
  name: string | ReadonlySet<string>,
): boolean {
  return findDecorator(decorators, name) !== undefined;
}

/**
 * The class a member belongs to.
 *
 * A `MethodDefinition` / `PropertyDefinition` is always `ClassBody`'s child and
 * `ClassBody` is always the class's child, so this is exact and O(1) — and,
 * unlike tracking the last-visited `ClassDeclaration`, it is unaffected by
 * classes nested inside method bodies.
 */
export function enclosingClass(
  node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
): ClassNode | null {
  const body = node.parent;
  if (!body || body.type !== AST_NODE_TYPES.ClassBody) return null;
  const cls = body.parent;
  if (
    cls &&
    (cls.type === AST_NODE_TYPES.ClassDeclaration ||
      cls.type === AST_NODE_TYPES.ClassExpression)
  ) {
    return cls;
  }
  return null;
}

/** Whether a class carries `@Controller()`. */
export function isControllerClass(cls: ClassNode | null): boolean {
  return cls !== null && hasDecorator(cls.decorators, 'Controller');
}

/** Whether a method carries an HTTP-method decorator. */
export function isRouteHandler(node: TSESTree.MethodDefinition): boolean {
  return hasDecorator(node.decorators, HTTP_METHOD_DECORATORS);
}

/** The HTTP-method decorator name on a method, if any. */
export function routeMethodName(
  node: TSESTree.MethodDefinition,
): string | null {
  const dec = findDecorator(node.decorators, HTTP_METHOD_DECORATORS);
  return dec ? decoratorName(dec) : null;
}

/** A member's static property name, when it is a plain identifier or string key. */
export function memberName(
  node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
): string | null {
  if (node.computed) return null;
  if (node.key.type === AST_NODE_TYPES.Identifier) return node.key.name;
  if (
    node.key.type === AST_NODE_TYPES.Literal &&
    typeof node.key.value === 'string'
  ) {
    return node.key.value;
  }
  return null;
}

/** The class's declared superclass name, if it extends a plain identifier. */
export function superClassName(cls: ClassNode | null): string | null {
  const sup = cls?.superClass;
  return sup && sup.type === AST_NODE_TYPES.Identifier ? sup.name : null;
}

/** Whether a filename looks like a test/spec file. */
export function isTestFile(filename: string): boolean {
  if (/\.(test|spec|e2e-spec)\.(ts|tsx|js|jsx|mts|cts)$/.test(filename)) {
    return true;
  }
  // A file's directory is as good an answer as its suffix. Test *helpers* are
  // not named `.spec.ts` — `teable/apps/nestjs-backend/test/utils/init-app.ts`
  // builds an app for the e2e suite and was being linted as production code.
  return /(^|[/\\])(__tests__|__mocks__|test|tests|e2e)[/\\]/.test(filename);
}

// ---------------------------------------------------------------------------
// Import-origin resolution
//
// Classifying a decorator by its *name* is guesswork, and it broke twice:
// `@Field()` from `@nestjs/graphql` was read as a composed class-validator
// decorator (175 false positives on twenty's entities), and an auth-name regex
// had to keep growing as each new codebase introduced another wrapper.
//
// The file already tells us the answer. `import { IsIn } from 'class-validator'`
// is a fact in the AST; the module a binding came from is what a decorator
// actually *is*. These helpers resolve that, and rules classify by module
// instead of by spelling.
// ---------------------------------------------------------------------------

/** What a module contributes, when we can tell from its specifier alone. */
export type ModuleRole =
  | 'validator'
  | 'serialization'
  | 'graphql'
  | 'framework'
  | 'docs'
  | 'persistence'
  | 'throttler'
  | 'auth';

/** Exact package → role. These are the ones that settle a question outright. */
const PACKAGE_ROLES: ReadonlyMap<string, ModuleRole> = new Map([
  ['class-validator', 'validator'],
  ['class-transformer', 'serialization'],
  ['@nestjs/graphql', 'graphql'],
  ['@nestjs/common', 'framework'],
  ['@nestjs/core', 'framework'],
  ['@nestjs/swagger', 'docs'],
  ['@nestjs/throttler', 'throttler'],
  ['@nestjs/passport', 'auth'],
  ['typeorm', 'persistence'],
  ['@nestjs/typeorm', 'persistence'],
  ['@nestjs/mongoose', 'persistence'],
  ['mongoose', 'persistence'],
  ['sequelize-typescript', 'persistence'],
  ['@mikro-orm/core', 'persistence'],
]);

/**
 * Map every imported binding in a file to the module it came from.
 *
 * Covers named, default and namespace imports. A namespace import records the
 * namespace binding itself, so `@common.Get()` resolves through `common`.
 */
export function collectImportOrigins(
  program: TSESTree.Program,
): Map<string, string> {
  const origins = new Map<string, string>();
  for (const stmt of program.body) {
    if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) continue;
    const source = stmt.source.value;
    for (const spec of stmt.specifiers) {
      origins.set(spec.local.name, source);
    }
  }
  return origins;
}

/**
 * The module a decorator's root binding came from, or null when the file does
 * not import it (locally declared, or a global).
 */
export function decoratorSource(
  decorator: TSESTree.Decorator,
  origins: ReadonlyMap<string, string>,
): string | null {
  return origins.get(rootBindingName(decorator.expression)) ?? null;
}

/** The outermost identifier an expression is rooted at: `a.b.C()` → `a`. */
export function rootBindingName(node: TSESTree.Node): string {
  let expr: TSESTree.Node = node;
  for (;;) {
    if (
      expr.type === AST_NODE_TYPES.CallExpression ||
      expr.type === AST_NODE_TYPES.NewExpression
    ) {
      expr = expr.callee;
    } else if (expr.type === AST_NODE_TYPES.MemberExpression) {
      expr = expr.object;
    } else {
      break;
    }
  }
  return expr.type === AST_NODE_TYPES.Identifier ? expr.name : '';
}

/**
 * The role of a module specifier.
 *
 * Known packages resolve exactly. For a project-local module we cannot read the
 * file, so the specifier is the only evidence available — a decorator imported
 * from `src/middleware/auth.guard` is access control, and that inference is
 * explicitly a fallback, not the primary signal.
 */
export function moduleRole(source: string): ModuleRole | null {
  const exact = PACKAGE_ROLES.get(source);
  if (exact) return exact;
  for (const [pkg, role] of PACKAGE_ROLES) {
    if (source.startsWith(`${pkg}/`)) return role;
  }
  if (
    isRelativeOrLocal(source) &&
    /(^|[./_-])(auth|guard|permission|role|policy|abilit|scope|rbac|casl)/i.test(
      source,
    )
  ) {
    return 'auth';
  }
  return null;
}

/** Whether a specifier points inside the project rather than at a package. */
export function isRelativeOrLocal(source: string): boolean {
  return (
    source.startsWith('.') ||
    source.startsWith('src/') ||
    source.startsWith('@/')
  );
}

/**
 * Whether a decorator applies access control, judged by where it came from.
 *
 * Order matters. The module a binding was imported from is a fact in the AST:
 * `@Authenticated` from `src/middleware/auth.guard` and `@MaintenanceRoute`
 * from `./maintenance-auth.guard` are both access control, and neither needs
 * its *name* to be recognised. Only when the origin is unknown — a locally
 * declared decorator, or a module whose specifier says nothing — do we fall
 * back to the naming vocabulary.
 *
 * `UseGuards` is excluded by callers that inspect its arguments; pass
 * `excludeUseGuards` to get that behaviour.
 */
export function isAccessControlDecorator(
  decorator: TSESTree.Decorator,
  origins: ReadonlyMap<string, string>,
  extraNames: ReadonlySet<string>,
  excludeUseGuards = false,
): boolean {
  const name = decoratorName(decorator);
  if (excludeUseGuards && name === 'UseGuards') return false;
  if (extraNames.has(name)) return true;

  const source = decoratorSource(decorator, origins);
  if (source) {
    const role = moduleRole(source);
    if (role === 'auth') return true;
    // A decorator from a package we know is not auth (graphql, swagger,
    // typeorm, ...) is settled: do not let its spelling override the fact.
    if (role && role !== 'framework') return false;
  }
  return isAuthDecoratorName(name);
}

/**
 * An object literal's own properties, keyed by name.
 *
 * Returns `null` when the object carries a spread: `{ ...options, a: 1 }` may
 * define anything, so a rule that would assert "this key is absent" has to
 * abstain instead. Callers get that distinction for free by checking for null.
 */
export function objectProperties(
  node: TSESTree.ObjectExpression,
): Map<string, TSESTree.Node> | null {
  const out = new Map<string, TSESTree.Node>();
  for (const prop of node.properties) {
    if (prop.type === AST_NODE_TYPES.SpreadElement) return null;
    const key =
      prop.key.type === AST_NODE_TYPES.Identifier && !prop.computed
        ? prop.key.name
        : prop.key.type === AST_NODE_TYPES.Literal
          ? String(prop.key.value)
          : null;
    // A computed key we cannot evaluate could be anything — same problem a
    // spread poses, so abstain rather than under-report the object's shape.
    if (key === null) return null;
    out.set(key, prop.value as TSESTree.Node);
  }
  return out;
}

/** Whether a node is the literal `true`. Anything computed is not. */
export function isTrueLiteral(node: TSESTree.Node | undefined): boolean {
  return node?.type === AST_NODE_TYPES.Literal && node.value === true;
}

/**
 * The receiver a member call ultimately hangs off:
 * `res.status(200).json(x)` -> the `res` identifier.
 */
export function callReceiver(node: TSESTree.Node): TSESTree.Identifier | null {
  let current: TSESTree.Node = node;
  for (;;) {
    if (current.type === AST_NODE_TYPES.Identifier) return current;
    if (current.type === AST_NODE_TYPES.MemberExpression)
      current = current.object;
    else if (current.type === AST_NODE_TYPES.CallExpression)
      current = current.callee;
    // A `this.res` or `(await x)` receiver is not a tracked binding.
    else return null;
  }
}
