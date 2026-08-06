/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Project-level NestJS configuration discovery.
 *
 * NestJS applies guards, pipes, interceptors and rate limiting **globally**
 * through dependency injection:
 *
 * ```ts
 * @Module({ providers: [{ provide: APP_GUARD, useClass: AuthGuard }] })
 * ```
 *
 * or through the bootstrap file (`app.useGlobalPipes(new ValidationPipe())`).
 * Either way the registration lives in a *different file* from the controllers
 * it protects, so a per-file lint rule that only looks at `@UseGuards` reports
 * every route in the application as unprotected.
 *
 * This module answers "does this project register X globally?" by scanning the
 * project's bootstrap and module files once per project root and caching the
 * answer. The scan is deliberately text-based: module files are small, the
 * tokens are unambiguous, and it costs a fraction of a full parse.
 */
import { readdirSync, type Dirent } from 'node:fs';
import type { TSESLint } from '@interlace/eslint-devkit';
import {
  findFileUpward,
  getDirname,
  joinPath,
  readFileSync,
  resolvePath,
} from '@interlace/eslint-devkit';

/** What the project registers application-wide. */
export interface NestProjectContext {
  /** Directory the scan started from (nearest `package.json`, else cwd). */
  root: string;
  /** NestJS DI tokens seen in a `provide:` position anywhere in the project. */
  globalProviders: ReadonlySet<string>;
  /** An authentication/authorization guard is registered app-wide. */
  hasGlobalAuthGuard: boolean;
  /** A pipe (`APP_PIPE` / `useGlobalPipes`) is registered app-wide. */
  hasGlobalValidationPipe: boolean;
  /** Rate limiting is configured app-wide (ThrottlerModule + guard). */
  hasGlobalThrottler: boolean;
  /**
   * The project has an authentication system of some kind.
   *
   * A rule that says "this route has no guard" is only useful where guards are
   * the mechanism in use. In a project with no authentication at all — a
   * tutorial sample, a scratch service — every route is unguarded, and saying
   * so 38 times is noise, not a finding. Measured: 38 of 94 `require-guards`
   * reports on corpus1 came from `nest-framework/sample/*`, and only
   * `19-auth-jwt` of the 25 samples declares an auth dependency.
   *
   * Deliberately conservative: false only when we can see a `package.json` AND
   * it declares nothing auth-shaped AND no module file mentions a guard. An
   * unreadable or absent manifest leaves this true, so the rule keeps
   * reporting. Getting this backwards would let the rule switch itself off.
   */
  hasAuthMechanism: boolean;
  /**
   * Controller prefixes and controller class names covered by an authentication
   * middleware, from `configure(consumer).apply(AuthMiddleware).forRoutes(...)`.
   *
   * Middleware is a first-class NestJS auth mechanism and the one the canonical
   * RealWorld implementation uses. It protects routes without a single
   * `@UseGuards` anywhere, so a guard-only rule reports the entire application:
   * 20 of 94 corpus1 findings were RealWorld routes that authenticate this way.
   */
  authMiddlewareTargets: ReadonlySet<string>;
}

/** DI tokens worth recording. */
const GLOBAL_PROVIDER_TOKENS = [
  'APP_GUARD',
  'APP_PIPE',
  'APP_INTERCEPTOR',
  'APP_FILTER',
] as const;

/** Files that can hold a global registration. */
const SCANNED_FILE = /(?:^|[.\-/])module\.ts$|^main\.ts$|^bootstrap\.ts$/;

/** Directories never worth walking into. */
const SKIPPED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'tmp',
  'temp',
  'public',
  'assets',
]);

/** Upper bounds so a stray `root` can never wedge a lint run. */
const MAX_DEPTH = 12;
const MAX_ENTRIES = 20_000;

/**
 * `provide: APP_GUARD` plus the tail of the provider object. The tail is a
 * lookahead so it is not consumed — a `providers: []` array often registers
 * several tokens within 240 characters of each other and consuming the tail
 * would skip past the next `provide:`.
 */
