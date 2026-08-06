/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — no package claims an ESLint v8 floor below 8.40.0.
 *
 * `context.sourceCode` and `context.filename` landed in ESLint 8.40.0. On
 * 8.0.0–8.39.x they are `undefined`, so a rule that reads them can throw
 * before it reports anything. Our rules read them across most of `packages/*`.
 *
 * Until 2026-08-06 every manifest declared `^8.0.0`, which promised four years
 * of releases nothing had ever run against: the version matrix installs
 * `eslint@^8`, and npm resolves that to the newest v8, never to 8.39.x. A peer
 * range is the compatibility statement npm shows at install time, so the gap
 * was invisible in CI and visible to every consumer.
 *
 * If this test fails because a manifest was widened, do not widen the lock.
 * Either keep the floor, or add a `context.getSourceCode()` fallback to every
 * call site first and move the floor with it.
 *
 * The second test is what keeps the first one honest: an 8.40.0 floor is an
 * arbitrary number unless the APIs that justify it are actually in the source.
 * If a future refactor drops those reads repo-wide, this goes red and the
 * floor becomes a real decision again rather than inherited trivia.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PACKAGES_DIR = resolve(__dirname, '../../packages');

/** The minor that introduced `context.sourceCode` / `context.filename`. */
const V8_FLOOR = { major: 8, minor: 40 };

interface Manifest {
  name?: string;
  peerDependencies?: Record<string, string>;
}

/** `dir → declared eslint peer range` for every package that declares one. */
function readEslintPeers(): { dir: string; range: string }[] {
  return readdirSync(PACKAGES_DIR)
    .map((dir) => ({ dir, path: join(PACKAGES_DIR, dir, 'package.json') }))
    .filter(({ path }) => existsSync(path))
    .map(({ dir, path }) => ({
      dir,
      range: (JSON.parse(readFileSync(path, 'utf8')) as Manifest).peerDependencies?.eslint,
    }))
    .filter((entry): entry is { dir: string; range: string } => entry.range !== undefined);
}

/**
 * The lowest v8 release `range` admits, or `null` when it admits no v8 at all.
 *
 * Ranges here are hand-written and simple — `^8.40.0 || ^9.0.0 || ^10.0.0` and
 * `>=8.40.0`. Rather than pull in a semver parser for two shapes, read the
 * minor out of whichever clause mentions 8, and treat an unparseable clause as
 * a failure (`{minor: -1}`) so a novel range shape trips the lock instead of
 * silently passing it.
 */
export function lowestV8(range: string): { minor: number } | null {
  const clauses = range.split('||').map((c) => c.trim());
  const v8 = clauses.filter((c) => /(?:^|[^\d.])8\./.test(c));
  if (v8.length === 0) return null;
  return v8.reduce<{ minor: number }>(
    (lowest, clause) => {
      const m = /^(?:\^|~|>=)?8\.(\d+)\./.exec(clause);
      const minor = m ? Number(m[1]) : -1;
      return minor < lowest.minor ? { minor } : lowest;
    },
    { minor: Number.POSITIVE_INFINITY },
  );
}

/** Every `.ts` file under a package's `src/`, excluding tests. */
function sourceFiles(dir: string): string[] {
  const root = join(PACKAGES_DIR, dir, 'src');
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (path: string) => {
    for (const entry of readdirSync(path)) {
      const full = join(path, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(full);
    }
  };
  walk(root);
  return out;
}

describe('ESLint peer floor', () => {
  it('no package admits an ESLint v8 older than 8.40.0', () => {
    const tooLow = readEslintPeers()
      .map(({ dir, range }) => ({ dir, range, v8: lowestV8(range) }))
      .filter(({ v8 }) => v8 !== null && v8.minor < V8_FLOOR.minor)
      .map(({ dir, range }) => `${dir}: ${range}`);

    // Names + ranges rather than a count, so a failure is actionable as-is.
    expect(tooLow, 'context.sourceCode / context.filename need ESLint >= 8.40.0').toEqual([]);
  });

  it('the packages are in fact reading the 8.40.0-era context APIs', () => {
    const readers = readdirSync(PACKAGES_DIR).filter((dir) =>
      sourceFiles(dir).some((file) =>
        /context\.(sourceCode|filename)\b/.test(readFileSync(file, 'utf8')),
      ),
    );

    // Guards the floor above from decaying into an unexplained magic number.
    expect(readers.length).toBeGreaterThan(0);
  });

  it('reads the lowest v8 clause out of a multi-major range', () => {
    expect(lowestV8('^8.40.0 || ^9.0.0 || ^10.0.0')).toEqual({ minor: 40 });
    expect(lowestV8('>=8.40.0')).toEqual({ minor: 40 });
    expect(lowestV8('^8.0.0 || ^9.0.0')).toEqual({ minor: 0 });
    expect(lowestV8('^9.0.0 || ^10.0.0')).toBeNull();
  });

  it('treats an unrecognised v8 clause as too low rather than passing it', () => {
    expect(lowestV8('8.x')).toEqual({ minor: -1 });
  });

  /**
   * `^10.0.0` contains no v8 clause, but a naive `includes('8.')` would find
   * one in a range like `^9.8.0`. The v8 detector has to key on a version
   * *start*, not on the digit 8 appearing anywhere.
   */
  it('does not mistake a minor 8 in another major for a v8 clause', () => {
    expect(lowestV8('^9.8.0 || ^10.0.0')).toBeNull();
  });
});
