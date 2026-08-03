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
   * A global ValidationPipe is configured with `whitelist: true`.
   *
   * This matters because whitelisting *strips* every property a DTO does not
   * declare with a class-validator decorator. An undecorated property is
   * therefore not attacker-controllable — it never arrives — so reporting it as
   * unvalidated input is a false positive.
   */
  hasWhitelistingValidationPipe: boolean;
  /** Rate limiting is configured app-wide (ThrottlerModule + guard). */
  hasGlobalThrottler: boolean;
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
function whitelistReachable(source: string, file: string): boolean {
  if (/\bwhitelist\s*:\s*true\b/.test(source)) return true;
  const dir = getDirname(file);
  const specifiers = source.matchAll(/from\s+['"](\.[^'"]+)['"]/g);
  for (const [, spec] of specifiers) {
    for (const candidate of [`${spec}.ts`, joinPath(spec, 'index.ts')]) {
      const imported = readFileSync(resolvePath(dir, candidate));
      if (imported !== null && /\bwhitelist\s*:\s*true\b/.test(imported)) return true;
    }
  }
  return false;
}

function analyzeSource(source: string, into: MutableContext, file: string): void {
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

  const fileRegistersPipe = USE_GLOBAL_PIPES_RE.test(source) || registersPipeViaToken;
  if (fileRegistersPipe) into.hasGlobalValidationPipe = true;
  // `whitelist: true` must appear in the SAME file that registers the pipe.
  // Testing the accumulated `hasGlobalValidationPipe` instead was a real bug: in
  // a monorepo, one app's whitelisting pipe silenced every other app's DTO
  // findings, because the flag carries across files. Measured on a 5-app corpus
  // where only one app whitelists — it zeroed all four others.
  if (fileRegistersPipe && whitelistReachable(source, file)) {
    into.hasWhitelistingValidationPipe = true;
  }
  if (USE_GLOBAL_GUARDS_RE.test(source)) into.hasGlobalAuthGuard = true;
  if (THROTTLER_MODULE_RE.test(source)) into.hasGlobalThrottler = true;
}

interface MutableContext {
  globalProviders: Set<string>;
  hasGlobalAuthGuard: boolean;
  hasGlobalValidationPipe: boolean;
  hasWhitelistingValidationPipe: boolean;
  hasGlobalThrottler: boolean;
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
    hasWhitelistingValidationPipe: false,
    hasGlobalThrottler: false,
  };

  for (const file of collectConfigFiles(root, limits)) {
    const source = readFileSync(file);
    if (source !== null) {
      analyzeSource(source, accumulator, file);
    }
  }

  return { root, ...accumulator };
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
      hasWhitelistingValidationPipe: false,
      hasGlobalThrottler: false,
    };
  }

  const cached = CACHE.get(root);
  if (cached !== undefined) return cached;

  const scanned = scanProject(root);
  CACHE.set(root, scanned);
  return scanned;
}
