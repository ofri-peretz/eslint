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
  /**
   * A `ThrottlerGuard`, or a class extending it, is bound app-wide.
   *
   * The binding is the fact, not the module import: `ThrottlerModule.forRoot()`
   * only configures limits, and nothing is throttled until the guard runs.
   * Measured on 79 repositories: 21 import the module, and 3 of those bind the
   * guard nowhere — the import alone used to silence `require-throttler` there.
   */
  hasGlobalThrottler: boolean;
  /**
   * Some `MulterModule.register()` sets `limits.fileSize`, or builds its options
   * where this scan cannot read them. Module options are merged under every
   * upload interceptor of that module's controllers.
   */
  hasModuleUploadLimit: boolean;
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
/**
 * A throttling guard, by name. Only consulted when the class itself is out of
 * reach — see `isThrottlerGuard`, which reads what the class extends.
 */
const NON_AUTH_GUARD = /Throttler/i;
/** `app.useGlobalPipes(...)` in the bootstrap file. */
const USE_GLOBAL_PIPES_RE = /useGlobalPipes\s*\(/;
/** `app.useGlobalGuards(...)` in the bootstrap file. */
const USE_GLOBAL_GUARDS_RE = /useGlobalGuards\s*\(/;
/** `MulterModule.register(` / `.registerAsync(`, up to the opening paren. */
const MULTER_MODULE_RE = /MulterModule\s*\.\s*register(Async)?\s*\(/g;
/** `import { A, B as C } from 'x'` and `export { A } from 'x'`. */
const NAMED_FROM_RE =
  /(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
/** `export * from './x'`. */
const EXPORT_ALL_RE = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
/** How many files a class is followed through before giving up. */
const MAX_HOPS = 6;

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
/**
 * The `.forRoutes(` chained to an `.apply(...)`, matched from the end of that
 * apply (sticky). Only the chained call counts: more than 40 characters in
 * between means we ran past this `.apply()` into an unrelated statement.
 */
const CHAINED_FOR_ROUTES_RE = /[\s\S]{0,40}?\.forRoutes[^(]*\(/y;
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
function analyzeSource(
  source: string,
  file: string,
  root: string,
  into: MutableContext,
): void {
  PROVIDE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PROVIDE_RE.exec(source)) !== null) {
    const [, token, tail] = match;
    into.globalProviders.add(token);

    if (token === 'APP_GUARD' || token === 'APP_INTERCEPTOR') {
      const useClass = USE_CLASS_RE.exec(tail)?.[1];
      // What the class extends decides; its name only when the class is out of
      // reach. `ApiRateLimitInterceptor extends ThrottlerGuard`, bound as an
      // interceptor, is a real one that no name pattern finds.
      const throttles =
        useClass !== undefined &&
        (isThrottlerGuard(useClass, source, file, root) ??
          NON_AUTH_GUARD.test(useClass));
      if (throttles) into.hasGlobalThrottler = true;
      // A factory-provided guard has no class name to inspect; assume it
      // authenticates rather than reporting every route in the project.
      else if (token === 'APP_GUARD') into.hasGlobalAuthGuard = true;
    } else if (token === 'APP_PIPE') {
      into.hasGlobalValidationPipe = true;
    }
  }

  if (USE_GLOBAL_PIPES_RE.test(source)) into.hasGlobalValidationPipe = true;
  if (USE_GLOBAL_GUARDS_RE.test(source)) into.hasGlobalAuthGuard = true;
  if (registersUploadLimit(source)) into.hasModuleUploadLimit = true;

  if (AUTH_IN_MODULE.test(source)) into.sawAuthInModule = true;
  collectAuthMiddlewareTargets(source, into.authMiddlewareTargets);
}

/**
 * Whether a `MulterModule.register()` in this file may bound upload size.
 *
 * `fileSize` anywhere in the call's arguments counts. So does a
 * `registerAsync` with no inline `useFactory`: its options come from a class
 * in another file, and assuming they are unlimited would be a guess.
 */
function registersUploadLimit(source: string): boolean {
  MULTER_MODULE_RE.lastIndex = 0;
  let call: RegExpExecArray | null;
  while ((call = MULTER_MODULE_RE.exec(source)) !== null) {
    let depth = 1;
    let end = MULTER_MODULE_RE.lastIndex;
    for (; end < source.length && depth > 0; end++) {
      if (source[end] === '(') depth++;
      else if (source[end] === ')') depth--;
    }
    const args = source.slice(MULTER_MODULE_RE.lastIndex, end);
    // The key, not the word: `destination: './fileSize'` sets no limit.
    if (/\bfileSize\s*[:,}]/.test(args)) return true;
    if (call[1] !== undefined && !/\buseFactory\b/.test(args)) return true;
  }
  return false;
}

/** The file a project-local specifier names, read; null when there is none. */
function readLocalModule(
  specifier: string,
  fromFile: string,
  root: string,
): { source: string; file: string } | null {
  // `./x` is relative to the importer; `src/x` and `@/x` (the two rootDir
  // spellings NestJS starters use) are relative to the project.
  const base = specifier.startsWith('.')
    ? resolvePath(getDirname(fromFile), specifier)
    : specifier.startsWith('src/')
      ? joinPath(root, specifier)
      : specifier.startsWith('@/')
        ? joinPath(root, 'src', specifier.slice(2))
        : null;
  if (base === null) return null;
  // An ESM project writes the specifier as the file it will be once compiled:
  // `./rate-limit.guard.js` is `rate-limit.guard.ts` on disk.
  const stem = base.replace(/\.js$/, '');
  for (const file of [`${stem}.ts`, joinPath(base, 'index.ts')]) {
    const source = readFileSync(file);
    if (source !== null) return { source, file };
  }
  return null;
}

/**
 * Whether `name`, as bound in `source`, is `ThrottlerGuard` from
 * `@nestjs/throttler` or a class extending it.
 *
 * Follows the class through its declaration, the import that brought it in and
 * barrel re-exports, `MAX_HOPS` files deep. `null` means the answer is somewhere
 * this cannot read — a package, a path alias — and the caller has to fall back.
 */
export function isThrottlerGuard(
  name: string,
  source: string,
  file: string,
  root: string,
  hops = MAX_HOPS,
): boolean | null {
  if (hops === 0) return null;
  const id = name.replace(/\$/g, String.raw`\$`);
  const declared = new RegExp(
    String.raw`class\s+${id}(?![\w$])(?:\s*<[^>{]*>)?(?:\s+extends\s+([\w$]+))?`,
  ).exec(source);
  if (declared !== null) {
    const [, parent] = declared;
    // A class with no parent is not a throttler, whatever it is called.
    return parent === undefined
      ? false
      : isThrottlerGuard(parent, source, file, root, hops - 1);
  }

  for (const [, specifiers, from] of source.matchAll(NAMED_FROM_RE)) {
    for (const specifier of specifiers.split(',')) {
      const [imported, local = imported] = specifier
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/);
      if (local !== name) continue;
      if (from === '@nestjs/throttler') return imported === 'ThrottlerGuard';
      const next = readLocalModule(from, file, root);
      return (
        next &&
        isThrottlerGuard(imported, next.source, next.file, root, hops - 1)
      );
    }
  }

  // Not declared and not named here: a barrel may pass it through.
  for (const [, from] of source.matchAll(EXPORT_ALL_RE)) {
    const next = readLocalModule(from, file, root);
    const answer =
      next && isThrottlerGuard(name, next.source, next.file, root, hops - 1);
    if (answer !== null) return answer;
  }
  return null;
}

/**
 * Read the argument list of the `.forRoutes(...)` that follows `from`.
 *
 * Scanned with a paren counter rather than a regex: `forRoutes` takes object
 * literals (`{path: 'articles/:slug', method: RequestMethod.PUT}`) whose nesting
 * a regex cannot follow, and stopping at the first `)` would truncate the list
 * after its first entry. Empty when no `.forRoutes(...)` is chained: an empty
 * list names no route, which is all the caller needs to know.
 */
function forRoutesArguments(source: string, from: number): string {
  CHAINED_FOR_ROUTES_RE.lastIndex = from;
  if (!CHAINED_FOR_ROUTES_RE.test(source)) return '';
  const rest = source.slice(CHAINED_FOR_ROUTES_RE.lastIndex);
  let depth = 1;
  for (const [i, char] of rest.split('').entries()) {
    if (char === '(') depth++;
    else if (char === ')' && --depth === 0) return rest.slice(0, i);
  }
  return '';
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
  hasModuleUploadLimit: boolean;
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
    hasModuleUploadLimit: false,
    sawAuthInModule: false,
    authMiddlewareTargets: new Set<string>(),
  };

  for (const file of collectConfigFiles(root, limits)) {
    // An unreadable file reads as empty: nothing to learn from it.
    analyzeSource(readFileSync(file) ?? '', file, root, accumulator);
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
      hasModuleUploadLimit: false,
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