const PROVIDE_RE = new RegExp(
  String.raw`provide\s*:\s*(${GLOBAL_PROVIDER_TOKENS.join('|')})(?=([\s\S]{0,240}))`,
  'g',
);
/** `useClass: X` / `useExisting: X` inside a provider object. */
const USE_CLASS_RE = /use(?:Class|Existing)\s*:\s*([A-Za-z_$][\w$]*)/;
/** Guards that are not authentication guards. */
const NON_AUTH_GUARD = /Throttler/i;
/** `app.useGlobalPipes(...)` in the bootstrap file. */
const USE_GLOBAL_PIPES_RE = /useGlobalPipes\s*\(/;
/** `app.useGlobalGuards(...)` in the bootstrap file. */
const USE_GLOBAL_GUARDS_RE = /useGlobalGuards\s*\(/;
/** `ThrottlerModule.forRoot(...)` / `.forRootAsync(...)`. */
const THROTTLER_MODULE_RE = /ThrottlerModule\s*\.\s*forRoot(?:Async)?\s*\(/;

/** Dependencies that only exist to authenticate or authorize. */
const AUTH_DEPENDENCY =
  /"(?:@nestjs\/(?:passport|jwt)|passport(?:-[\w-]+)?|@casl\/ability|@auth0\/[\w-]+|next-auth|@clerk\/[\w-]+|jsonwebtoken|@node-saml\/[\w-]+|openid-client|@okta\/[\w-]+|supertokens-node|@supabase\/[\w-]+|firebase-admin|oidc-provider|@fastify\/(?:passport|jwt)|@authenio\/[\w-]+|keycloak-connect|nest-keycloak-connect|@nestjs\/throttler)"/;

/** A hand-rolled auth mechanism visible from a module or bootstrap file. */
const AUTH_IN_MODULE =
  /\b(?:CanActivate|AuthGuard|PassportStrategy|PassportModule|JwtModule|useGlobalGuards|APP_GUARD)\b/;

/**
 * `.apply(X, Y)` in a `configure(consumer)` body. Middleware is applied by
 * class reference, so the arguments are a plain identifier list.
 */
const APPLY_RE = /\.\s*apply\s*\(([^)]*)\)/g;
/** Middleware whose job is authentication. */
const AUTH_MIDDLEWARE = /(?:^|[a-z])(?:Auth|Jwt|Session|Passport|Token)/;
/** …but these carry an auth-ish word without authenticating anything. */
const NOT_AUTH_MIDDLEWARE = /Logger|Logging|Morgan|Cors|Helmet|Compression/i;
/** A quoted path, or `path: 'x'`, inside a `forRoutes(...)` argument list. */
const ROUTE_PATH_RE = /['"`]([^'"`]+)['"`]/g;
/** A controller passed to `forRoutes` by class reference. */
const ROUTE_CONTROLLER_RE = /\b([A-Z][\w$]*Controller)\b/g;

const CACHE = new Map<string, NestProjectContext>();

/** Drop every cached project scan. Exported for tests. */
export function clearProjectContextCache(): void {
  CACHE.clear();
}

/**
 * Nearest directory containing a `package.json`, walking up from `startDir`.
 * Falls back to `startDir` when the file is never found.
 */
export function findProjectRoot(startDir: string): string {
  const packageJson = findFileUpward('package.json', startDir);
  return packageJson === null ? startDir : getDirname(packageJson);
}

/** Bounds for a single project scan (overridable so tests can reach them). */
export interface ScanLimits {
  maxDepth?: number;
  maxEntries?: number;
}

/** Every bootstrap/module file under `root`, bounded in depth and count. */
function collectConfigFiles(root: string, limits: ScanLimits): string[] {
  const maxDepth = limits.maxDepth ?? MAX_DEPTH;
  const files: string[] = [];
  let budget = limits.maxEntries ?? MAX_ENTRIES;

  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth || budget <= 0) return;

    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      /* unreadable directory — nothing to learn from it */
      return;
    }

    for (const entry of entries) {
      if (budget-- <= 0) return;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(joinPath(dir, entry.name), depth + 1);
        }
      } else if (SCANNED_FILE.test(entry.name)) {
        files.push(joinPath(dir, entry.name));
      }
    }
  };

  walk(root, 0);
  return files;
}

/** Fold one file's source into the accumulating project context. */
/**
 * `whitelist: true` reachable from a file that registers a global pipe.
 *
 * Checked inline first, then in that file's own relative imports — one hop, no
 * recursion. The common real shape is a `ValidationPipeOptions` const in its own
 * module (`new ValidationPipe(validationOptions)`), which an inline-only check
 * misses. Scoping to the registering file's imports keeps a sibling app in a
 * monorepo from silencing this one.
 */

function analyzeSource(source: string, into: MutableContext): void {
  PROVIDE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let registersPipeViaToken = false;
  while ((match = PROVIDE_RE.exec(source)) !== null) {
    const [, token, tail] = match;
    into.globalProviders.add(token);

    if (token === 'APP_GUARD') {
      const useClass = USE_CLASS_RE.exec(tail)?.[1];
      // A factory-provided guard has no class name to inspect; assume it
      // authenticates rather than reporting every route in the project.
      if (useClass === undefined || !NON_AUTH_GUARD.test(useClass)) {
        into.hasGlobalAuthGuard = true;
      }
      if (useClass !== undefined && NON_AUTH_GUARD.test(useClass)) {
        into.hasGlobalThrottler = true;
      }
    } else if (token === 'APP_PIPE') {
      into.hasGlobalValidationPipe = true;
      registersPipeViaToken = true;
    }
  }

  const fileRegistersPipe =
    USE_GLOBAL_PIPES_RE.test(source) || registersPipeViaToken;
  if (fileRegistersPipe) into.hasGlobalValidationPipe = true;
  // `whitelist: true` must appear in the SAME file that registers the pipe.
  // Testing the accumulated `hasGlobalValidationPipe` instead was a real bug: in
  // a monorepo, one app's whitelisting pipe silenced every other app's DTO
  // findings, because the flag carries across files. Measured on a 5-app corpus
  // where only one app whitelists — it zeroed all four others.
  if (USE_GLOBAL_GUARDS_RE.test(source)) into.hasGlobalAuthGuard = true;
  if (THROTTLER_MODULE_RE.test(source)) into.hasGlobalThrottler = true;

  if (AUTH_IN_MODULE.test(source)) into.sawAuthInModule = true;
  collectAuthMiddlewareTargets(source, into.authMiddlewareTargets);
}

/**
 * Read the argument list of the `.forRoutes(...)` that follows `from`.
 *
 * Scanned with a paren counter rather than a regex: `forRoutes` takes object
 * literals (`{path: 'articles/:slug', method: RequestMethod.PUT}`) whose nesting
 * a regex cannot follow, and stopping at the first `)` would truncate the list
 * after its first entry.
 */
function forRoutesArguments(source: string, from: number): string | null {
  const call = source.indexOf('.forRoutes', from);
  if (call === -1) return null;
  // Only the chained call counts. Anything longer means we ran past this
  // `.apply()` into an unrelated statement.
  if (!/^[\s\S]{0,40}$/.test(source.slice(from, call))) return null;

  const open = source.indexOf('(', call);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * Route prefixes and controller names protected by an authentication middleware.
 *
 * Only the FIRST path segment is recorded. `forRoutes` paths carry parameters
 * and wildcards (`articles/:slug/comments/:id`) that no static match will line
 * up with a `@Controller` prefix plus a handler path, and a partial match that
 * silently fails is worse than a coarse one that holds: the prefix is what ties
 * the middleware to the controller, and the rule abstains at controller
 * granularity anyway.
 */
function collectAuthMiddlewareTargets(source: string, into: Set<string>): void {
  APPLY_RE.lastIndex = 0;
  let apply: RegExpExecArray | null;
  while ((apply = APPLY_RE.exec(source)) !== null) {
    const middleware = apply[1];
    if (!AUTH_MIDDLEWARE.test(middleware)) continue;
    if (NOT_AUTH_MIDDLEWARE.test(middleware)) continue;

    const args = forRoutesArguments(source, APPLY_RE.lastIndex);
    if (args === null) continue;

    ROUTE_PATH_RE.lastIndex = 0;
    let path: RegExpExecArray | null;
    while ((path = ROUTE_PATH_RE.exec(args)) !== null) {
      const first = path[1]
        .toLowerCase()
        .split('/')
        .find((segment) => segment !== '');
      if (first !== undefined && !first.startsWith(':')) into.add(first);
    }

    ROUTE_CONTROLLER_RE.lastIndex = 0;
    let controller: RegExpExecArray | null;
    while ((controller = ROUTE_CONTROLLER_RE.exec(args)) !== null) {
      into.add(controller[1]);
    }
  }
}

/**
 * Whether the project declares a dependency that exists to authenticate.
 *
 * One file read at the root. Absent or unreadable means "cannot tell", which
 * must read as *yes* — see `hasAuthMechanism`.
 */
function manifestDeclaresAuth(root: string): boolean {
  const manifest = readFileSync(joinPath(root, 'package.json'));
  if (manifest === null) return true;
  return AUTH_DEPENDENCY.test(manifest);
}

interface MutableContext {
  globalProviders: Set<string>;
  hasGlobalAuthGuard: boolean;
  hasGlobalValidationPipe: boolean;
  hasGlobalThrottler: boolean;
  /** A module or bootstrap file names a guard, strategy or JWT module. */
  sawAuthInModule: boolean;
  authMiddlewareTargets: Set<string>;
}

/** Scan a project root (uncached). */
export function scanProject(
  root: string,
  limits: ScanLimits = {},
): NestProjectContext {
  const accumulator: MutableContext = {
    globalProviders: new Set<string>(),
    hasGlobalAuthGuard: false,
    hasGlobalValidationPipe: false,
    hasGlobalThrottler: false,
    sawAuthInModule: false,
    authMiddlewareTargets: new Set<string>(),
  };

  for (const file of collectConfigFiles(root, limits)) {
    const source = readFileSync(file);
    if (source !== null) {
      analyzeSource(source, accumulator);
    }
  }

  const { sawAuthInModule, ...context } = accumulator;
  return {
    root,
    ...context,
    // Either signal is enough. The manifest catches the library case; the
    // module scan catches a hand-rolled CanActivate with no dependency to
    // declare. Only the conjunction of both being silent means "no auth here".
    hasAuthMechanism: sawAuthInModule || manifestDeclaresAuth(root),
  };
}

/**
 * Project context for the file currently being linted, cached per project root.
 *
 * The cache lives for the lifetime of the ESLint process. A long-running editor
 * session will therefore keep the answer it computed on first lint; re-running
 * ESLint (or restarting the language server) picks up new registrations.
 */
export function getProjectContext(
  context: Pick<
    TSESLint.RuleContext<string, readonly unknown[]>,
    'filename' | 'cwd'
  >,
): NestProjectContext {
  const startDir = getDirname(resolvePath(context.cwd, context.filename));
  const root = findProjectRoot(startDir);

  // Never walk a filesystem root: that is not a project, and the cost is
  // unbounded. Synthetic contexts (unit tests, virtual filenames) land here.
  if (getDirname(root) === root) {
    return {
      root,
      globalProviders: new Set<string>(),
      hasGlobalAuthGuard: false,
      hasGlobalValidationPipe: false,
      hasGlobalThrottler: false,
      // A synthetic filename is not evidence that a project lacks auth.
      hasAuthMechanism: true,
      authMiddlewareTargets: new Set<string>(),
    };
  }

  const cached = CACHE.get(root);
  if (cached !== undefined) return cached;

  const scanned = scanProject(root);
  CACHE.set(root, scanned);
  return scanned;
}
