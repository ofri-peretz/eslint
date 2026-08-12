/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A scratch directory that survives between runs without living in a shared
 * namespace.
 *
 * Scripts that cache expensive work (cloned corpora, an installed rig) need a
 * STABLE path — a fresh `mkdtemp` per run throws away the thing the cache
 * exists for. But a stable path under `os.tmpdir()` is a world-writable name an
 * attacker can pre-create as a symlink and have us write through
 * (CWE-377/CWE-379; CodeQL `js/insecure-temporary-file`).
 *
 * The user cache directory gives both: stable, and not writable by others.
 * The checks below are what make that guarantee real rather than assumed —
 * `mkdir(mode: 0o700)` applies only when creating, so it says nothing about a
 * directory that already exists, and `XDG_CACHE_HOME` is attacker-influencable
 * in exactly the environments that matter.
 *
 * Lives in its own module because `scripts/corpus-scan.ts` calls
 * `process.exit(main())` at module scope — importing it from a test would run
 * a full corpus scan.
 */
import { lstatSync, mkdirSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The base cache directory.
 *
 * `XDG_CACHE_HOME` is honoured only when absolute: the XDG spec says a relative
 * value "is invalid and must be ignored", and honouring one would resolve the
 * cache against the process's cwd — attacker-controllable if the script is ever
 * run from a directory the attacker can choose.
 */
export function resolveCacheHome(
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  const xdg = env.XDG_CACHE_HOME;
  if (xdg && path.isAbsolute(xdg)) return xdg;
  return path.join(home, '.cache');
}

/** Group- or other-writable. The bit that makes a directory a shared namespace. */
const isWorldOrGroupWritable = (mode: number): boolean => (mode & 0o022) !== 0;

/**
 * Create `dir` if absent, and refuse to use it if it is not private to us.
 *
 * Fails closed rather than repairing: silently `chmod`-ing someone else's
 * directory, or unlinking a symlink we did not create, is how a hardening step
 * becomes its own vulnerability. The caller should treat a throw as fatal.
 *
 * Every component from the cache root down is checked, not just the leaf — a
 * safe leaf underneath an attacker-owned parent is still attacker-controlled,
 * because the parent can be swapped after the check.
 */
export function ensurePrivateDir(dir: string, cacheHome: string): string {
  if (!path.isAbsolute(dir)) {
    throw new Error(`scratch directory must be absolute, got: ${dir}`);
  }

  // `os.tmpdir()` is the shared namespace this module exists to avoid. Compare
  // real paths so a symlinked tmpdir (macOS: /tmp -> /private/tmp) cannot slip
  // past by spelling.
  const realTmp = safeRealpath(os.tmpdir());
  const realDir = safeRealpath(dir);
  if (realDir === realTmp || realDir.startsWith(realTmp + path.sep)) {
    throw new Error(
      `refusing to use a scratch directory inside the shared temp dir: ${dir}\n` +
        `(XDG_CACHE_HOME=${process.env.XDG_CACHE_HOME ?? '<unset>'})`,
    );
  }

  mkdirSync(dir, { recursive: true, mode: 0o700 });

  // Walk cacheHome -> dir, inclusive, checking each component we rely on.
  const relative = path.relative(cacheHome, dir);
  const components = relative && !relative.startsWith('..') ? relative.split(path.sep) : [];
  const toCheck = [cacheHome, ...components.map((_, index) =>
    path.join(cacheHome, ...components.slice(0, index + 1)),
  )];

  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;

  for (const component of toCheck) {
    // lstat, NOT stat: stat follows the symlink and would report the target's
    // ownership, which is exactly the substitution being checked for.
    const stats = lstatSync(component);

    if (stats.isSymbolicLink()) {
      throw new Error(`refusing to use scratch path via a symlink: ${component}`);
    }
    if (!stats.isDirectory()) {
      throw new Error(`scratch path component is not a directory: ${component}`);
    }
    if (uid !== undefined && stats.uid !== uid) {
      throw new Error(
        `scratch path component is owned by uid ${stats.uid}, not ${uid}: ${component}`,
      );
    }
    if (isWorldOrGroupWritable(stats.mode)) {
      throw new Error(
        `scratch path component is group/world-writable (mode ${(stats.mode & 0o777).toString(8)}): ${component}`,
      );
    }
  }

  return dir;
}

/**
 * `realpathSync` for a path that may not exist yet.
 *
 * Resolves the nearest existing ancestor and re-appends the missing tail. A
 * plain try/catch returning `path.resolve` is not enough: on macOS `os.tmpdir()`
 * is `/var/folders/…`, a symlink to `/private/var/folders/…`, so an unresolved
 * candidate never string-matches the resolved tmpdir and the containment check
 * silently passes. That is the one case this function exists for.
 */
function safeRealpath(target: string): string {
  const absolute = path.resolve(target);
  let existing = absolute;
  const missing: string[] = [];

  for (;;) {
    try {
      return path.join(realpathSync(existing), ...missing);
    } catch {
      const parent = path.dirname(existing);
      // Reached the filesystem root without finding anything that exists.
      if (parent === existing) return absolute;
      missing.unshift(path.basename(existing));
      existing = parent;
    }
  }
}
