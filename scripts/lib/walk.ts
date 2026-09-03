/**
 * Shared recursive directory walker.
 *
 * Most repo scripts that scan a tree (audits, fixture-coverage, drift
 * checks, the stale-artifacts guardrail) used to re-implement the same
 * `readdirSync({withFileTypes: true})` generator with the same
 * node_modules/dist skip. Centralised here so the skip-set + traversal
 * order are uniform and any future tuning (e.g. async, parallel) lands
 * once.
 *
 * Tested via `__tests__/walk.test.ts`.
 */

import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface WalkOptions {
  /** Directory names to skip without descending. */
  skipDirs?: readonly string[];
  /** File extensions to include (e.g. ['.ts', '.tsx']); omit to include all. */
  extensions?: readonly string[];
  /** If set, yields paths relative to this root instead of absolute. */
  relativeTo?: string;
}

const DEFAULT_SKIP_DIRS = ['node_modules', 'dist', '.git', '.next', '.turbo'] as const;

const matchesExtension = (
  name: string,
  extensions: readonly string[] | undefined,
): boolean => !extensions || extensions.some((ext) => name.endsWith(ext));

/**
 * Yields file paths under `dir`, skipping the configured directory names and
 * filtering by extension if provided. Silently returns when `dir` is missing
 * — callers that need a hard error should check existence themselves.
 */
export function* walkFiles(
  dir: string,
  options: WalkOptions = {},
): Generator<string> {
  const skip = new Set(options.skipDirs ?? DEFAULT_SKIP_DIRS);
  yield* walk(dir, options.relativeTo, skip, options.extensions);
}

function* walk(
  dir: string,
  root: string | undefined,
  skip: Set<string>,
  extensions: readonly string[] | undefined,
): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full, root, skip, extensions);
    } else if (entry.isFile() && matchesExtension(entry.name, extensions)) {
      yield root ? relative(root, full) : full;
    }
  }
}
